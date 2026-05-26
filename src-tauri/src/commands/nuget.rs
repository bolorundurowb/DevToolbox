use futures::future::join_all;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::command;

const MAX_DEPTH: u32 = 25;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);

#[derive(Serialize, Clone)]
pub struct DepNode {
    pub id:         String,
    pub version:    String,
    pub frameworks: Vec<FrameworkGroup>,
    pub truncated:  bool,
    pub error:      Option<String>,
}

#[derive(Serialize, Clone)]
pub struct FrameworkGroup {
    pub framework:    String,
    pub dependencies: Vec<DepNode>,
}

#[derive(Deserialize)]
struct RegistrationLeaf {
    #[serde(rename = "catalogEntry")]
    catalog_entry: String,
}

#[derive(Deserialize)]
struct CatalogEntry {
    id:      String,
    version: String,
    #[serde(rename = "dependencyGroups", default)]
    dependency_groups: Vec<DepGroup>,
}

#[derive(Deserialize)]
struct DepGroup {
    #[serde(rename = "targetFramework", default)]
    target_framework: String,
    #[serde(default)]
    dependencies: Vec<DepRef>,
}

#[derive(Deserialize)]
struct DepRef {
    id:    String,
    #[serde(default)]
    range: String,
}

#[command]
pub async fn nuget_dependency_tree(
    package: String,
    version: String,
) -> Result<DepNode, String> {
    let client = reqwest::Client::builder()
        .user_agent("dev-core-tools/1.0")
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    Ok(resolve(&client, &package, &version, 0, &[]).await)
}

// Recursive resolver. `path` is a slice of package IDs already on the current
// branch (cycle detection). Each call clones path + new entry for children.
fn resolve<'a>(
    client:  &'a reqwest::Client,
    id:      &'a str,
    version: &'a str,
    depth:   u32,
    path:    &'a [String],
) -> futures::future::BoxFuture<'a, DepNode> {
    Box::pin(async move {
        let key = id.to_lowercase();

        if depth >= MAX_DEPTH {
            return DepNode { id: id.into(), version: version.into(),
                frameworks: vec![], truncated: true, error: None };
        }
        if path.iter().any(|p| p == &key) {
            return DepNode { id: id.into(), version: version.into(),
                frameworks: vec![], truncated: true,
                error: Some("circular dependency detected".into()) };
        }

        let mut child_path: Vec<String> = path.to_vec();
        child_path.push(key);

        match fetch_catalog_entry(client, id, version).await {
            Err(e) => DepNode { id: id.into(), version: version.into(),
                frameworks: vec![], truncated: false, error: Some(e) },

            Ok(entry) => {
                let mut frameworks = Vec::new();

                for group in entry.dependency_groups {
                    let tf = if group.target_framework.is_empty() {
                        "any".to_string()
                    } else {
                        group.target_framework
                    };

                    // Resolve all deps in this framework group concurrently.
                    let futures: Vec<_> = group.dependencies
                        .into_iter()
                        .filter_map(|dep| {
                            min_version_from_range(&dep.range)
                                .map(|v| (dep.id, v))
                        })
                        .map(|(dep_id, dep_ver)| {
                            let cp = child_path.clone();
                            async move {
                                resolve(client, &dep_id, &dep_ver, depth + 1, &cp).await
                            }
                        })
                        .collect();

                    let deps = join_all(futures).await;
                    frameworks.push(FrameworkGroup { framework: tf, dependencies: deps });
                }

                DepNode { id: entry.id, version: entry.version,
                    frameworks, truncated: false, error: None }
            }
        }
    })
}

// The registration leaf endpoint returns `catalogEntry` as a URL string.
// Two requests are always required: leaf → catalog entry.
// Falls back to an index scan when the exact-version leaf returns 404.
async fn fetch_catalog_entry(
    client:  &reqwest::Client,
    id:      &str,
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
        if resp.status() == 404 { continue; }
        if !resp.status().is_success() { return Err(format!("HTTP {}", resp.status())); }

        let leaf: RegistrationLeaf = resp.json().await
            .map_err(|e| format!("Failed to parse leaf: {e}"))?;
        return fetch_catalog_url(client, &leaf.catalog_entry).await;
    }

    fetch_from_index(client, id, version).await
}

