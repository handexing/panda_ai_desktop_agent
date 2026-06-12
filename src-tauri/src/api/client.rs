use reqwest::{Client, header};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;

#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<Message>,
    stream: bool,
}

#[derive(Debug, Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct MultimodalChatRequest {
    model: String,
    messages: Vec<MultimodalMessage>,
    stream: bool,
}

#[derive(Debug, Serialize)]
struct MultimodalMessage {
    role: String,
    content: Vec<ContentItem>,
}

#[derive(Debug, Serialize)]
struct ContentItem {
    #[serde(rename = "type")]
    content_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    image_url: Option<ImageUrl>,
}

#[derive(Debug, Serialize)]
struct ImageUrl {
    url: String,
}

#[derive(Debug, Deserialize)]
struct ChatChunk {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    delta: Delta,
    #[serde(default)]
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Delta {
    #[serde(default)]
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChatHistory {
    pub role: String,
    pub content: String,
}

/// Call a streaming OpenAI-compatible chat completion API.
/// `on_token` is called with each text chunk.
/// Returns the full assembled text on success.
pub async fn stream_chat_completion(
    base_url: &str,
    api_key: &str,
    model: &str,
    system_prompt: &str,
    history: &[ChatHistory],
    user_message: &str,
    mut on_token: impl FnMut(String),
) -> Result<String, String> {
    let url = format!("{}/v1/chat/completions", base_url.trim_end_matches('/'));
    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let mut messages = Vec::new();

    if !system_prompt.is_empty() {
        messages.push(Message {
            role: "system".into(),
            content: system_prompt.to_string(),
        });
    }

    for msg in history {
        messages.push(Message {
            role: msg.role.clone(),
            content: msg.content.clone(),
        });
    }

    messages.push(Message {
        role: "user".into(),
        content: user_message.to_string(),
    });

    let request_body = ChatRequest {
        model: model.to_string(),
        messages,
        stream: true,
    };

    let response = client
        .post(&url)
        .header(header::AUTHORIZATION, format!("Bearer {}", api_key))
        .header(header::CONTENT_TYPE, "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "API request timed out".to_string()
            } else if e.is_connect() {
                format!("Cannot connect to {}: {}", base_url, e)
            } else {
                format!("API request failed: {}", e)
            }
        })?;

    let status = response.status();
    if !status.is_success() {
        let err_body = response.text().await.unwrap_or_default();
        return Err(format!("API returned {status}: {err_body}"));
    }

    let stream = response.bytes_stream();
    let mut full_text = String::new();
    let mut buffer = String::new();

    use tokio_stream::StreamExt;
    tokio::pin!(stream);

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;
        let chunk_str = String::from_utf8_lossy(&chunk);
        buffer.push_str(&chunk_str);

        while let Some(line_end) = buffer.find('\n') {
            let line = buffer[..line_end].trim().to_string();
            buffer = buffer[line_end + 1..].to_string();

            if line.is_empty() {
                continue;
            }
            if !line.starts_with("data: ") {
                continue;
            }
            let data = &line[6..];
            if data == "[DONE]" {
                break;
            }

            if let Ok(parsed) = serde_json::from_str::<ChatChunk>(data) {
                if let Some(content) = parsed.choices.first().and_then(|c| c.delta.content.as_deref()) {
                    full_text.push_str(content);
                    on_token(content.to_string());
                }
            }
        }
    }

    Ok(full_text)
}

