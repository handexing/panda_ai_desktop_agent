pub mod embedding;
pub mod splitter;
pub mod store;

use tauri::Manager;

/// Resolve the LanceDB database path relative to the app data directory.
pub fn get_lancedb_path(app: &tauri::AppHandle) -> String {
    let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
    let lancedb_dir = app_dir.join("panda_lancedb");
    lancedb_dir.to_str().unwrap().to_string()
}
