use tauri::State;
use crate::db::DbPool;
use crate::db::repository;

#[tauri::command]
pub fn check_first_run(pool: State<'_, DbPool>) -> Result<bool, String> {
    let configured = repository::get_setting(&pool, "llm_api_key")?;
    Ok(configured.is_none() || configured.as_deref() == Some(""))
}

#[tauri::command]
pub async fn collapse_window(window: tauri::Window) -> Result<(), String> {
    window.set_size(tauri::LogicalSize::new(220, 220))
        .map_err(|e| e.to_string())?;
    window.center().map_err(|e| e.to_string())?;
    Ok(())
}
