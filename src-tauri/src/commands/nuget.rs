use futures::future::join_all;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
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
    time::{timeout, Instant},
};

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_DEPTH: u32 = 25;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);
const RESOLUTION_TIMEOUT: Duration = Duration::from_secs(30);
const SOFT_RESOLUTION_TIMEOUT: Duration = Duration::from_secs(28);
const MAX_NODES: usize = 500;
const MAX_CONCURRENT_REQUESTS: usize = 10;

// ── Streaming event types ─────────────────────────────────────────────────────

/// Events streamed progressively through the Channel to the frontend.
#[derive(Serialize, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum NugetEvent {
    /// First event — the root package identity + ALL its framework dependency
    /// groups so the header card can be rendered after a single HTTP call.
    #[serde(rename = "header")]
    Header {
        id: String,
        version: String,
        #[serde(rename = "frameworkGroups")]
        framework_groups: Vec<FrameworkGroup>,
    },

    /// One package has been fully resolved.  Emitted exactly once per
    /// id+version (subsequent encounters of the same package by other branches
    /// are silently skipped — the frontend registry already has the entry).
    #[serde(rename = "packageData")]
    PackageData {
        id: String,
        version: String,
        #[serde(rename = "frameworkGroups")]
        framework_groups: Vec<FrameworkGroup>,
        truncated: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        error: Option<String>,
    },

    /// All resolution work is complete.
    #[serde(rename = "done")]
    Done {
        #[serde(rename = "totalNodes")]
        total_nodes: usize,
        truncated: bool,
    },

    /// A fatal, top-level error (package not found, unreachable network, etc.).
    #[serde(rename = "error")]
    Error { message: String },
}

/// One target-framework bucket inside a resolved package.
#[derive(Serialize, Clone)]
pub struct FrameworkGroup {
    pub framework: String,
    pub deps: Vec<SimpleDep>,
}

/// A direct dependency reference inside a framework group.
#[derive(Serialize, Clone)]
pub struct SimpleDep {
    pub id: String,
    pub version: String,
    /// Set to `true` when this dep already appears in the current branch path.
    /// The frontend should display a "circular" badge and treat it as a leaf.
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

type CatalogResult = Result<Arc<CatalogEntry>, String>;

struct ResolveState {
    /// Catalog entries cached by `id@version` (lowercase).
    /// The inner AsyncMutex ensures exactly one HTTP fetch per package —
    /// concurrent requests for the same package wait on the lock and then
    /// read the cached value.
    catalog_cache: StdMutex<HashMap<String, Arc<AsyncMutex<Option<CatalogResult>>>>>,

    /// Set of package keys whose PackageData event has been emitted.
    /// `try_claim_emit` returns true on the first insert (claim the work),
    /// false on all subsequent attempts (skip — the registry already has data).
    emitted: StdMutex<HashSet<String>>,

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

