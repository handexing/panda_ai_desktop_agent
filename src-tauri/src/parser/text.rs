use std::fs;
use std::path::Path;

/// Extract plain text from a file. Supports TXT, MD, and PDF.
pub fn extract_text(file_path: &str) -> Result<String, String> {
    let path = Path::new(file_path);
    let ext = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "txt" | "md" | "markdown" => extract_plain_text(file_path),
        "pdf" => extract_pdf_text(file_path),
        _ => Err(format!("Unsupported file type: .{}", ext)),
    }
}

fn extract_plain_text(file_path: &str) -> Result<String, String> {
    fs::read_to_string(file_path).map_err(|e| format!("Failed to read file: {}", e))
}

fn extract_pdf_text(file_path: &str) -> Result<String, String> {
    let bytes = fs::read(file_path).map_err(|e| format!("Failed to read PDF: {}", e))?;
    let text = pdf_extract::extract_text_from_mem(&bytes)
        .map_err(|e| format!("Failed to extract PDF text: {}", e))?;
    Ok(text)
}
