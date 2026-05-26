use serde::{Deserialize, Serialize};
use tauri::command;

const MAX_DEPTH: u32 = 25;

// ─── Public result types ──────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
pub struct DepNode {
    pub id:         String,
    pub version:    String,
    pub frameworks: Vec<FrameworkGroup>,
    /// true when this node was not expanded because the depth cap was reached
    pub truncated:  bool,
    /// non-empty if we could not fetch this package (network error, not found, etc.)
    pub error:      Option<String>,
}

#[derive(Serialize, Clone)]
pub struct FrameworkGroup {
    pub framework:    String,
    pub dependencies: Vec<DepNode>,
}

// ─── NuGet V3 API response shapes ────────────────────────────────────────────

/// In the registration5-semver1 leaf endpoint, "catalogEntry" is a URL string,
/// not an inline object.  We fetch it separately in a second request.
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

// ─── Tauri command ────────────────────────────────────────────────────────────

#[command]
pub async fn nuget_dependency_tree(
    package: String,
    version: String,
) -> Result<DepNode, String> {
    let client = reqwest::Client::builder()
        .user_agent("dev-core-tools/1.0")
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let mut path: Vec<String> = Vec::new();
    let node = resolve(&client, &package, &version, 0, &mut path).await;
    Ok(node)
}

// ─── Recursive resolver ───────────────────────────────────────────────────────

async fn resolve(
    client:  &reqwest::Client,
    id:      &str,
    version: &str,
    depth:   u32,
    path:    &mut Vec<String>,   // IDs (lowercase) already on the current DFS path
) -> DepNode {
    let key = id.to_lowercase();

    // Depth cap
    if depth >= MAX_DEPTH {
        return DepNode {
            id:        id.to_string(),
            version:   version.to_string(),
            frameworks: vec![],
            truncated: true,
            error:     None,
        };
    }

    // Cycle guard: if this package is already on the current path, stop here
    if path.contains(&key) {
        return DepNode {
            id:        id.to_string(),
            version:   version.to_string(),
            frameworks: vec![],
            truncated: true,
            error:     Some("circular dependency detected".to_string()),
        };
    }

    path.push(key.clone());

    let result = match fetch_catalog_entry(client, id, version).await {
        Err(e) => DepNode {
            id:        id.to_string(),
            version:   version.to_string(),
            frameworks: vec![],
            truncated: false,
            error:     Some(e),
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
                    let dep_version = min_version_from_range(&dep.range)
                        .unwrap_or_else(|| dep.range.clone());
                    if dep_version.is_empty() { continue; }
                    let child = Box::pin(resolve(
                        client,
                        &dep.id,
                        &dep_version,
                        depth + 1,
                        path,
                    )).await;
                    deps.push(child);
                }
                frameworks.push(FrameworkGroup { framework: tf, dependencies: deps });
            }

            DepNode {
                id:        entry.id,
                version:   resolved_version,
                frameworks,
                truncated: false,
                error:     None,
            }
        }
    };

    path.pop();
    result
}

// ─── NuGet registration leaf fetch ───────────────────────────────────────────

async fn fetch_catalog_entry(
    client:  &reqwest::Client,
    id:      &str,
    version: &str,
) -> Result<CatalogEntry, String> {
    let id_lower      = id.to_lowercase();
    let version_lower = version.to_lowercase();
    let url = format!(
        "https://api.nuget.org/v3/registration5-semver1/{id_lower}/{version_lower}.json"
    );

    let resp = client.get(&url).send().await.map_err(|e| format!("Network error: {e}"))?;

    if resp.status() == 404 {
        // Fall back to the index to find the nearest matching version
        return fetch_from_index(client, id, version).await;
    }

    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }

    // catalogEntry is a URL string in the leaf — fetch the actual catalog document
    let leaf: RegistrationLeaf = resp.json().await
        .map_err(|e| format!("Failed to parse leaf: {e}"))?;

    let catalog_resp = client.get(&leaf.catalog_entry).send().await
        .map_err(|e| format!("Failed to fetch catalog entry: {e}"))?;

    if !catalog_resp.status().is_success() {
        return Err(format!("Catalog entry HTTP {}", catalog_resp.status()));
    }

    let entry: CatalogEntry = catalog_resp.json().await
        .map_err(|e| format!("Failed to parse catalog entry: {e}"))?;

    Ok(entry)
}

/// When the exact version leaf isn't found, search the registration index
/// for the closest version ≥ the requested version.
async fn fetch_from_index(
    client:  &reqwest::Client,
    id:      &str,
    version: &str,
) -> Result<CatalogEntry, String> {
    let id_lower = id.to_lowercase();
    let url = format!("https://api.nuget.org/v3/registration5-semver1/{id_lower}/index.json");

    let resp = client.get(&url).send().await.map_err(|e| format!("Network error: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("Package '{id}' not found (HTTP {})", resp.status()));
    }

    // Parse index; look through inline items for a matching catalogEntry
    let index: serde_json::Value = resp.json().await
        .map_err(|e| format!("Failed to parse index: {e}"))?;

    let pages = index["items"].as_array()
        .ok_or_else(|| format!("Unexpected index format for '{id}'"))?;

    for page in pages {
        if let Some(items) = page["items"].as_array() {
            for item in items {
                let entry = &item["catalogEntry"];
                let v = entry["version"].as_str().unwrap_or("");
                if versions_match(v, version) {
                    let ce: CatalogEntry = serde_json::from_value(entry.clone())
                        .map_err(|e| format!("Parse error: {e}"))?;
                    return Ok(ce);
                }
            }
        }
    }

    // Last resort: return metadata with no dependencies
    Err(format!("Version '{version}' of '{id}' not found in registry"))
}

/// Very lenient version match: normalise and compare. Handles "1.0.0" == "1.0.0.0" etc.
fn versions_match(a: &str, b: &str) -> bool {
    normalise_ver(a) == normalise_ver(b)
}

fn normalise_ver(v: &str) -> String {
    let parts: Vec<u64> = v.split('.').map(|p| p.parse().unwrap_or(0)).collect();
    let a = *parts.first().unwrap_or(&0);
    let b = *parts.get(1).unwrap_or(&0);
    let c = *parts.get(2).unwrap_or(&0);
    let d = *parts.get(3).unwrap_or(&0);
    format!("{a}.{b}.{c}.{d}")
}

// ─── Version range parser ─────────────────────────────────────────────────────

/// Extract the minimum (lower-bound) version from a NuGet version range string.
/// Returns None if the range is empty or cannot be parsed.
///
/// Examples handled:
///   "1.0.0"          → Some("1.0.0")
///   "[1.0.0, )"      → Some("1.0.0")
///   "[1.0.0, 2.0.0)" → Some("1.0.0")
///   "[1.0.0]"        → Some("1.0.0")
///   "(1.0.0, )"      → Some("1.0.0")  (exclusive lower bound, still usable)
///   "*"              → None
pub fn min_version_from_range(range: &str) -> Option<String> {
    let r = range.trim();
    if r.is_empty() || r == "*" { return None; }

    if r.starts_with('[') || r.starts_with('(') {
        let inner = &r[1..];
        let end = inner.find([',', ']', ')']).unwrap_or(inner.len());
        let v = inner[..end].trim();
        if v.is_empty() { return None; }
        return Some(v.to_string());
    }

    Some(r.to_string())
}
