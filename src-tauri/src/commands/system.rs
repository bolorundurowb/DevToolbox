use tauri::command;
use serde::Serialize;

#[derive(Serialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
}

fn format_display_name(raw: &str) -> Option<String> {
    let cleaned = raw
        .trim()
        .replace(['.', '_', '-'], " ")
        .split_whitespace()
        .map(|part| {
            let mut chars = part.chars();
            match chars.next() {
                Some(first) => format!("{}{}", first.to_uppercase(), chars.as_str().to_lowercase()),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ");

    if cleaned.is_empty() || cleaned.eq_ignore_ascii_case("user") {
        None
    } else {
        Some(cleaned)
    }
}

#[command]
pub fn get_display_name() -> Option<String> {
    ["FULLNAME", "USERNAME", "USER", "LOGNAME"]
        .iter()
        .filter_map(|key| std::env::var(key).ok())
        .find_map(|value| format_display_name(&value))
}

#[command]
pub fn get_system_info() -> SystemInfo {
    SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    }
}
