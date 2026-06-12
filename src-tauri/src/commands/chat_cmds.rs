use tauri::{AppHandle, Emitter, State, Manager};
use serde::Serialize;
use crate::db::{DbPool, repository, models};
use crate::api::client::{self, ChatHistory};

#[tauri::command]
pub fn list_conversations(pool: State<'_, DbPool>) -> Result<Vec<models::Conversation>, String> {
    repository::list_conversations(&pool)
}

#[tauri::command]
pub fn create_conversation(pool: State<'_, DbPool>, title: String) -> Result<models::Conversation, String> {
    repository::create_conversation(&pool, &title)
}

#[tauri::command]
pub fn get_messages(pool: State<'_, DbPool>, conversation_id: String) -> Result<Vec<models::Message>, String> {
    repository::get_messages(&pool, &conversation_id)
}

#[tauri::command]
pub fn delete_conversation(pool: State<'_, DbPool>, id: String) -> Result<(), String> {
    repository::delete_conversation_and_messages(&pool, &id)
}

#[derive(Serialize, Clone)]
pub struct TokenPayload {
    pub conversation_id: String,
    pub token: String,
}

#[derive(Serialize, Clone)]
pub struct DonePayload {
    pub conversation_id: String,
}

#[derive(Serialize, Clone)]
pub struct ErrorPayload {
    pub conversation_id: String,
    pub message: String,
}

