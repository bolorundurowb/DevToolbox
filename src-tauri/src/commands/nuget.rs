use futures::future::join_all;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    cmp::Ordering as CmpOrdering,
    collections::{HashMap, HashSet},
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        Arc, Mutex as StdMutex,
    },
    time::Duration,
};
use tauri::{command, ipc::Channel};
use tokio::{
    sync::{Mutex as AsyncMutex, Semaphore},
    time::{sleep, timeout, Instant},
};

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_DEPTH: u32 = 25;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);
const RESOLUTION_TIMEOUT: Duration = Duration::from_secs(30);
const SOFT_RESOLUTION_TIMEOUT: Duration = Duration::from_secs(28);
const MAX_NODES: usize = 500;
const MAX_CONCURRENT_REQUESTS: usize = 10;
const MAX_RETRIES: u32 = 3;

// ── Error Handling ────────────────────────────────────────────────────────────

#[derive(thiserror::Error, Debug, Clone)]
pub enum NugetError {
    #[error("Network error: {0}")]
    Network(String),
    #[error("HTTP error: {0}")]
    Http(u16),
    #[error("Time limit reached")]
    Timeout,
    #[error("Node limit reached")]
    NodeLimit,
    #[error("Package '{0}' not found")]
    NotFound(String),
    #[error("Parse error: {0}")]
    Parse(String),
    #[error("{0}")]
    Other(String),
}

// ── Streaming event types ─────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum NugetEvent {
    #[serde(rename = "header")]
    Header {
        id: Arc<str>,
        version: Arc<str>,
        #[serde(rename = "frameworkGroups")]
        framework_groups: Vec<FrameworkGroup>,
    },
    #[serde(rename = "packageData")]
    PackageData {
        id: Arc<str>,
        version: Arc<str>,
        #[serde(rename = "frameworkGroups")]
        framework_groups: Vec<FrameworkGroup>,
        truncated: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        error: Option<String>,
    },
    #[serde(rename = "done")]
    Done {
        #[serde(rename = "totalNodes")]
        total_nodes: usize,
        truncated: bool,
    },
    #[serde(rename = "error")]
    Error { message: String },
}

#[derive(Serialize, Clone)]
pub struct FrameworkGroup {
    pub framework: Arc<str>,
    pub deps: Vec<SimpleDep>,
}

#[derive(Serialize, Clone)]
pub struct SimpleDep {
    pub id: Arc<str>,
    pub version: Arc<str>,
    pub circular: bool,
}

// ── Internal NuGet API types ──────────────────────────────────────────────────

#[derive(Deserialize)]
struct RegistrationLeaf {
    #[serde(rename = "catalogEntry")]
    catalog_entry: CatalogEntryRef,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum CatalogEntryRef {
    Url(String),
    Entry(CatalogEntry),
}

#[derive(Deserialize, Clone)]
struct CatalogEntry {
    id: String,
    version: String,
    #[serde(rename = "dependencyGroups", default)]
    dependency_groups: Vec<DepGroup>,
}

#[derive(Deserialize, Clone)]
struct DepGroup {
    #[serde(rename = "targetFramework", default)]
    target_framework: String,
    #[serde(default)]
    dependencies: Vec<RawDepRef>,
}

#[derive(Deserialize, Clone)]
struct RawDepRef {
    id: String,
    #[serde(default)]
    range: String,
}

// ── Shared resolution state ───────────────────────────────────────────────────

type CatalogResult = Result<Arc<CatalogEntry>, NugetError>;

struct ResolveState {
    catalog_cache: StdMutex<HashMap<Arc<str>, Arc<AsyncMutex<Option<CatalogResult>>>>>,
    emitted: StdMutex<HashSet<Arc<str>>>,
    nodes: AtomicUsize,
    any_truncated: AtomicBool,
    request_permits: Semaphore,
    deadline: Instant,
}

impl ResolveState {
    fn new(deadline: Instant) -> Self {
        Self {
            catalog_cache: StdMutex::new(HashMap::new()),
            emitted: StdMutex::new(HashSet::new()),
            nodes: AtomicUsize::new(0),
            any_truncated: AtomicBool::new(false),
            request_permits: Semaphore::new(MAX_CONCURRENT_REQUESTS),
            deadline,
        }
    }