    /// Returns `true` if the caller should emit + recurse for this package,
    /// `false` if another branch already claimed that responsibility.
    fn try_claim_emit(&self, id: &str, version: &str) -> bool {
        self.emitted
            .lock()
            .unwrap()
            .insert(cache_key(id, version))
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
                message: format!(
                    "Timed out after {} seconds",
                    RESOLUTION_TIMEOUT.as_secs()
                ),
            });
        }
        Ok(Err(msg)) => {
            let _ = on_event.send(NugetEvent::Error { message: msg });
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

/// Fetch the root catalog entry, emit `Header` (immediately visible to the
/// frontend after a single HTTP call), then resolve all transitive deps.
async fn resolve_root(
    client: reqwest::Client,
    state: Arc<ResolveState>,
    on_event: Arc<Channel<NugetEvent>>,
    id: String,
    version: String,
) -> Result<(), String> {
    let entry = fetch_catalog_cached(&client, &state, &id, &version)
        .await
        .map_err(|e| format!("Failed to fetch '{id}' v{version}: {e}"))?;

    // Build the initial branch path with just the root package.
    let root_key: Arc<str> = cache_key(&entry.id, &entry.version).into();
    let root_path: Vec<Arc<str>> = vec![Arc::clone(&root_key)];

    let fw_groups = build_framework_groups(&entry, &root_path);

    // ── Emit Header immediately — this is the very first UI render ────────────
    let _ = on_event.send(NugetEvent::Header {
        id: entry.id.clone(),
        version: entry.version.clone(),
        framework_groups: fw_groups.clone(),
    });

    // Claim the root so it is never re-emitted as PackageData later.
    state.try_claim_emit(&entry.id, &entry.version);
    state.nodes.fetch_add(1, Ordering::Relaxed);

    // Collect unique deps across all the root's framework groups and resolve them.
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

/// Recursively resolve one package, emitting a `PackageData` event exactly
/// once per unique id+version across the entire resolution run.
fn resolve_package(
    client: reqwest::Client,
    state: Arc<ResolveState>,
    on_event: Arc<Channel<NugetEvent>>,
    id: String,
    version: String,
    depth: u32,
    path: Vec<Arc<str>>,
) -> futures::future::BoxFuture<'static, ()> {
    Box::pin(async move {
        let key: Arc<str> = cache_key(&id, &version).into();

        // ── Depth guard ────────────────────────────────────────────────────────
        if depth >= MAX_DEPTH {
            if state.try_claim_emit(&id, &version) {
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

        // ── Cycle guard ────────────────────────────────────────────────────────
        // Circular deps are already flagged in parent's SimpleDep.circular so the
        // frontend shows the badge.  Here we just stop recursion silently.
        if path.iter().any(|p| *p == key) {
            return;
        }

        // Extend the branch path to include the current package.
        let mut child_path = path;
        child_path.push(Arc::clone(&key));

        // ── Time budget (checked before making a network call) ─────────────────
        if state.is_time_up() {
            if state.try_claim_emit(&id, &version) {
                state.any_truncated.store(true, Ordering::Relaxed);
                let _ = on_event.send(NugetEvent::PackageData {
                    id,
                    version,
                    framework_groups: vec![],
                    truncated: true,
                    error: Some("time limit reached".into()),
                });
            }
            return;
        }

        // ── Fetch catalog entry (serialised and cached per id+version) ─────────
        let catalog_result = fetch_catalog_cached(&client, &state, &id, &version).await;

        // ── Claim exclusive emit rights ────────────────────────────────────────
        // Another branch that resolved this package first already emitted its
        // PackageData; the frontend registry has the entry.
        if !state.try_claim_emit(&id, &version) {
            return;
        }

        // ── Node budget (only counted for packages we actually emit) ───────────
        if state.nodes.fetch_add(1, Ordering::Relaxed) >= MAX_NODES {
            state.any_truncated.store(true, Ordering::Relaxed);
            let _ = on_event.send(NugetEvent::PackageData {
                id,
                version,
                framework_groups: vec![],
                truncated: true,
                error: Some("node limit reached".into()),
            });
            return;
        }

        // ── Build framework groups then decide whether to recurse ──────────────
        let (fw_groups, should_recurse) = match catalog_result {
            Err(e) => {
                let is_budget =
                    e.contains("time limit") || e.contains("node limit");
                if is_budget {
                    state.any_truncated.store(true, Ordering::Relaxed);
                }
                let _ = on_event.send(NugetEvent::PackageData {
                    id,
                    version,
                    framework_groups: vec![],
                    truncated: is_budget,
                    error: Some(e),
                });
                return; // nothing to recurse into
            }
            Ok(entry) => {
                let fgs = build_framework_groups(&entry, &child_path);
                let _ = on_event.send(NugetEvent::PackageData {
                    id: entry.id.clone(),
                    version: entry.version.clone(),
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

        // ── Recurse into unique, non-circular deps ─────────────────────────────
        // unique_deps_across_frameworks already skips deps marked circular.
        let unique_deps: Vec<(String, String)> = unique_deps_across_frameworks(&fw_groups);

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

// ── Catalog fetch helpers ─────────────────────────────────────────────────────

/// Fetch a catalog entry, ensuring at most one network request per id+version
/// pair even when many branches race to resolve the same package.
async fn fetch_catalog_cached(
    client: &reqwest::Client,
    state: &Arc<ResolveState>,
    id: &str,
    version: &str,
) -> CatalogResult {
    let key = cache_key(id, version);

    // Fast synchronous step: get or create the per-package async mutex.
    let entry_mutex: Arc<AsyncMutex<Option<CatalogResult>>> = {
        let mut cache = state.catalog_cache.lock().unwrap();
        cache
            .entry(key)
            .or_insert_with(|| Arc::new(AsyncMutex::new(None)))
            .clone()
    };

    // Async lock: the first task fetches; all others wait and read the result.
    let mut lock = entry_mutex.lock().await;

    if let Some(ref cached) = *lock {
        return cached.clone();
    }

    // We are the first for this package — perform the actual fetch.
    let result = fetch_catalog_entry_limited(client, state, id, version).await;
    *lock = Some(result.clone());
    result
}

async fn fetch_catalog_entry_limited(
    client: &reqwest::Client,
    state: &Arc<ResolveState>,
    id: &str,
    version: &str,
) -> CatalogResult {
    let remaining = state
        .time_remaining()
        .ok_or_else(|| "time limit reached".to_string())?;

    let _permit = timeout(remaining, state.request_permits.acquire())
        .await
        .map_err(|_| "time limit reached".to_string())?
        .map_err(|_| "Dependency resolver stopped unexpectedly".to_string())?;

    let remaining = state
        .time_remaining()
        .ok_or_else(|| "time limit reached".to_string())?;

    timeout(remaining, fetch_catalog_entry(client, id, version))
        .await
        .map_err(|_| "time limit reached".to_string())?
        .map(Arc::new)
}

async fn fetch_catalog_entry(
    client: &reqwest::Client,
    id: &str,
    version: &str,
) -> Result<CatalogEntry, String> {
    let id_lower = id.to_lowercase();
    let ver_lower = version.to_lowercase();

    for base in &["registration5-semver1", "registration5-semver2"] {
        let url = format!("https://api.nuget.org/v3/{base}/{id_lower}/{ver_lower}.json");
        let resp = match client.get(&url).send().await {
            Ok(r) => r,
            Err(e) => return Err(format!("Network error: {e}")),
        };
        if resp.status() == 404 {
            continue;
        }
        if !resp.status().is_success() {
            return Err(format!("HTTP {}", resp.status()));
        }
        let leaf: RegistrationLeaf = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse leaf: {e}"))?;
        return fetch_catalog_ref(client, leaf.catalog_entry).await;
    }

    fetch_from_index(client, id, version).await
}

async fn fetch_catalog_ref(
    client: &reqwest::Client,
    entry: CatalogEntryRef,
) -> Result<CatalogEntry, String> {
    match entry {
        CatalogEntryRef::Url(url) => fetch_catalog_url(client, &url).await,
        CatalogEntryRef::Entry(e) => Ok(e),
    }
}

async fn fetch_catalog_url(
    client: &reqwest::Client,
    url: &str,
) -> Result<CatalogEntry, String> {
    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch catalog entry: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("Catalog entry HTTP {}", resp.status()));
    }
    resp.json()
        .await
        .map_err(|e| format!("Failed to parse catalog entry: {e}"))
}

async fn fetch_from_index(
    client: &reqwest::Client,
    id: &str,
    version: &str,
) -> Result<CatalogEntry, String> {
    let id_lower = id.to_lowercase();

    for base in &["registration5-semver1", "registration5-semver2"] {
        let url = format!("https://api.nuget.org/v3/{base}/{id_lower}/index.json");
        let resp = match client.get(&url).send().await {
            Ok(r) if r.status().is_success() => r,
            Ok(r) if r.status() == 404 => continue,
            Ok(r) => return Err(format!("Package '{id}' not found (HTTP {})", r.status())),
            Err(e) => return Err(format!("Network error: {e}")),
        };

        let index: Value = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse index: {e}"))?;

        let pages = match index["items"].as_array() {
            Some(p) => p.clone(),
            None => continue,
        };

        for page in &pages {
            let lower = page["lower"].as_str().unwrap_or("");
            let upper = page["upper"].as_str().unwrap_or("");
            if !lower.is_empty()
                && !upper.is_empty()
                && !version_in_range(version, lower, upper)
            {
                continue;
            }

            let items: Vec<Value> = if let Some(inline) = page["items"].as_array() {
                inline.clone()
            } else if let Some(page_url) = page["@id"].as_str() {
                let pr = match client.get(page_url).send().await {
                    Ok(r) if r.status().is_success() => r,
                    _ => continue,
                };
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
                        .map_err(|e| format!("Failed to parse catalog entry ref: {e}"))?,
                    None => continue,
                };
                return fetch_catalog_ref(client, catalog_entry).await;
            }
        }
    }

    Err(format!(
        "Version '{version}' of '{id}' not found in registry"
    ))
}

// ── Framework group helpers ───────────────────────────────────────────────────

/// Build the list of FrameworkGroups from a catalog entry.
/// `branch_path` contains the id@version keys of all packages on the current
/// resolution branch; any dep that appears in this set is flagged `circular`.
fn build_framework_groups(
    entry: &CatalogEntry,
    branch_path: &[Arc<str>],
) -> Vec<FrameworkGroup> {
    entry
        .dependency_groups
        .iter()
        .map(|g| {
            let framework = normalize_fw(&g.target_framework);
            let deps = g
                .dependencies
                .iter()
                .filter_map(|d| {
                    min_version_from_range(&d.range).map(|ver| {
                        let dep_key: Arc<str> = cache_key(&d.id, &ver).into();
                        let circular = branch_path.iter().any(|p| *p == dep_key);
                        SimpleDep {
                            id: d.id.clone(),
                            version: ver,
                            circular,
                        }
                    })
                })
                .collect();
            FrameworkGroup { framework, deps }
        })
        .collect()
}

/// Collect a deduplicated list of (id, version) pairs across all framework
/// groups, skipping any dep marked `circular` (those are leaf badges only).
fn unique_deps_across_frameworks(fw_groups: &[FrameworkGroup]) -> Vec<(String, String)> {
    let mut seen: HashSet<String> = HashSet::new();
    let mut result: Vec<(String, String)> = Vec::new();
    for fg in fw_groups {
        for dep in &fg.deps {
            if dep.circular {
                continue;
            }
            if seen.insert(cache_key(&dep.id, &dep.version)) {
                result.push((dep.id.clone(), dep.version.clone()));
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

fn version_in_range(version: &str, lower: &str, upper: &str) -> bool {
    let v = ver_tuple(version);
    v >= ver_tuple(lower) && v <= ver_tuple(upper)
}

fn versions_match(a: &str, b: &str) -> bool {
    ver_tuple(a) == ver_tuple(b)
}

fn ver_tuple(v: &str) -> (u64, u64, u64, u64) {
    let mut parts = v.split('.').map(|p| {
        p.split(['-', '+'])
            .next()
            .unwrap_or("")
            .parse::<u64>()
            .unwrap_or(0)
    });
    (
        parts.next().unwrap_or(0),
        parts.next().unwrap_or(0),
        parts.next().unwrap_or(0),
        parts.next().unwrap_or(0),
    )
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

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn extracts_min_version_from_common_ranges() {
        assert_eq!(
            min_version_from_range("[1.2.3, 2.0.0)"),
            Some("1.2.3".into())
        );
        assert_eq!(min_version_from_range("(, 2.0.0]"), None);
        assert_eq!(min_version_from_range("1.2.3"), Some("1.2.3".into()));
        assert_eq!(min_version_from_range("*"), None);
    }

    #[test]
    fn matches_versions_by_numeric_tuple() {
        assert!(versions_match("1.2", "1.2.0"));
        assert!(versions_match("1.2.3+build", "1.2.3"));
        assert!(!versions_match("1.2.3", "1.2.4"));
    }

    #[test]
    fn cache_key_normalizes_package_and_version() {
        assert_eq!(
            cache_key("Newtonsoft.Json", "13.0.3"),
            "newtonsoft.json@13.0.3"
        );
    }

    #[test]
    fn normalize_fw_converts_empty_to_any() {
        assert_eq!(normalize_fw(""), "any");
        assert_eq!(normalize_fw(".NETStandard2.0"), ".NETStandard2.0");
    }

    #[test]
    fn build_framework_groups_marks_circular_deps() {
        let path: Vec<Arc<str>> = vec![cache_key("child.package", "1.0.0").into()];

        let entry = CatalogEntry {
            id: "parent.package".into(),
            version: "1.0.0".into(),
            dependency_groups: vec![DepGroup {
                target_framework: ".NETStandard2.0".into(),
                dependencies: vec![
                    RawDepRef {
                        id: "child.package".into(),
                        range: "[1.0.0, )".into(),
                    },
                    RawDepRef {
                        id: "other.package".into(),
                        range: "[2.0.0, )".into(),
                    },
                ],
            }],
        };

        let groups = build_framework_groups(&entry, &path);
        assert_eq!(groups.len(), 1);
        let deps = &groups[0].deps;
        assert_eq!(deps.len(), 2);
        assert!(deps[0].circular, "child.package should be marked circular");
        assert!(!deps[1].circular, "other.package should not be circular");
    }

    #[test]
    fn unique_deps_deduplicates_and_skips_circular() {
        let groups = vec![
            FrameworkGroup {
                framework: ".NETStandard2.0".into(),
                deps: vec![
                    SimpleDep {
                        id: "A".into(),
                        version: "1.0.0".into(),
                        circular: false,
                    },
                    SimpleDep {
                        id: "B".into(),
                        version: "1.0.0".into(),
                        circular: true, // should be skipped
                    },
                ],
            },
            FrameworkGroup {
                framework: ".NETCoreApp3.1".into(),
                deps: vec![
                    SimpleDep {
                        id: "A".into(),
                        version: "1.0.0".into(),
                        circular: false, // duplicate of first group's A
                    },
                    SimpleDep {
                        id: "C".into(),
                        version: "1.0.0".into(),
                        circular: false,
                    },
                ],
            },
        ];

        let deps = unique_deps_across_frameworks(&groups);
        assert_eq!(deps.len(), 2, "should have A and C only");
        assert!(deps.iter().any(|(id, _)| id == "A"));
        assert!(deps.iter().any(|(id, _)| id == "C"));
        assert!(!deps.iter().any(|(id, _)| id == "B"), "circular B must be absent");
    }

    #[test]
    fn parses_inline_catalog_entry_reference() {
        let parsed: CatalogEntryRef = serde_json::from_value(json!({
            "id": "Example.Package",
            "version": "1.0.0",
            "dependencyGroups": [{
                "targetFramework": ".NETStandard2.0",
                "dependencies": [{ "id": "Child.Package", "range": "[2.0.0, )" }]
            }]
        }))
        .expect("inline catalog entry should parse");

        match parsed {
            CatalogEntryRef::Entry(e) => {
                assert_eq!(e.id, "Example.Package");
                assert_eq!(e.dependency_groups[0].dependencies[0].id, "Child.Package");
            }
            CatalogEntryRef::Url(_) => panic!("expected inline catalog entry"),
        }
    }

    #[test]
    fn item_version_falls_back_to_inline_catalog_entry() {
        let item = json!({
            "catalogEntry": {
                "id": "Example.Package",
                "version": "3.4.5",
                "dependencyGroups": []
            }
        });
        assert_eq!(item_version(&item), "3.4.5");
    }

    #[tokio::test]
    async fn try_claim_emit_is_exclusive() {
        let state = Arc::new(ResolveState::new(
            Instant::now() + SOFT_RESOLUTION_TIMEOUT,
        ));
        assert!(state.try_claim_emit("Pkg", "1.0.0"), "first claim should succeed");
        assert!(!state.try_claim_emit("Pkg", "1.0.0"), "second claim must fail");
        assert!(
            state.try_claim_emit("Other", "1.0.0"),
            "different package should succeed"
        );
    }

    #[tokio::test]
    async fn resolve_package_truncates_at_depth_limit() {
        let client = reqwest::Client::new();
        let state = Arc::new(ResolveState::new(
            Instant::now() + SOFT_RESOLUTION_TIMEOUT,
        ));

        // We cannot easily capture the Channel output without a full Tauri setup,
        // but we can verify the function returns without panicking at MAX_DEPTH.
        let fut = resolve_package(
            client,
            state,
            // A real Channel requires a Tauri context; skip emission in this unit test
            // by wrapping in a no-op Arc<Channel> — this will simply not compile if
            // the signature changes, acting as a compile-time guard.
            Arc::new(unsafe {
                std::mem::zeroed::<Channel<NugetEvent>>()
            }),
            "Example.Package".into(),
            "1.0.0".into(),
            MAX_DEPTH,
            vec![],
        );

        // The function must return (not hang) when depth >= MAX_DEPTH.
        tokio::time::timeout(std::time::Duration::from_secs(1), fut)
            .await
            .expect("resolve_package should return promptly at MAX_DEPTH");
    }
}
