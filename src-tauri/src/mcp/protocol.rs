use serde::{Deserialize, Serialize};

/// JSON-RPC 2.0 request
#[derive(Debug, Serialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub id: u64,
    pub method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
}

impl JsonRpcRequest {
    pub fn new(id: u64, method: &str, params: Option<serde_json::Value>) -> Self {
        Self { jsonrpc: "2.0".into(), id, method: method.into(), params }
    }
}

/// JSON-RPC 2.0 response
#[derive(Debug, Deserialize)]
pub struct JsonRpcResponse {
    #[allow(dead_code)]
    pub jsonrpc: Option<String>,
    pub id: Option<u64>,
    #[serde(default)]
    pub result: Option<serde_json::Value>,
    #[serde(default)]
    pub error: Option<JsonRpcError>,
}

#[derive(Debug, Deserialize)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
}

/// Notification from server (no id)
#[derive(Debug, Deserialize)]
pub struct JsonRpcNotification {
    #[allow(dead_code)]
    pub jsonrpc: Option<String>,
    pub method: Option<String>,
    #[serde(default)]
    pub params: Option<serde_json::Value>,
}

/// MCP tool definition returned by tools/list
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct McpTool {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub input_schema: Option<serde_json::Value>,
}

/// Result from tools/list
#[derive(Debug, Deserialize)]
pub struct ToolsListResult {
    pub tools: Vec<McpTool>,
}

/// Result from tools/call
#[derive(Debug, Deserialize)]
pub struct ToolsCallResult {
    pub content: Vec<ToolsCallContent>,
}

#[derive(Debug, Deserialize)]
pub struct ToolsCallContent {
    #[serde(default)]
    pub text: Option<String>,
}

impl ToolsCallResult {
    /// Extract text content from tool result
    pub fn text(&self) -> String {
        self.content.iter()
            .filter_map(|c| c.text.as_deref())
            .collect::<Vec<&str>>()
            .join("\n")
    }
}

/// Convert McpTool to OpenAI function calling format
pub fn mcp_tools_to_openai(tools: &[McpTool]) -> Vec<serde_json::Value> {
    tools.iter().map(|t| {
        serde_json::json!({
            "type": "function",
            "function": {
                "name": t.name,
                "description": t.description.clone().unwrap_or_default(),
                "parameters": t.input_schema.clone().unwrap_or(serde_json::json!({
                    "type": "object",
                    "properties": {}
                })),
            }
        })
    }).collect()
}