    fn time_remaining(&self) -> Option<Duration> {
        self.deadline.checked_duration_since(Instant::now())
    }

    fn is_time_up(&self) -> bool {
        self.time_remaining().is_none()
    }

    fn try_claim_emit(&self, key: &Arc<str>) -> bool {
        self.emitted.lock().unwrap().insert(Arc::clone(key))
    }
}

// ── Tauri command ─────────────────────────────────────────────────────────────

#[command]
pub async fn nuget_dependency_tree(
    package: String,
    version: String,
    on_event: Channel<NugetEvent>,
) -> Result<(), String> {
    let package = package.trim().to_string();
    let version = version.trim().to_string();

    if package.is_empty() || version.is_empty() {
        let _ = on_event.send(NugetEvent::Error {
            message: "Package id and version are required".into(),
        });
        return Ok(());
    }

    let client = reqwest::Client::builder()
        .user_agent("dev-core-tools/1.0")
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let state = Arc::new(ResolveState::new(
        Instant::now() + SOFT_RESOLUTION_TIMEOUT,
    ));
    let on_event = Arc::new(on_event);

    let result = timeout(
        RESOLUTION_TIMEOUT,
        resolve_root(client, state.clone(), on_event.clone(), package, version),
    )
        .await;

    match result {
        Err(_) => {
            let _ = on_event.send(NugetEvent::Error {
                message: format!("Timed out after {} seconds", RESOLUTION_TIMEOUT.as_secs()),
            });
        }
        Ok(Err(e)) => {
            let _ = on_event.send(NugetEvent::Error {
                message: e.to_string(),
            });
        }
        Ok(Ok(())) => {
            let total = state.nodes.load(Ordering::Relaxed);
            let trunc = state.any_truncated.load(Ordering::Relaxed);
            let _ = on_event.send(NugetEvent::Done {
                total_nodes: total,
                truncated: trunc,
            });
        }
    }

    Ok(())
}

// ── Resolution logic ──────────────────────────────────────────────────────────

async fn resolve_root(
    client: reqwest::Client,
    state: Arc<ResolveState>,
    on_event: Arc<Channel<NugetEvent>>,
    id: String,
    version: String,
) -> Result<(), NugetError> {
    let key: Arc<str> = cache_key(&id, &version).into();

    let entry = fetch_catalog_cached(&client, &state, &key).await?;

    let root_path: Vec<Arc<str>> = vec![Arc::clone(&key)];
    let fw_groups = build_framework_groups(&entry, &root_path);

    let id_arc: Arc<str> = entry.id.clone().into();
    let version_arc: Arc<str> = entry.version.clone().into();

    let _ = on_event.send(NugetEvent::Header {
        id: Arc::clone(&id_arc),
        version: Arc::clone(&version_arc),
        framework_groups: fw_groups.clone(),
    });

    state.try_claim_emit(&key);
    state.nodes.fetch_add(1, Ordering::Relaxed);

    let unique_deps = unique_deps_across_frameworks(&fw_groups);

    let futures: Vec<_> = unique_deps
        .into_iter()
        .map(|(dep_id, dep_ver)| {
            resolve_package(
                client.clone(),
                state.clone(),
                on_event.clone(),
                dep_id,
                dep_ver,
                1,
                root_path.clone(),
            )
        })
        .collect();

    join_all(futures).await;
    Ok(())
}

fn resolve_package(
    client: reqwest::Client,
    state: Arc<ResolveState>,
    on_event: Arc<Channel<NugetEvent>>,
    id: Arc<str>,
    version: Arc<str>,
    depth: u32,
    path: Vec<Arc<str>>,
) -> futures::future::BoxFuture<'static, ()> {
    Box::pin(async move {
        let key: Arc<str> = cache_key(&id, &version).into();

        if depth >= MAX_DEPTH {
            if state.try_claim_emit(&key) {
                state.any_truncated.store(true, Ordering::Relaxed);
                let _ = on_event.send(NugetEvent::PackageData {
                    id,
                    version,
                    framework_groups: vec![],
                    truncated: true,
                    error: None,
                });
            }
            return;
        }

        if path.iter().any(|p| *p == key) {
            return;
        }

        let mut child_path = path;
        child_path.push(Arc::clone(&key));

        if state.is_time_up() {
            if state.try_claim_emit(&key) {
                state.any_truncated.store(true, Ordering::Relaxed);
                let _ = on_event.send(NugetEvent::PackageData {
                    id,
                    version,
                    framework_groups: vec![],
                    truncated: true,
                    error: Some("Time limit reached".into()),
                });
            }
            return;
        }

        let catalog_result = fetch_catalog_cached(&client, &state, &key).await;

        if !state.try_claim_emit(&key) {
            return;
        }

        if state.nodes.fetch_add(1, Ordering::Relaxed) >= MAX_NODES {
            state.any_truncated.store(true, Ordering::Relaxed);
            let _ = on_event.send(NugetEvent::PackageData {
                id,
                version,
                framework_groups: vec![],
                truncated: true,
                error: Some("Node limit reached".into()),
            });
            return;
        }

        let (fw_groups, should_recurse) = match catalog_result {
            Err(e) => {
                let is_budget = matches!(e, NugetError::Timeout | NugetError::NodeLimit);
                if is_budget {
                    state.any_truncated.store(true, Ordering::Relaxed);
                }
                let _ = on_event.send(NugetEvent::PackageData {
                    id,
                    version,
                    framework_groups: vec![],
                    truncated: is_budget,
                    error: Some(e.to_string()),
                });
                return;
            }
            Ok(entry) => {
                let fgs = build_framework_groups(&entry, &child_path);
                let _ = on_event.send(NugetEvent::PackageData {
                    id: entry.id.clone().into(),
                    version: entry.version.clone().into(),
                    framework_groups: fgs.clone(),
                    truncated: false,
                    error: None,
                });
                (fgs, true)
            }
        };

        if !should_recurse {
            return;
        }

        let unique_deps = unique_deps_across_frameworks(&fw_groups);

        let futures: Vec<_> = unique_deps
            .into_iter()
            .map(|(dep_id, dep_ver)| {
                resolve_package(
                    client.clone(),
                    state.clone(),
                    on_event.clone(),
                    dep_id,
                    dep_ver,
                    depth + 1,
                    child_path.clone(),
                )
            })
            .collect();

        join_all(futures).await;
    })
}

