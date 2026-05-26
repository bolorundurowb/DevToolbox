mod commands;

#[cfg(target_os = "macos")]
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            // Image commands
            commands::convert_image,
            commands::crop_image,
            commands::get_image_info,
            // Crypto commands
            commands::hash_text,
            commands::hash_file,
            commands::compute_hmac,
            commands::bcrypt_hash,
            commands::bcrypt_verify,
            commands::get_display_name,
            commands::get_system_info,
            // .NET tools
            commands::inspect_dll,
            commands::nuget_dependency_tree,
        ])
        .setup(|_app| {
            // macOS: restore window appearance after transparent titlebar
            #[cfg(target_os = "macos")]
            {
                let window = _app.get_webview_window("main").unwrap();
                window.set_title("Dev Core Tools")?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
