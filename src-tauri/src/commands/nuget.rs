use futures::future::join_all;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
    time::Duration,
};
use tauri::command;
use tokio::{
    sync::{Mutex, Semaphore},
    time::{timeout, Instant},
};

const MAX_DEPTH: u32 = 25;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);
const RESOLUTION_TIMEOUT: Duration = Duration::from_secs(20);
const SOFT_RESOLUTION_TIMEOUT: Duration = Duration::from_secs(18);
const MAX_NODES: usize = 500;
const MAX_CONCURRENT_REQUESTS: usize = 8;
const TIME_LIMIT_REACHED: &str = "time limit reached";

#[derive(Serialize, Clone)]
pub struct DepNode {
    pub id: String,
    pub version: String,
    pub frameworks: Vec<FrameworkGroup>,
    pub truncated: bool,
    pub error: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct FrameworkGroup {
    pub framework: String,
    pub dependencies: Vec<DepNode>,
}

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
    dependencies: Vec<DepRef>,
}

#[derive(Deserialize, Clone)]
struct DepRef {
    id: String,
    #[serde(default)]
    range: String,
}

struct ResolveState {
    cache: Mutex<HashMap<String, DepNode>>,
    nodes: AtomicUsize,
    request_permits: Semaphore,
    deadline: Instant,
}

impl ResolveState {
    fn new(deadline: Instant) -> Self {
        Self {
            cache: Mutex::new(HashMap::new()),
            nodes: AtomicUsize::new(0),
            request_permits: Semaphore::new(MAX_CONCURRENT_REQUESTS),
            deadline,
        }
    }

    fn time_remaining(&self) -> Option<Duration> {
        self.deadline.checked_duration_since(Instant::now())
    }
}

#[command]
pub async fn nuget_dependency_tree(package: String, version: String) -> Result<DepNode, String> {
    let package = package.trim().to_string();
    let version = version.trim().to_string();
    if package.is_empty() || version.is_empty() {
        return Err("Package id and version are required".into());
    }

    let client = Arc::new(
        reqwest::Client::builder()
            .user_agent("dev-core-tools/1.0")
            .timeout(REQUEST_TIMEOUT)
            .build()
            .map_err(|e| format!("Failed to build HTTP client: {e}"))?,
    );
    let state = Arc::new(ResolveState::new(Instant::now() + SOFT_RESOLUTION_TIMEOUT));

    let root = timeout(
        RESOLUTION_TIMEOUT,
        resolve(client, state, package, version, 0, Vec::new()),
    )
    .await
    .map_err(|_| {
        format!(
            "Timed out while resolving dependency tree after {} seconds",
            RESOLUTION_TIMEOUT.as_secs()
        )
    })?;

    if let Some(error) = &root.error {
        if root.frameworks.is_empty() {
            return Err(error.clone());
        }
    }

    Ok(root)
}

