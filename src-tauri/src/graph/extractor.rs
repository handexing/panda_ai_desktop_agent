use crate::db::DbPool;
use crate::db::repository;
use crate::db::models::{NewKnowledgeNode, NewKnowledgeEdge};

/// Extract knowledge graph entities and relations from recent conversations.
pub async fn extract_graph(pool: &DbPool) -> Result<String, String> {
    let base_url = repository::get_setting(pool, "llm_base_url")?.unwrap_or_default();
    let api_key = repository::get_setting(pool, "llm_api_key")?.unwrap_or_default();
    let model = repository::get_setting(pool, "llm_model")?.unwrap_or_default();

    if base_url.is_empty() || api_key.is_empty() {
        return Ok("API 未配置，跳过图谱提取".into());
    }

    // Gather recent messages
    let conversations = repository::list_conversations(pool)?;
    let mut all_messages = Vec::new();
    for conv in conversations.iter().take(5) {
        let msgs = repository::get_messages(pool, &conv.id)?;
        all_messages.extend(msgs);
    }
    if all_messages.len() < 4 {
        return Ok("对话内容不足，跳过".into());
    }

    let text: String = all_messages.iter()
        .map(|m| format!("{}: {}", m.role, m.content))
        .collect::<Vec<_>>()
        .join("\n");

    let prompt = format!(
        "从以下对话中提取关键实体和它们之间的关系。\n\n\
        实体类型可以是: person(人物), file(文件), project(项目), topic(话题), tool(工具)\n\
        关系可以是: knows(认识), works_on(参与), contains(包含), references(引用), uses(使用)\n\n\
        输出格式，每行一个:\n\
        NODE:name|type\n\
        EDGE:from_name|to_name|relation\n\n\
        对话内容:\n{}",
        text
    );

    let response = crate::api::client::agent_chat(
        &base_url, &api_key, &model,
        &[crate::agent::types::AgentMessage {
            role: "user".into(),
            content: Some(prompt),
            tool_calls: None,
            tool_call_id: None,
        }],
        &[],
    ).await;

    let content = match response {
        Ok(r) => r.choices.first().and_then(|c| c.message.content.clone()).unwrap_or_default(),
        Err(_) => return Ok("LLM 调用失败，跳过".into()),
    };

    if content.trim().is_empty() { return Ok("无内容".into()); }

    let mut node_count = 0;
    let mut edge_count = 0;
    let mut node_ids: std::collections::HashMap<String, i32> = std::collections::HashMap::new();

    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("NODE:") {
            let parts: Vec<&str> = line[5..].split('|').collect();
            if parts.len() >= 2 {
                let name = parts[0].trim();
                let ntype = parts[1].trim();
                if name.is_empty() { continue; }
                if node_ids.contains_key(name) { continue; }
                match repository::add_knowledge_node(pool, NewKnowledgeNode {
                    name: name.to_string(),
                    node_type: ntype.to_string(),
                }) {
                    Ok(node) => { node_ids.insert(name.to_string(), node.id); node_count += 1; }
                    Err(_) => continue,
                }
            }
        } else if line.starts_with("EDGE:") {
            let parts: Vec<&str> = line[5..].split('|').collect();
            if parts.len() >= 3 {
                let from = parts[0].trim();
                let to = parts[1].trim();
                let rel = parts[2].trim();
                let from_id = node_ids.get(from).copied();
                let to_id = node_ids.get(to).copied();
                if let (Some(fid), Some(tid)) = (from_id, to_id) {
                    // Skip duplicate edges
                    let existing = repository::list_knowledge_edges(pool).unwrap_or_default();
                    if existing.iter().any(|e| e.from_node_id == fid && e.to_node_id == tid && e.relation == rel) {
                        continue;
                    }
                    let _ = repository::add_knowledge_edge(pool, NewKnowledgeEdge {
                        from_node_id: fid,
                        to_node_id: tid,
                        relation: rel.to_string(),
                    });
                    edge_count += 1;
                }
            }
        }
    }

    Ok(format!("提取完成: {} 个节点, {} 条边", node_count, edge_count))
}
