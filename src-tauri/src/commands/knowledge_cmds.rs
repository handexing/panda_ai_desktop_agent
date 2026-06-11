use tauri::{AppHandle, State};
use serde::Serialize;
use crate::db::DbPool;
use crate::db::repository;
use crate::lancedb::store::KnowledgeStore;
use crate::lancedb::splitter::TextSplitter;
use crate::lancedb::embedding;

#[derive(Serialize)]
pub struct KnowledgeFile {
    pub file_name: String,
    pub chunk_count: usize,
}

#[tauri::command]
pub async fn import_file(
    app: AppHandle,
    pool: State<'_, DbPool>,
    file_path: String,
) -> Result<KnowledgeFile, String> {
    // 1. Extract text
    let text = crate::parser::text::extract_text(&file_path)
        .map_err(|e| format!("Failed to extract text: {}", e))?;
    let file_name = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    // 2. Load embedding config
    let base_url = repository::get_setting(&pool, "embedding_base_url")?
        .unwrap_or_else(|| repository::get_setting(&pool, "llm_base_url").unwrap_or_default().unwrap_or_default());
    let api_key = repository::get_setting(&pool, "embedding_api_key")?
        .unwrap_or_else(|| repository::get_setting(&pool, "llm_api_key").unwrap_or_default().unwrap_or_default());
    let model = repository::get_setting(&pool, "embedding_model")?
        .unwrap_or_else(|| "text-embedding-ada-002".into());

    if base_url.is_empty() || api_key.is_empty() {
        return Err("Embedding API 未配置，请在设置中配置 Embedding API".into());
    }

    // 3. Split text
    let splitter = TextSplitter::default();
    let chunks = splitter.split(&text);

    if chunks.is_empty() {
        return Err("文件内容为空".into());
    }

    // 4. Generate embeddings in batch
    let chunk_refs: Vec<&str> = chunks.iter().map(|c| c.as_str()).collect();
    let embeddings = embedding::generate_embeddings(&base_url, &api_key, &model, &chunk_refs)
        .await
        .map_err(|e| format!("Embedding failed: {}", e))?;

    // 5. Store in LanceDB
    let lancedb_path = crate::lancedb::get_lancedb_path(&app);
    let store = KnowledgeStore::open(&lancedb_path)
        .await
        .map_err(|e| format!("Failed to open LanceDB: {}", e))?;

    let knowledge_chunks: Vec<_> = chunks.iter().enumerate().map(|(i, text)| {
        crate::lancedb::store::Chunk {
            file_name: file_name.clone(),
            chunk_index: i as i32,
            text: text.clone(),
            embedding: embeddings[i].clone(),
        }
    }).collect();

    let chunk_count = knowledge_chunks.len();
    store.insert_chunks(&knowledge_chunks)
        .await
        .map_err(|e| format!("Failed to store chunks: {}", e))?;

    Ok(KnowledgeFile { file_name, chunk_count })
}

#[derive(Serialize)]
pub struct SearchResult {
    pub text: String,
    pub file_name: String,
    pub score: f32,
}

#[tauri::command]
pub async fn search_knowledge(
    app: AppHandle,
    pool: State<'_, DbPool>,
    query: String,
    top_k: Option<usize>,
) -> Result<Vec<SearchResult>, String> {
    let base_url = repository::get_setting(&pool, "embedding_base_url")?
        .unwrap_or_else(|| repository::get_setting(&pool, "llm_base_url").unwrap_or_default().unwrap_or_default());
    let api_key = repository::get_setting(&pool, "embedding_api_key")?
        .unwrap_or_else(|| repository::get_setting(&pool, "llm_api_key").unwrap_or_default().unwrap_or_default());
    let model = repository::get_setting(&pool, "embedding_model")?
        .unwrap_or_else(|| "text-embedding-ada-002".into());

    // 1. Generate query embedding
    let embedding_vec = embedding::generate_embedding(&base_url, &api_key, &model, &query)
        .await
        .map_err(|e| format!("Embedding failed: {}", e))?;

    // 2. Search LanceDB
    let lancedb_path = crate::lancedb::get_lancedb_path(&app);
    let store = KnowledgeStore::open(&lancedb_path)
        .await
        .map_err(|e| format!("Failed to open LanceDB: {}", e))?;

    let results = store.search(&embedding_vec, top_k.unwrap_or(5))
        .await
        .map_err(|e| format!("Search failed: {}", e))?;

    Ok(results.into_iter().map(|c| SearchResult {
        text: c.text,
        file_name: c.file_name,
        score: 0.0,
    }).collect())
}

#[tauri::command]
pub async fn list_knowledge_files(
    app: AppHandle,
    _pool: State<'_, DbPool>,
) -> Result<Vec<KnowledgeFile>, String> {
    let lancedb_path = crate::lancedb::get_lancedb_path(&app);
    let store = KnowledgeStore::open(&lancedb_path)
        .await
        .map_err(|e| format!("Failed to open LanceDB: {}", e))?;

    let files = store.list_files()
        .await
        .map_err(|e| format!("Failed to list files: {}", e))?;

    Ok(files.into_iter().map(|name| KnowledgeFile {
        file_name: name,
        chunk_count: 0,
    }).collect())
}

#[tauri::command]
pub async fn delete_knowledge_file(
    app: AppHandle,
    _pool: State<'_, DbPool>,
    file_name: String,
) -> Result<(), String> {
    let lancedb_path = crate::lancedb::get_lancedb_path(&app);
    let store = KnowledgeStore::open(&lancedb_path)
        .await
        .map_err(|e| format!("Failed to open LanceDB: {}", e))?;

    store.delete_file(&file_name)
        .await
        .map_err(|e| format!("Failed to delete: {}", e))?;
    Ok(())
}
