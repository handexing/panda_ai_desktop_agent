use anyhow::Result;
use crate::agent::types::{AgentMessage, ToolCall};
use crate::api::client;

pub struct Planner {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub system_prompt: String,
}

impl Planner {
    pub fn new(base_url: String, api_key: String, model: String, system_prompt: String) -> Self {
        Self { base_url, api_key, model, system_prompt }
    }

    /// Call LLM with function calling. Returns either tool calls or a final text response.
    pub async fn plan(
        &self,
        messages: &[AgentMessage],
        tools: &[serde_json::Value],
    ) -> Result<PlanResult> {
        // Build full message list with system prompt
        let mut full_messages = vec![
            AgentMessage {
                role: "system".into(),
                content: Some(self.system_prompt.clone()),
                tool_calls: None,
                tool_call_id: None,
            }
        ];
        full_messages.extend_from_slice(messages);

        let response = client::agent_chat(
            &self.base_url,
            &self.api_key,
            &self.model,
            &full_messages,
            tools,
        ).await
        .map_err(|e| anyhow::anyhow!("{}", e))?;

        let choice = response.choices
            .first()
            .ok_or_else(|| anyhow::anyhow!("No choices in LLM response"))?;

        if let Some(ref tool_calls) = choice.message.tool_calls {
            let calls: Vec<ToolCall> = tool_calls.iter().map(|tc| ToolCall {
                id: tc.id.clone(),
                name: tc.function.name.clone(),
                arguments: serde_json::from_str(&tc.function.arguments)
                    .unwrap_or(serde_json::Value::Null),
            }).collect();
            Ok(PlanResult::ToolCalls(calls))
        } else if let Some(ref content) = choice.message.content {
            Ok(PlanResult::FinalText(content.clone()))
        } else {
            Ok(PlanResult::FinalText("我无法处理这个请求。".into()))
        }
    }
}

pub enum PlanResult {
    ToolCalls(Vec<ToolCall>),
    FinalText(String),
}