// Recursive resolver. `path` is the package@version chain for the current
// branch, which keeps cycle detection local while the shared cache dedupes work.
fn resolve(
    client: Arc<reqwest::Client>,
    state: Arc<ResolveState>,
    id: String,
    version: String,
    depth: u32,
    path: Vec<String>,
) -> futures::future::BoxFuture<'static, DepNode> {
    Box::pin(async move {
        let key = cache_key(&id, &version);

        if depth >= MAX_DEPTH {
            return DepNode {
                id,
                version,
                frameworks: vec![],
                truncated: true,
                error: None,
            };
        }
        if path.iter().any(|p| p == &key) {
            return DepNode {
                id,
                version,
                frameworks: vec![],
                truncated: true,
                error: Some("circular dependency detected".into()),
            };
        }
        if let Some(cached) = {
            let cache = state.cache.lock().await;
            cache.get(&key).cloned()
        } {
            return cached;
        }

        if state.time_remaining().is_none() {
            return DepNode {
                id,
                version,
                frameworks: vec![],
                truncated: true,
                error: Some(TIME_LIMIT_REACHED.into()),
            };
        }

        if state.nodes.fetch_add(1, Ordering::Relaxed) >= MAX_NODES {
            return DepNode {
                id,
                version,
                frameworks: vec![],
                truncated: true,
                error: Some("node limit reached".into()),
            };
        }

        let mut child_path = path;
        child_path.push(key.clone());

        let node = match fetch_catalog_entry_limited(&client, state.clone(), &id, &version).await {
            Err(e) if e == TIME_LIMIT_REACHED => DepNode {
                id,
                version,
                frameworks: vec![],
                truncated: true,
                error: Some(e),
            },
            Err(e) => DepNode {
                id,
                version,
                frameworks: vec![],
                truncated: false,
                error: Some(e),
            },

            Ok(entry) => {
                let mut frameworks = Vec::new();

                for group in entry.dependency_groups {
                    let tf = if group.target_framework.is_empty() {
                        "any".to_string()
                    } else {
                        group.target_framework
                    };

                    // Resolve all deps in this framework group concurrently.
                    let futures: Vec<_> = group
                        .dependencies
                        .into_iter()
                        .filter_map(|dep| min_version_from_range(&dep.range).map(|v| (dep.id, v)))
                        .map(|(dep_id, dep_ver)| {
                            let cp = child_path.clone();
                            resolve(
                                client.clone(),
                                state.clone(),
                                dep_id,
                                dep_ver,
                                depth + 1,
                                cp,
                            )
                        })
                        .collect();

                    let deps = join_all(futures).await;
                    frameworks.push(FrameworkGroup {
                        framework: tf,
                        dependencies: deps,
                    });
                }

                DepNode {
                    id: entry.id,
                    version: entry.version,
                    frameworks,
                    truncated: false,
                    error: None,
                }
            }
        };

        state.cache.lock().await.insert(key, node.clone());
        node
    })
}

async fn fetch_catalog_entry_limited(
    client: &reqwest::Client,
    state: Arc<ResolveState>,
    id: &str,
    version: &str,
) -> Result<CatalogEntry, String> {
    let remaining = state
        .time_remaining()
        .ok_or_else(|| TIME_LIMIT_REACHED.to_string())?;
    let _permit = timeout(remaining, state.request_permits.acquire())
        .await
        .map_err(|_| TIME_LIMIT_REACHED.to_string())?
        .map_err(|_| "Dependency resolver stopped unexpectedly".to_string())?;

    let remaining = state
        .time_remaining()
        .ok_or_else(|| TIME_LIMIT_REACHED.to_string())?;
    timeout(remaining, fetch_catalog_entry(client, id, version))
        .await
        .map_err(|_| TIME_LIMIT_REACHED.to_string())?
}

// The registration leaf endpoint can return `catalogEntry` as either a URL
// string or an inline object. Falls back to an index scan when the exact-version
// leaf returns 404.
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
    catalog_entry: CatalogEntryRef,
) -> Result<CatalogEntry, String> {
    match catalog_entry {
        CatalogEntryRef::Url(url) => fetch_catalog_url(client, &url).await,
        CatalogEntryRef::Entry(entry) => Ok(entry),
    }
}

