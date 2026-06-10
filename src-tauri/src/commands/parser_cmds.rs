#[tauri::command]
pub fn extract_file_text(file_path: String) -> Result<String, String> {
    crate::parser::text::extract_text(&file_path)
}
