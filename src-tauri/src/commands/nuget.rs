use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::command;

const MAX_DEPTH: u32 = 25;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(20);

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

    let mut path: Vec<String> = Vec::new();
    let node = resolve(&client, &package, &version, 0, &mut path).await;
    Ok(node)
}

async fn resolve(
    client:  &reqwest::Client,
    id:      &str,
    version: &str,
    depth:   u32,
    path:    &mut Vec<String>,
) -> DepNode {
    let key = id.to_lowercase();

    if depth >= MAX_DEPTH {
        return DepNode {
            id: id.to_string(), version: version.to_string(),
            frameworks: vec![], truncated: true, error: None,
        };
    }

    if path.contains(&key) {
        return DepNode {
            id: id.to_string(), version: version.to_string(),
            frameworks: vec![], truncated: true,
            error: Some("circular dependency detected".to_string()),
        };
    }

    path.push(key.clone());

    let result = match fetch_catalog_entry(client, id, version).await {
        Err(e) => DepNode {
            id: id.to_string(), version: version.to_string(),
            frameworks: vec![], truncated: false, error: Some(e),
        },
        Ok(entry) => {
            let resolved_version = entry.version.clone();
            let mut frameworks = Vec::new();

            for group in entry.dependency_groups {
                let tf = if group.target_framework.is_empty() {
                    "any".to_string()
                } else {
                    group.target_framework.clone()
                };

                let mut deps = Vec::new();
                for dep in group.dependencies {
                    let dep_version = match min_version_from_range(&dep.range) {
                        Some(v) => v,
                        None => continue,
                    };
                    let child = Box::pin(resolve(client, &dep.id, &dep_version, depth + 1, path)).await;
                    deps.push(child);
                }
                frameworks.push(FrameworkGroup { framework: tf, dependencies: deps });
            }

            DepNode {
                id: entry.id, version: resolved_version,
                frameworks, truncated: false, error: None,
            }
        }
    };

    path.pop();
    result
}

// Fetch the catalog entry for a specific package version.
// The NuGet registration leaf endpoint returns `catalogEntry` as a URL string,
// so two HTTP requests are always needed: leaf → catalog entry.
// Falls back to the registration index when the exact-version leaf returns 404.
async fn fetch_catalog_entry(
    client:  &reqwest::Client,
    id:      &str,
    version: &str,
) -> Result<CatalogEntry, String> {
    let id_lower      = id.to_lowercase();
    let version_lower = version.to_lowercase();

    // Try semver1 leaf first, then semver2 leaf, then fall back to index scan.
    for base in &["registration5-semver1", "registration5-semver2"] {
        let url = format!("https://api.nuget.org/v3/{base}/{id_lower}/{version_lower}.json");
        let resp = match client.get(&url).send().await {
            Ok(r) => r,
            Err(_) => continue,
        };
        if resp.status() == 404 { continue; }
        if !resp.status().is_success() {
            return Err(format!("HTTP {}", resp.status()));
        }
        let leaf: RegistrationLeaf = resp.json().await
            .map_err(|e| format!("Failed to parse leaf: {e}"))?;
        return fetch_catalog_from_url(client, &leaf.catalog_entry).await;
    }

    fetch_from_index(client, id, version).await
}

async fn fetch_catalog_from_url(client: &reqwest::Client, url: &str) -> Result<CatalogEntry, String> {
    let resp = client.get(url).send().await
        .map_err(|e| format!("Failed to fetch catalog entry: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("Catalog entry HTTP {}", resp.status()));
    }
    resp.json().await.map_err(|e| format!("Failed to parse catalog entry: {e}"))
}

// Fall back to scanning the registration index when the exact-version leaf is unavailable.
// Handles both paginated indexes (pages referenced by URL) and inline items.
// Each item's `catalogEntry` field is always a URL string — never an inline object.
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
            _ => continue,
        };

        let index: serde_json::Value = resp.json().await
            .map_err(|e| format!("Failed to parse index: {e}"))?;

        let pages = match index["items"].as_array() {
            Some(p) => p.clone(),
            None => continue,
        };

        for page in &pages {
            // Pages may be inline (have an "items" array) or paginated (only an "@id" URL).
            let items: Vec<serde_json::Value> = if let Some(inline) = page["items"].as_array() {
                inline.clone()
            } else if let Some(page_url) = page["@id"].as_str() {
                let page_resp = match client.get(page_url).send().await {
                    Ok(r) if r.status().is_success() => r,
                    _ => continue,
                };
                let page_data: serde_json::Value = match page_resp.json().await {
                    Ok(d) => d,
                    Err(_) => continue,
                };
                match page_data["items"].as_array() {
                    Some(a) => a.clone(),
                    None => continue,
                }
            } else {
                continue
            };

            for item in &items {
                // Extract version from the item's @id leaf URL path (e.g. ".../1.2.3.json").
                let item_ver = item["@id"].as_str()
                    .and_then(|s| s.strip_suffix(".json"))
                    .and_then(|s| s.rsplit('/').next())
                    .unwrap_or("");

                if !versions_match(item_ver, version) { continue; }

                let ce_url = match item["catalogEntry"].as_str() {
                    Some(u) => u,
                    None => continue,
                };
                return fetch_catalog_from_url(client, ce_url).await;
            }
        }
    }

    Err(format!("Version '{version}' of '{id}' not found in registry"))
}

fn versions_match(a: &str, b: &str) -> bool {
    normalise_ver(a) == normalise_ver(b)
}

fn normalise_ver(v: &str) -> String {
    // Strip any pre-release suffix before parsing each component.
    let parts: Vec<u64> = v.split('.')
        .map(|p| p.split(['-', '+']).next().unwrap_or("").parse().unwrap_or(0))
        .collect();
    format!("{}.{}.{}.{}",
        parts.first().unwrap_or(&0),
        parts.get(1).unwrap_or(&0),
        parts.get(2).unwrap_or(&0),
        parts.get(3).unwrap_or(&0),
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
