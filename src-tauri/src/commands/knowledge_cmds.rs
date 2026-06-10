// Placeholder for p2-knowledge commands
#[tauri::command]
pub async fn import_file() -> Result<String, String> {
    Err("Knowledge base not available (p2-knowledge feature disabled)".into())
}

#[tauri::command]
pub async fn search_knowledge() -> Result<String, String> {
    Err("Knowledge base not available (p2-knowledge feature disabled)".into())
}

#[tauri::command]
pub async fn list_knowledge_files() -> Result<String, String> {
    Err("Knowledge base not available (p2-knowledge feature disabled)".into())
}

#[tauri::command]
pub async fn delete_knowledge_file() -> Result<String, String> {
    Err("Knowledge base not available (p2-knowledge feature disabled)".into())
}