// ── Network & Catalogue fetch helpers ─────────────────────────────────────────

/// HTTP GET with Exponential Backoff for 429/5xx responses
async fn get_with_retry(
    client: &reqwest::Client,
    url: &str,
) -> Result<reqwest::Response, NugetError> {
    let mut backoff = Duration::from_millis(500);

    for attempt in 0..=MAX_RETRIES {
        match client.get(url).send().await {
            Ok(resp) => {
                let status = resp.status();
                if status.is_success() || status == 404 {
                    return Ok(resp);
                }
                if attempt == MAX_RETRIES || (!status.is_server_error() && status != 429) {
                    return Err(NugetError::Http(status.as_u16()));
                }
            }
            Err(e) => {
                if attempt == MAX_RETRIES {
                    return Err(NugetError::Network(e.to_string()));
                }
            }
        }
        sleep(backoff).await;
        backoff *= 2;
    }
    unreachable!()
}

async fn fetch_catalog_cached(
    client: &reqwest::Client,
    state: &Arc<ResolveState>,
    key: &Arc<str>,
) -> CatalogResult {
    let entry_mutex: Arc<AsyncMutex<Option<CatalogResult>>> = {
        let mut cache = state.catalog_cache.lock().unwrap();
        cache
            .entry(Arc::clone(key))
            .or_insert_with(|| Arc::new(AsyncMutex::new(None)))
            .clone()
    };

    let mut lock = entry_mutex.lock().await;

    if let Some(ref cached) = *lock {
        return cached.clone();
    }

    let result = fetch_catalog_entry_limited(client, state, key).await;
    *lock = Some(result.clone());
    result
}

