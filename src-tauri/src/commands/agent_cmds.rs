// Agent commands - placeholder stubs, will be implemented in subsequent tasks

#[tauri::command]
pub async fn stream_agent_chat() -> Result<(), String> {
    Err("not implemented".into())
}

#[tauri::command]
pub async fn tts_speak() -> Result<(), String> {
    Err("not implemented".into())
}

#[tauri::command]
pub async fn list_mcp_servers() -> Result<(), String> {
    Err("not implemented".into())
}

#[tauri::command]
pub async fn add_mcp_server() -> Result<(), String> {
    Err("not implemented".into())
}

#[tauri::command]
pub async fn delete_mcp_server() -> Result<(), String> {
    Err("not implemented".into())
}
