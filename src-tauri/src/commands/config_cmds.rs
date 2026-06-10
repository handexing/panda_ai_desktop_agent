use tauri::State;
use crate::db::{DbPool, repository};

#[tauri::command]
pub fn get_config(pool: State<'_, DbPool>, key: String) -> Result<Option<String>, String> {
    repository::get_setting(&pool, &key)
}

#[tauri::command]
pub fn set_config(pool: State<'_, DbPool>, key: String, value: String) -> Result<(), String> {
    repository::set_setting(&pool, &key, &value)
}

#[tauri::command]
pub async fn test_api_connection(
    base_url: String,
    api_key: String,
    model: String,
) -> Result<bool, String> {
    crate::api::client::test_connection(&base_url, &api_key, &model).await
}
