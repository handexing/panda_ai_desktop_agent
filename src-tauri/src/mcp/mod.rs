pub mod protocol;
pub mod transport;

use anyhow::Result;
use crate::mcp::protocol::{McpTool, ToolsListResult, ToolsCallResult, mcp_tools_to_openai};
use crate::mcp::transport::McpTransport;

/// Manages multiple MCP server connections.
pub struct McpClient {
    transports: Vec<(String, McpTransport)>,  // (server_name, transport)
    tools: Vec<McpTool>,
}

impl McpClient {
    pub fn new() -> Self {
        Self { transports: Vec::new(), tools: Vec::new() }
    }

    /// Connect to all configured MCP servers and discover tools.
    /// servers: Vec<(name, command, args)>
    pub async fn connect_all(&mut self, servers: &[(String, String, Vec<String>)]) -> Result<()> {
        for (name, command, args) in servers {
            let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
            let mut transport = McpTransport::spawn(command, &args_refs).await?;

            // Initialize handshake
            transport.initialize().await?;

            // Notify initialized
            transport.send_notification("notifications/initialized", None).await?;

            // Discover tools
            let result = transport.send_request("tools/list", None).await?;
            let tools_list: ToolsListResult = serde_json::from_value(result)?;
            self.tools.extend(tools_list.tools);

            self.transports.push((name.clone(), transport));
        }
        Ok(())
    }

    /// Get all discovered tools.
    pub fn tools(&self) -> &[McpTool] {
        &self.tools
    }

    /// Get tools as OpenAI function calling format.
    pub fn openai_tools(&self) -> Vec<serde_json::Value> {
        mcp_tools_to_openai(&self.tools)
    }

    /// Execute a tool by name, find the right server and call it.
    pub async fn call_tool(&mut self, tool_name: &str, arguments: &serde_json::Value) -> Result<String> {
        let params = serde_json::json!({
            "name": tool_name,
            "arguments": arguments,
        });

        // Try each transport — the first one that doesn't error wins
        let mut last_err = None;
        for (name, transport) in &mut self.transports {
            match transport.send_request("tools/call", Some(params.clone())).await {
                Ok(result) => {
                    let call_result: ToolsCallResult = serde_json::from_value(result)?;
                    return Ok(call_result.text());
                }
                Err(e) => {
                    last_err = Some(format!("{} via {}: {}", tool_name, name, e));
                }
            }
        }
        Err(anyhow::anyhow!(last_err.unwrap_or_else(|| format!("No server has tool: {}", tool_name))))
    }
}
