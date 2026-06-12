use anyhow::Result;
use crate::db::DbPool;
use crate::db::repository;

/// Extract user profile from recent conversations during idle time.
/// Called after a conversation ends (e.g., 30s after last message).
pub async fn extract_memory(pool: &DbPool) -> Result<()> {
    let base_url = repository::get_setting(pool, "llm_base_url")
        .map_err(|e| anyhow::anyhow!("{}", e))?
        .unwrap_or_default();
    let api_key = repository::get_setting(pool, "llm_api_key")
        .map_err(|e| anyhow::anyhow!("{}", e))?
        .unwrap_or_default();
    let model = repository::get_setting(pool, "llm_model")
        .map_err(|e| anyhow::anyhow!("{}", e))?
        .unwrap_or_default();

    if base_url.is_empty() || api_key.is_empty() {
        return Ok(());
    }

    // Get recent messages from last 5 conversations
    let conversations = repository::list_conversations(pool)
        .map_err(|e| anyhow::anyhow!("{}", e))?;
    let mut all_messages = Vec::new();
    for conv in conversations.iter().take(5) {
        let msgs = repository::get_messages(pool, &conv.id)
            .map_err(|e| anyhow::anyhow!("{}", e))?;
        all_messages.extend(msgs);
    }

    if all_messages.len() < 6 {
        return Ok(()); // Not enough conversation data
    }

    let conversation_text: String = all_messages.iter()
        .map(|m| format!("{}: {}", m.role, m.content))
        .collect::<Vec<_>>()
        .join("\n");

    let system_prompt = "\
从以下对话中提取关于用户的信息。只提取明确的偏好、习惯、事实。\
每个提取结果格式：category|content\
category 只能是 preference（偏好）、fact（事实）、habit（习惯）之一。\
如果对话中没有值得记录的信息，回复 NONE。";

    let messages = vec![
        crate::agent::types::AgentMessage {
            role: "system".into(),
            content: Some(system_prompt.to_string()),
            tool_calls: None,
            tool_call_id: None,
        },
        crate::agent::types::AgentMessage {
            role: "user".into(),
            content: Some(conversation_text),
            tool_calls: None,
            tool_call_id: None,
        },
    ];

    let response = crate::api::client::agent_chat(
        &base_url,
        &api_key,
        &model,
        &messages,
        &[],  // no tools needed for extraction
    ).await;

    let text = match response {
        Ok(resp) => {
            resp.choices
                .first()
                .and_then(|c| c.message.content.as_deref())
                .unwrap_or("NONE")
                .to_string()
        }
        Err(_) => return Ok(()),
    };

    if text.trim() == "NONE" {
        return Ok(());
    }

    // Parse and save each extracted item
    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() { continue; }
        if let Some((category, content)) = line.split_once('|') {
            let category = category.trim();
            if !["preference", "fact", "habit"].contains(&category) {
                continue;
            }
            // Skip duplicates
            let existing = repository::list_memory_items(pool)
                .map_err(|e| anyhow::anyhow!("{}", e))?;
            if existing.iter().any(|m| m.content == content.trim()) {
                continue;
            }
            let _ = repository::add_memory_item(pool, crate::db::models::NewMemoryItem {
                category: category.to_string(),
                content: content.trim().to_string(),
            });
        }
    }

    Ok(())
}
