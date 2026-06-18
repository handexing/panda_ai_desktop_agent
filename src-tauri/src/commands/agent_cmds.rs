use tauri::{AppHandle, Emitter, State};
use serde::Serialize;
use tokio::sync::mpsc;
use crate::db::{DbPool, repository, models};
use crate::api::client;
use crate::agent::types::{TraceStep, AgentMessage};

#[derive(Serialize, Clone)]
pub struct TracePayload {
    pub step: TraceStep,
}

#[tauri::command]
#[cfg(feature = "p3-agent")]
pub async fn stream_agent_chat(
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
        let _ = app.emit("agent:error", TracePayload {
            step: TraceStep::Error { message: "API 未配置".into() },
        });
        return Err("API not configured".into());
    }

    // 3. Load history (last 20 messages)
    let history_messages = repository::get_messages(&pool, &conversation_id)?;
    let history: Vec<AgentMessage> = history_messages
        .iter()
        .map(|m| AgentMessage {
            role: m.role.clone(),
            content: Some(m.content.clone()),
            tool_calls: None,
            tool_call_id: None,
        })
        .collect();

    // 4. Load memory context
    let memory_items = repository::list_memory_items(&pool).unwrap_or_default();
    let memory_context: String = if memory_items.is_empty() {
        String::new()
    } else {
        memory_items.iter()
            .map(|item| format!("[{}] {}", item.category, item.content))
            .collect::<Vec<_>>()
            .join("\n")
    };

    // 5. Connect MCP servers
    let servers = repository::list_mcp_servers(&pool).unwrap_or_default();
    let mut mcp = crate::mcp::McpClient::new();
    if !servers.is_empty() {
        let server_configs: Vec<(String, String, Vec<String>)> = servers
            .iter()
            .map(|s| {
                let args: Vec<String> = if s.args.is_empty() {
                    Vec::new()
                } else {
                    s.args.split(' ').map(|a| a.to_string()).collect()
                };
                (s.name.clone(), s.command.clone(), args)
            })
            .collect();
        if let Err(e) = mcp.connect_all(&server_configs).await {
            let _ = app.emit("agent:error", TracePayload {
                step: TraceStep::Error { message: format!("MCP 连接失败: {}", e) },
            });
            return Err(format!("MCP connection failed: {}", e));
        }
    }

    // 6. Set up trace channel
    let (trace_tx, mut trace_rx) = mpsc::unbounded_channel::<TraceStep>();
    let app_clone = app.clone();

    // Spawn trace forwarding
    let forward_handle = tokio::spawn(async move {
        while let Some(step) = trace_rx.recv().await {
            let _ = app_clone.emit("agent:trace", TracePayload { step });
        }
    });

    // 7. Run agent
    let result = crate::agent::run_agent(
        &mut mcp,
        &base_url,
        &api_key,
        &model,
        &message,
        &history,
        &memory_context,
        trace_tx,
    ).await;

    // Drop mcp and wait for all trace events to be forwarded
    drop(mcp);
    let _ = forward_handle.await;

    match result {
        Ok(full_text) => {
            if let Err(e) = repository::add_message(&pool, &conversation_id, "assistant", &full_text) {
                log::error!("Failed to save assistant message: {}", e);
            }
            let _ = repository::update_conversation_time(&pool, &conversation_id);
            Ok(())
        }
        Err(e) => {
            let _ = app.emit("agent:error", TracePayload {
                step: TraceStep::Error { message: e.to_string() },
            });
            Err(e.to_string())
        }
    }
}

#[tauri::command]
#[cfg(feature = "p3-agent")]
pub async fn tts_speak(
    text: String,
) -> Result<String, String> {
    let encoded_text = urlencoding::encode(&text);
    let url = format!(
        "https://api.edge-tts.com/v1/text-to-speech?text={}&voice=zh-CN-XiaoxiaoNeural",
        encoded_text
    );
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("TTS request failed: {}", e))?;
    let bytes = response.bytes().await.map_err(|e| format!("TTS read failed: {}", e))?;
    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:audio/mp3;base64,{}", b64))
}

#[tauri::command]
#[cfg(feature = "p3-agent")]
pub async fn list_mcp_servers(
    pool: State<'_, DbPool>,
) -> Result<Vec<models::McpServer>, String> {
    repository::list_mcp_servers(&pool)
}

#[tauri::command]
#[cfg(feature = "p3-agent")]
pub async fn add_mcp_server(
    pool: State<'_, DbPool>,
    name: String,
    command: String,
    args: String,
) -> Result<models::McpServer, String> {
    let server = models::NewMcpServer {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        command,
        args,
    };
    repository::add_mcp_server(&pool, server)
}

#[tauri::command]
#[cfg(feature = "p3-agent")]
pub async fn delete_mcp_server(
    pool: State<'_, DbPool>,
    id: String,
) -> Result<(), String> {
    repository::delete_mcp_server(&pool, &id)
}

#[derive(Serialize)]
pub struct McpServerStatus {
    pub ok: bool,
    pub tool_count: usize,
    pub message: String,
}

/// Transcribe audio to text via Whisper API.
#[tauri::command]
#[cfg(feature = "p3-agent")]
pub async fn transcribe_audio(
    pool: State<'_, DbPool>,
    audio_base64: String,
) -> Result<String, String> {
    let base_url = repository::get_setting(&pool, "llm_base_url")?.unwrap_or_default();
    let api_key = repository::get_setting(&pool, "llm_api_key")?.unwrap_or_default();
    let model = repository::get_setting(&pool, "stt_model")?
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "whisper-1".into());

    if base_url.is_empty() || api_key.is_empty() {
        return Err("API 未配置".into());
    }

    client::transcribe_audio(&base_url, &api_key, &model, &audio_base64).await
}

/// Test an MCP server config — spawn, handshake, discover tools, report status.
#[tauri::command]
#[cfg(feature = "p3-agent")]
pub async fn check_mcp_server(
    command: String,
    args: String,
) -> Result<McpServerStatus, String> {
    let args_list: Vec<&str> = if args.is_empty() {
        Vec::new()
    } else {
        args.split(' ').collect()
    };

    let mut transport = match crate::mcp::transport::McpTransport::spawn(&command, &args_list).await {
        Ok(t) => t,
        Err(e) => return Ok(McpServerStatus {
            ok: false,
            tool_count: 0,
            message: format!("启动失败: {}", e),
        }),
    };

    // Wrap in a minimal client-like flow
    let mut transport = transport;
    match transport.initialize().await {
        Err(e) => {
            drop(transport);
            Ok(McpServerStatus {
                ok: false,
                tool_count: 0,
                message: format!("握手失败: {}", e),
            })
        }
        Ok(_) => {
            // Try tools/list
            match transport.send_request("tools/list", None).await {
                Ok(result) => {
                    let count = result.get("tools")
                        .and_then(|t| t.as_array())
                        .map(|a| a.len())
                        .unwrap_or(0);
                    drop(transport);
                    Ok(McpServerStatus {
                        ok: true,
                        tool_count: count,
                        message: format!("可用，发现 {} 个工具", count),
                    })
                }
                Err(e) => {
                    drop(transport);
                    Ok(McpServerStatus {
                        ok: false,
                        tool_count: 0,
                        message: format!("工具发现失败: {}", e),
                    })
                }
            }
        }
    }
}