/// Send a multimodal message (text + images) to the chat API.
pub async fn stream_multimodal_chat(
    base_url: &str,
    api_key: &str,
    model: &str,
    system_prompt: &str,
    history: &[ChatHistory],
    user_text: &str,
    image_base64s: &[String],
    mut on_token: impl FnMut(String),
) -> Result<String, String> {
    let url = format!("{}/v1/chat/completions", base_url.trim_end_matches('/'));
    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let mut messages: Vec<MultimodalMessage> = Vec::new();

    if !system_prompt.is_empty() {
        messages.push(MultimodalMessage {
            role: "system".into(),
            content: vec![ContentItem {
                content_type: "text".into(),
                text: Some(system_prompt.to_string()),
                image_url: None,
            }],
        });
    }

    for msg in history {
        messages.push(MultimodalMessage {
            role: msg.role.clone(),
            content: vec![ContentItem {
                content_type: "text".into(),
                text: Some(msg.content.clone()),
                image_url: None,
            }],
        });
    }

    // Build user message with text + images
    let mut user_content = vec![ContentItem {
        content_type: "text".into(),
        text: Some(user_text.to_string()),
        image_url: None,
    }];
    for img in image_base64s {
        user_content.push(ContentItem {
            content_type: "image_url".into(),
            text: None,
            image_url: Some(ImageUrl { url: img.clone() }),
        });
    }
    messages.push(MultimodalMessage {
        role: "user".into(),
        content: user_content,
    });

    let request_body = MultimodalChatRequest {
        model: model.to_string(),
        messages,
        stream: true,
    };

    let response = client
        .post(&url)
        .header(header::AUTHORIZATION, format!("Bearer {}", api_key))
        .header(header::CONTENT_TYPE, "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "API request timed out".to_string()
            } else if e.is_connect() {
                format!("Cannot connect to {}: {}", base_url, e)
            } else {
                format!("API request failed: {}", e)
            }
        })?;

    let status = response.status();
    if !status.is_success() {
        let err_body = response.text().await.unwrap_or_default();
        return Err(format!("API returned {status}: {err_body}"));
    }

    let stream = response.bytes_stream();
    let mut full_text = String::new();
    let mut buffer = String::new();

    use tokio_stream::StreamExt;
    tokio::pin!(stream);

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;
        let chunk_str = String::from_utf8_lossy(&chunk);
        buffer.push_str(&chunk_str);

        while let Some(line_end) = buffer.find('\n') {
            let line = buffer[..line_end].trim().to_string();
            buffer = buffer[line_end + 1..].to_string();

            if line.is_empty() {
                continue;
            }
            if !line.starts_with("data: ") {
                continue;
            }
            let data = &line[6..];
            if data == "[DONE]" {
                break;
            }

            if let Ok(parsed) = serde_json::from_str::<ChatChunk>(data) {
                if let Some(content) = parsed.choices.first().and_then(|c| c.delta.content.as_deref()) {
                    full_text.push_str(content);
                    on_token(content.to_string());
                }
            }
        }
    }

    Ok(full_text)
}

/// Test API connectivity by sending a simple non-streaming request.
pub async fn test_connection(
    base_url: &str,
    api_key: &str,
    model: &str,
) -> Result<bool, String> {
    let url = format!("{}/v1/chat/completions", base_url.trim_end_matches('/'));
    let client = Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let body = json!({
        "model": model,
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens": 5,
        "stream": false,
    });

    let response = client
        .post(&url)
        .header(header::AUTHORIZATION, format!("Bearer {}", api_key))
        .header(header::CONTENT_TYPE, "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Connection test failed: {}", e))?;

    Ok(response.status().is_success())
}

/// Send a non-streaming chat request with function calling support.
pub async fn agent_chat(
    base_url: &str,
    api_key: &str,
    model: &str,
    messages: &[crate::agent::types::AgentMessage],
    tools: &[serde_json::Value],
) -> Result<crate::agent::types::FunctionCallResponse, String> {
    let url = format!("{}/v1/chat/completions", base_url.trim_end_matches('/'));
    let client = Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Build messages with only non-None fields
    let messages_value: Vec<serde_json::Value> = messages.iter().map(|m| {
        let mut obj = serde_json::json!({ "role": m.role });
        if let Some(ref content) = m.content {
            obj["content"] = serde_json::json!(content);
        }
        if let Some(ref tool_calls) = m.tool_calls {
            obj["tool_calls"] = serde_json::to_value(tool_calls).unwrap_or_default();
        }
        if let Some(ref tool_call_id) = m.tool_call_id {
            obj["tool_call_id"] = serde_json::json!(tool_call_id);
        }
        obj
    }).collect();

    let mut body = serde_json::json!({
        "model": model,
        "messages": messages_value,
        "stream": false,
    });

    if !tools.is_empty() {
        body["tools"] = serde_json::json!(tools);
        body["tool_choice"] = serde_json::json!("auto");
    }

    let response = client
        .post(&url)
        .header(header::AUTHORIZATION, format!("Bearer {}", api_key))
        .header(header::CONTENT_TYPE, "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Agent API request failed: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let err = response.text().await.unwrap_or_default();
        return Err(format!("Agent API {}: {}", status, err));
    }

    response.json::<crate::agent::types::FunctionCallResponse>()
        .await
        .map_err(|e| format!("Failed to parse agent response: {}", e))
}
