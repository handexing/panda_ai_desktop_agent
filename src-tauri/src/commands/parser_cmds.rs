#[tauri::command]
pub fn extract_file_text(file_path: String) -> Result<String, String> {
    crate::parser::text::extract_text(&file_path)
}

#[tauri::command]
pub fn image_to_base64(file_path: String) -> Result<String, String> {
    let data = std::fs::read(&file_path).map_err(|e| format!("Failed to read image: {}", e))?;
    let ext = std::path::Path::new(&file_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        _ => "image/png",
    };
    use base64::Engine;
    Ok(format!("data:{};base64,{}", mime, base64::engine::general_purpose::STANDARD.encode(data)))
}