async fn fetch_catalog_url(client: &reqwest::Client, url: &str) -> Result<CatalogEntry, String> {
    let resp = client.get(url).send().await
        .map_err(|e| format!("Failed to fetch catalog entry: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("Catalog entry HTTP {}", resp.status()));
    }
    resp.json().await.map_err(|e| format!("Failed to parse catalog entry: {e}"))
}

// Index fallback: handles paginated pages and URL-based catalogEntry fields.
// Uses page lower/upper bounds to skip pages that cannot contain the target version.
async fn fetch_from_index(
    client:  &reqwest::Client,
    id:      &str,
    version: &str,
) -> Result<CatalogEntry, String> {
    let id_lower = id.to_lowercase();

    for base in &["registration5-semver1", "registration5-semver2"] {
        let url = format!("https://api.nuget.org/v3/{base}/{id_lower}/index.json");
        let resp = match client.get(&url).send().await {
            Ok(r) if r.status().is_success() => r,
            Ok(r) => return Err(format!("Package '{id}' not found (HTTP {})", r.status())),
            Err(e) => return Err(format!("Network error: {e}")),
        };

        let index: serde_json::Value = resp.json().await
            .map_err(|e| format!("Failed to parse index: {e}"))?;

        let pages = match index["items"].as_array() {
            Some(p) => p.clone(),
            None => continue,
        };

        for page in &pages {
            // Skip pages whose version range excludes the target.
            let lower = page["lower"].as_str().unwrap_or("");
            let upper = page["upper"].as_str().unwrap_or("");
            if !lower.is_empty() && !upper.is_empty()
                && !version_in_range(version, lower, upper)
            {
                continue;
            }

            // Pages may be inline (have "items") or paginated (only an "@id" URL).
            let items: Vec<serde_json::Value> = if let Some(inline) = page["items"].as_array() {
                inline.clone()
            } else if let Some(page_url) = page["@id"].as_str() {
                let pr = match client.get(page_url).send().await {
                    Ok(r) if r.status().is_success() => r,
                    _ => continue,
                };
                match pr.json::<serde_json::Value>().await {
                    Ok(d) => d["items"].as_array().cloned().unwrap_or_default(),
                    Err(_) => continue,
                }
            } else {
                continue
            };

            for item in &items {
                // Version lives in the leaf @id URL: ".../id/1.2.3.json"
                let item_ver = item["@id"].as_str()
                    .and_then(|s| s.strip_suffix(".json"))
                    .and_then(|s| s.rsplit('/').next())
                    .unwrap_or("");

                if !versions_match(item_ver, version) { continue; }

                let ce_url = match item["catalogEntry"].as_str() {
                    Some(u) => u,
                    None => continue,
                };
                return fetch_catalog_url(client, ce_url).await;
            }
        }
    }

    Err(format!("Version '{version}' of '{id}' not found in registry"))
}

fn version_in_range(version: &str, lower: &str, upper: &str) -> bool {
    let v = ver_tuple(version);
    v >= ver_tuple(lower) && v <= ver_tuple(upper)
}

fn versions_match(a: &str, b: &str) -> bool {
    ver_tuple(a) == ver_tuple(b)
}

fn ver_tuple(v: &str) -> (u64, u64, u64, u64) {
    let mut parts = v.split('.')
        .map(|p| p.split(['-', '+']).next().unwrap_or("").parse::<u64>().unwrap_or(0));
    (
        parts.next().unwrap_or(0),
        parts.next().unwrap_or(0),
        parts.next().unwrap_or(0),
        parts.next().unwrap_or(0),
    )
}

pub fn min_version_from_range(range: &str) -> Option<String> {
    let r = range.trim();
    if r.is_empty() || r == "*" { return None; }
    if r.starts_with('[') || r.starts_with('(') {
        let inner = &r[1..];
        let end = inner.find([',', ']', ')']).unwrap_or(inner.len());
        let v = inner[..end].trim();
        return if v.is_empty() { None } else { Some(v.to_string()) };
    }
    Some(r.to_string())
}