#[tauri::command]
pub async fn stream_chat(
    app: AppHandle,
    pool: State<'_, DbPool>,
    conversation_id: String,
    message: String,
) -> Result<(), String> {
    // 1. Save user message
    repository::add_message(&pool, &conversation_id, "user", &message)?;
    repository::update_conversation_time(&pool, &conversation_id)?;

    // 2. Load config
    let base_url = repository::get_setting(&pool, "llm_base_url")?.unwrap_or_default();
    let api_key = repository::get_setting(&pool, "llm_api_key")?.unwrap_or_default();
    let model = repository::get_setting(&pool, "llm_model")?.unwrap_or_default();

    if base_url.is_empty() || api_key.is_empty() {
        let _ = app.emit("chat:error", ErrorPayload {
            conversation_id: conversation_id.clone(),
            message: "API 未配置，请在设置中输入 API Key 和 Base URL".into(),
        });
        return Err("API not configured".into());
    }

    // 3. Load conversation history (last 20 messages)
    let history_messages = repository::get_messages(&pool, &conversation_id)?;
    let history: Vec<ChatHistory> = history_messages
        .iter()
        .map(|m| ChatHistory {
            role: m.role.clone(),
            content: m.content.clone(),
        })
        .collect();

    // 4. Build system prompt with optional knowledge context
    let system_prompt = {
        let mut prompt = String::from("你是一只叫 Panda 的 AI 助手，住在用户的桌面上。请用友好的语气回答问题。");

        #[cfg(feature = "p2-knowledge")]
        {
            let enabled = repository::get_setting(&pool, "knowledge_base_enabled")
                .unwrap_or(Some("false".into()))
                .unwrap_or_default();
            if enabled == "true" {
                let emb_base_url = repository::get_setting(&pool, "embedding_base_url")
                    .unwrap_or_default()
                    .or_else(|| repository::get_setting(&pool, "llm_base_url").ok().flatten())
                    .unwrap_or_default();
                let emb_api_key = repository::get_setting(&pool, "embedding_api_key")
                    .unwrap_or_default()
                    .or_else(|| repository::get_setting(&pool, "llm_api_key").ok().flatten())
                    .unwrap_or_default();
                let emb_model = repository::get_setting(&pool, "embedding_model")
                    .unwrap_or_default()
                    .unwrap_or_else(|| "text-embedding-ada-002".into());

                if !emb_base_url.is_empty() && !emb_api_key.is_empty() {
                    if let Ok(embedding_vec) = crate::lancedb::embedding::generate_embedding(
                        &emb_base_url, &emb_api_key, &emb_model, &message
                    ).await {
                        let db_path = crate::lancedb::get_lancedb_path(&app);
                        if let Ok(store) = crate::lancedb::store::KnowledgeStore::open(&db_path).await {
                            if let Ok(results) = store.search(&embedding_vec, 5).await {
                                if !results.is_empty() {
                                    prompt.push_str("\n\n以下是相关知识库内容，请基于这些信息回答问题：\n\n");
                                    for (i, chunk) in results.iter().enumerate() {
                                        prompt.push_str(&format!("[{}.] {}\n", i + 1, chunk.text));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        prompt
    };

    // 5. Stream the chat completion
    let conv_id = conversation_id.clone();
    let app_clone = app.clone();
    let result = client::stream_chat_completion(
        &base_url,
        &api_key,
        &model,
        &system_prompt,
        &history,
        &message,
        |token| {
            let _ = app_clone.emit("chat:token", TokenPayload {
                conversation_id: conv_id.clone(),
                token,
            });
        },
    ).await;

    match result {
        Ok(full_text) => {
            let _ = app.emit("chat:done", DonePayload {
                conversation_id: conversation_id.clone(),
            });
            if let Err(e) = repository::add_message(&pool, &conversation_id, "assistant", &full_text) {
                log::error!("Failed to save assistant message: {}", e);
            }
            let _ = repository::update_conversation_time(&pool, &conversation_id);
            Ok(())
        }
        Err(e) => {
            let _ = app.emit("chat:error", ErrorPayload {
                conversation_id: conversation_id.clone(),
                message: e.clone(),
            });
            Err(e)
        }
    }
}

#[tauri::command]
#[cfg(feature = "p2-knowledge")]
pub async fn stream_multimodal_chat(
    app: AppHandle,
    pool: State<'_, DbPool>,
    conversation_id: String,
    message: String,
    images: Vec<String>,
) -> Result<(), String> {
    // 1. Save user message
    repository::add_message(&pool, &conversation_id, "user", &message)?;
    repository::update_conversation_time(&pool, &conversation_id)?;

    // 2. Load config
    let base_url = repository::get_setting(&pool, "llm_base_url")?.unwrap_or_default();
    let api_key = repository::get_setting(&pool, "llm_api_key")?.unwrap_or_default();
    let model = repository::get_setting(&pool, "llm_model")?.unwrap_or_default();

    if base_url.is_empty() || api_key.is_empty() {
        let _ = app.emit("chat:error", ErrorPayload {
            conversation_id: conversation_id.clone(),
            message: "API 未配置，请在设置中输入 API Key 和 Base URL".into(),
        });
        return Err("API not configured".into());
    }

    // 3. Load conversation history (last 20 messages)
    let history_messages = repository::get_messages(&pool, &conversation_id)?;
    let history: Vec<ChatHistory> = history_messages
        .iter()
        .map(|m| ChatHistory {
            role: m.role.clone(),
            content: m.content.clone(),
        })
        .collect();

    let system_prompt = "你是一只叫 Panda 的 AI 助手，住在用户的桌面上。请用友好的语气回答问题。";

    // 4. Stream multimodal chat
    let conv_id = conversation_id.clone();
    let app_clone = app.clone();
    let result = client::stream_multimodal_chat(
        &base_url,
        &api_key,
        &model,
        system_prompt,
        &history,
        &message,
        &images,
        |token| {
            let _ = app_clone.emit("chat:token", TokenPayload {
                conversation_id: conv_id.clone(),
                token,
            });
        },
    ).await;

    match result {
        Ok(full_text) => {
            let _ = app.emit("chat:done", DonePayload {
                conversation_id: conversation_id.clone(),
            });
            if let Err(e) = repository::add_message(&pool, &conversation_id, "assistant", &full_text) {
                log::error!("Failed to save assistant message: {}", e);
            }
            let _ = repository::update_conversation_time(&pool, &conversation_id);
            Ok(())
        }
        Err(e) => {
            let _ = app.emit("chat:error", ErrorPayload {
                conversation_id: conversation_id.clone(),
                message: e.clone(),
            });
            Err(e)
        }
    }
}