async fn fetch_catalog_url(client: &reqwest::Client, url: &str) -> Result<CatalogEntry, String> {
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

// Index fallback: handles paginated pages and URL/inline catalogEntry fields.
// Uses page lower/upper bounds to skip pages that cannot contain the target version.
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
            // Skip pages whose version range excludes the target.
            let lower = page["lower"].as_str().unwrap_or("");
            let upper = page["upper"].as_str().unwrap_or("");
            if !lower.is_empty() && !upper.is_empty() && !version_in_range(version, lower, upper) {
                continue;
            }

            // Pages may be inline (have "items") or paginated (only an "@id" URL).
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
                let item_ver = item_version(item);
                if !versions_match(item_ver, version) {
                    continue;
                }

                let catalog_entry = match item.get("catalogEntry") {
                    Some(value) => serde_json::from_value::<CatalogEntryRef>(value.clone())
                        .map_err(|e| format!("Failed to parse catalog entry reference: {e}"))?,
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

fn item_version(item: &Value) -> &str {
    item["@id"]
        .as_str()
        .and_then(|s| s.strip_suffix(".json"))
        .and_then(|s| s.rsplit('/').next())
        .or_else(|| item["catalogEntry"]["version"].as_str())
        .unwrap_or("")
}

fn cache_key(id: &str, version: &str) -> String {
    format!("{}@{}", id.to_lowercase(), version.to_lowercase())
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
        return if v.is_empty() {
            None
        } else {
            Some(v.to_string())
        };
    }
    Some(r.to_string())
}

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
    fn parses_inline_catalog_entry_reference() {
        let parsed: CatalogEntryRef = serde_json::from_value(json!({
            "id": "Example.Package",
            "version": "1.0.0",
            "dependencyGroups": [
                {
                    "targetFramework": ".NETStandard2.0",
                    "dependencies": [
                        { "id": "Child.Package", "range": "[2.0.0, )" }
                    ]
                }
            ]
        }))
        .expect("inline catalog entry should parse");

        match parsed {
            CatalogEntryRef::Entry(entry) => {
                assert_eq!(entry.id, "Example.Package");
                assert_eq!(entry.version, "1.0.0");
                assert_eq!(entry.dependency_groups.len(), 1);
                assert_eq!(
                    entry.dependency_groups[0].dependencies[0].id,
                    "Child.Package"
                );
            }
            CatalogEntryRef::Url(_) => panic!("expected inline catalog entry"),
        }
    }

    #[test]
    fn parses_url_catalog_entry_reference() {
        let parsed: CatalogEntryRef = serde_json::from_value(json!(
            "https://api.nuget.org/v3/catalog0/data/2024.01.01/example.1.0.0.json"
        ))
        .expect("url catalog entry should parse");

        match parsed {
            CatalogEntryRef::Url(url) => assert!(url.ends_with("example.1.0.0.json")),
            CatalogEntryRef::Entry(_) => panic!("expected catalog entry URL"),
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

    #[test]
    fn cache_key_normalizes_package_and_version() {
        assert_eq!(
            cache_key("Newtonsoft.Json", "13.0.3"),
            "newtonsoft.json@13.0.3"
        );
    }

    #[tokio::test]
    async fn resolve_truncates_at_depth_limit_without_network() {
        let client = Arc::new(reqwest::Client::new());
        let state = Arc::new(ResolveState::new(Instant::now() + SOFT_RESOLUTION_TIMEOUT));

        let node = resolve(
            client,
            state,
            "Example.Package".into(),
            "1.0.0".into(),
            MAX_DEPTH,
            Vec::new(),
        )
        .await;

        assert!(node.truncated);
        assert!(node.error.is_none());
    }

    #[tokio::test]
    async fn resolve_detects_cycles_before_fetching() {
        let client = Arc::new(reqwest::Client::new());
        let state = Arc::new(ResolveState::new(Instant::now() + SOFT_RESOLUTION_TIMEOUT));
        let key = cache_key("Example.Package", "1.0.0");

        let node = resolve(
            client,
            state,
            "Example.Package".into(),
            "1.0.0".into(),
            1,
            vec![key],
        )
        .await;

        assert!(node.truncated);
        assert_eq!(node.error.as_deref(), Some("circular dependency detected"));
    }

    #[tokio::test]
    async fn resolve_truncates_when_node_budget_is_exhausted() {
        let client = Arc::new(reqwest::Client::new());
        let state = Arc::new(ResolveState::new(Instant::now() + SOFT_RESOLUTION_TIMEOUT));
        state.nodes.store(MAX_NODES, Ordering::Relaxed);

        let node = resolve(
            client,
            state,
            "Example.Package".into(),
            "1.0.0".into(),
            0,
            Vec::new(),
        )
        .await;

        assert!(node.truncated);
        assert_eq!(node.error.as_deref(), Some("node limit reached"));
    }

    #[tokio::test]
    async fn resolve_truncates_when_time_budget_is_exhausted() {
        let client = Arc::new(reqwest::Client::new());
        let state = Arc::new(ResolveState::new(Instant::now()));

        let node = resolve(
            client,
            state,
            "Example.Package".into(),
            "1.0.0".into(),
            0,
            Vec::new(),
        )
        .await;

        assert!(node.truncated);
        assert_eq!(node.error.as_deref(), Some(TIME_LIMIT_REACHED));
    }
}