async fn fetch_catalog_entry_limited(
    client: &reqwest::Client,
    state: &Arc<ResolveState>,
    key: &str,
) -> CatalogResult {
    let remaining = state.time_remaining().ok_or(NugetError::Timeout)?;

    let _permit = timeout(remaining, state.request_permits.acquire())
        .await
        .map_err(|_| NugetError::Timeout)?
        .map_err(|e| NugetError::Other(format!("Resolver stopped: {e}")))?;

    let remaining = state.time_remaining().ok_or(NugetError::Timeout)?;

    let (id, version) = key.split_once('@').unwrap_or((key, ""));

    timeout(remaining, fetch_catalog_entry(client, id, version))
        .await
        .map_err(|_| NugetError::Timeout)?
        .map(Arc::new)
}

async fn fetch_catalog_entry(
    client: &reqwest::Client,
    id: &str,
    version: &str,
) -> Result<CatalogEntry, NugetError> {
    let id_lower = id.to_lowercase();
    let ver_lower = version.to_lowercase();

    for base in &["registration5-semver1", "registration5-semver2"] {
        let url = format!("https://api.nuget.org/v3/{base}/{id_lower}/{ver_lower}.json");
        let resp = get_with_retry(client, &url).await?;

        if resp.status() == 404 {
            continue;
        }

        let leaf: RegistrationLeaf = resp
            .json()
            .await
            .map_err(|e| NugetError::Parse(format!("Failed to parse leaf: {e}")))?;

        return fetch_catalog_ref(client, leaf.catalog_entry).await;
    }

    fetch_from_index(client, id, version).await
}

async fn fetch_catalog_ref(
    client: &reqwest::Client,
    entry: CatalogEntryRef,
) -> Result<CatalogEntry, NugetError> {
    match entry {
        CatalogEntryRef::Url(url) => {
            let resp = get_with_retry(client, &url).await?;
            resp.json()
                .await
                .map_err(|e| NugetError::Parse(format!("Failed to parse catalogue entry: {e}")))
        }
        CatalogEntryRef::Entry(e) => Ok(e),
    }
}

async fn fetch_from_index(
    client: &reqwest::Client,
    id: &str,
    version: &str,
) -> Result<CatalogEntry, NugetError> {
    let id_lower = id.to_lowercase();

    for base in &["registration5-semver1", "registration5-semver2"] {
        let url = format!("https://api.nuget.org/v3/{base}/{id_lower}/index.json");
        let resp = get_with_retry(client, &url).await?;

        if resp.status() == 404 {
            continue;
        }

        let index: Value = resp
            .json()
            .await
            .map_err(|e| NugetError::Parse(format!("Failed to parse index: {e}")))?;

        let pages = match index["items"].as_array() {
            Some(p) => p,
            None => continue,
        };

        for page in pages {
            let lower = page["lower"].as_str().unwrap_or("");
            let upper = page["upper"].as_str().unwrap_or("");
            if !lower.is_empty() && !upper.is_empty() && !version_in_range(version, lower, upper) {
                continue;
            }

            let items: Vec<Value> = if let Some(inline) = page["items"].as_array() {
                inline.clone()
            } else if let Some(page_url) = page["@id"].as_str() {
                let pr = get_with_retry(client, page_url).await?;
                if !pr.status().is_success() {
                    continue;
                }
                match pr.json::<Value>().await {
                    Ok(d) => d["items"].as_array().cloned().unwrap_or_default(),
                    Err(_) => continue,
                }
            } else {
                continue;
            };

            for item in &items {
                if !versions_match(item_version(item), version) {
                    continue;
                }
                let catalog_entry = match item.get("catalogEntry") {
                    Some(v) => serde_json::from_value::<CatalogEntryRef>(v.clone())
                        .map_err(|e| NugetError::Parse(format!("Failed to parse catalogue ref: {e}")))?,
                    None => continue,
                };
                return fetch_catalog_ref(client, catalog_entry).await;
            }
        }
    }

    Err(NugetError::NotFound(version.to_string()))
}

// ── Framework group helpers ───────────────────────────────────────────────────

