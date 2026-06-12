use anyhow::Result;
use crate::agent::types::{ToolCall, AgentMessage, AgentToolCall, AgentFunction};
use crate::mcp::McpClient;

pub struct Executor;

impl Executor {
    /// Execute tool calls via MCP client, return tool result messages.
    pub async fn execute(
        mcp: &mut McpClient,
        tool_calls: &[ToolCall],
    ) -> Result<Vec<AgentMessage>> {
        let mut results = Vec::new();
        for call in tool_calls {
            let result_text = mcp.call_tool(&call.name, &call.arguments).await?;
            results.push(AgentMessage {
                role: "tool".into(),
                content: Some(result_text),
                tool_calls: None,
                tool_call_id: Some(call.id.clone()),
            });
        }
        Ok(results)
    }

    /// Build assistant message with tool_calls for the message history.
    pub fn build_assistant_tool_call_message(tool_calls: &[ToolCall]) -> AgentMessage {
        AgentMessage {
            role: "assistant".into(),
            content: None,
            tool_calls: Some(tool_calls.iter().map(|tc| AgentToolCall {
                id: tc.id.clone(),
                call_type: "function".into(),
                function: AgentFunction {
                    name: tc.name.clone(),
                    arguments: tc.arguments.to_string(),
                },
            }).collect()),
            tool_call_id: None,
        }
    }
}