fn build_framework_groups(
    entry: &CatalogEntry,
    branch_path: &[Arc<str>],
) -> Vec<FrameworkGroup> {
    entry
        .dependency_groups
        .iter()
        .map(|g| {
            let framework: Arc<str> = normalize_fw(&g.target_framework).into();
            let deps = g
                .dependencies
                .iter()
                .filter_map(|d| {
                    min_version_from_range(&d.range).map(|ver| {
                        let dep_key: Arc<str> = cache_key(&d.id, &ver).into();
                        let circular = branch_path.iter().any(|p| *p == dep_key);
                        SimpleDep {
                            id: d.id.clone().into(),
                            version: ver.into(),
                            circular,
                        }
                    })
                })
                .collect();
            FrameworkGroup { framework, deps }
        })
        .collect()
}

fn unique_deps_across_frameworks(fw_groups: &[FrameworkGroup]) -> Vec<(Arc<str>, Arc<str>)> {
    let mut seen: HashSet<Arc<str>> = HashSet::new();
    let mut result: Vec<(Arc<str>, Arc<str>)> = Vec::new();
    for fg in fw_groups {
        for dep in &fg.deps {
            if dep.circular {
                continue;
            }
            let key: Arc<str> = cache_key(&dep.id, &dep.version).into();
            if seen.insert(key) {
                result.push((Arc::clone(&dep.id), Arc::clone(&dep.version)));
            }
        }
    }
    result
}

fn normalize_fw(fw: &str) -> String {
    if fw.is_empty() {
        "any".to_string()
    } else {
        fw.to_string()
    }
}

// ── Version / key helpers ─────────────────────────────────────────────────────

fn cache_key(id: &str, version: &str) -> String {
    format!("{}@{}", id.to_lowercase(), version.to_lowercase())
}

fn item_version(item: &Value) -> &str {
    item["@id"]
        .as_str()
        .and_then(|s| s.strip_suffix(".json"))
        .and_then(|s| s.rsplit('/').next())
        .or_else(|| item["catalogEntry"]["version"].as_str())
        .unwrap_or("")
}

// ── Robust NuGet Versioning ───────────────────────────────────────────────────

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct NugetVersion {
    pub parts: [u64; 4],
    pub prerelease: Option<String>,
}

impl Ord for NugetVersion {
    fn cmp(&self, other: &Self) -> CmpOrdering {
        match self.parts.cmp(&other.parts) {
            CmpOrdering::Equal => {
                match (&self.prerelease, &other.prerelease) {
                    (None, None) => CmpOrdering::Equal,
                    (None, Some(_)) => CmpOrdering::Greater, // Stable > Pre-release
                    (Some(_), None) => CmpOrdering::Less,    // Pre-release < Stable
                    (Some(a), Some(b)) => a.cmp(b),          // Lexicographical fallback
                }
            }
            other_cmp => other_cmp,
        }
    }
}

impl PartialOrd for NugetVersion {
    fn partial_cmp(&self, other: &Self) -> Option<CmpOrdering> {
        Some(self.cmp(other))
    }
}

fn parse_nuver(v: &str) -> NugetVersion {
    let mut split = v.splitn(2, ['-', '+']);
    let main_part = split.next().unwrap_or("");
    let prerelease = split.next().map(|s| s.to_string());

    let mut parts = [0u64; 4];
    for (i, p) in main_part.split('.').take(4).enumerate() {
        parts[i] = p.parse().unwrap_or(0);
    }

    NugetVersion { parts, prerelease }
}

fn version_in_range(version: &str, lower: &str, upper: &str) -> bool {
    let v = parse_nuver(version);
    v >= parse_nuver(lower) && v <= parse_nuver(upper)
}

fn versions_match(a: &str, b: &str) -> bool {
    parse_nuver(a) == parse_nuver(b)
}

pub fn min_version_from_range(range: &str) -> Option<String> {
    let r = range.trim();
    if r.is_empty() || r == "*" {
        return None;
    }
    if r.starts_with('[') || r.starts_with('(') {
        let inner = &r[1..];
        let end = inner.find([',', ']', ')']).unwrap_or(inner.len());
        let v = inner[..end].trim();
        return if v.is_empty() { None } else { Some(v.to_string()) };
    }
    Some(r.to_string())
}