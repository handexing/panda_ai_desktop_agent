pub mod types;
pub mod planner;
pub mod executor;

use anyhow::Result;
use tokio::sync::mpsc;
use crate::agent::types::{AgentMessage, TraceStep};
use crate::agent::planner::Planner;
use crate::agent::executor::Executor;
use crate::mcp::McpClient;

const MAX_LOOP: usize = 10;

/// Run the agent Plan→Execute→Observe loop.
///
/// Sends TraceStep events through trace_tx for the frontend TraceBar.
/// Returns the final text response.
pub async fn run_agent(
    mcp: &mut McpClient,
    base_url: &str,
    api_key: &str,
    model: &str,
    user_message: &str,
    history: &[AgentMessage],
    memory_context: &str,
    trace_tx: mpsc::UnboundedSender<TraceStep>,
) -> Result<String> {
    let _ = trace_tx.send(TraceStep::Planning);

    let tools = mcp.openai_tools();

    let system_prompt = if memory_context.is_empty() {
        "你是一只叫 Panda 的桌面 AI Agent。你可以调用工具来完成用户的请求。\
         每次用户提问，先思考是否需要调用工具，如果需要就调用，不需要就直接回答。\
         工具调用结果会返回给你，你可以据此继续执行或给出最终回答。".into()
    } else {
        format!(
            "你是一只叫 Panda 的桌面 AI Agent。你可以调用工具来完成用户的请求。\n\n## 关于用户的已知信息\n{}\n\n请基于这些信息提供更个性化的服务。",
            memory_context
        )
    };

    let planner = Planner::new(
        base_url.to_string(),
        api_key.to_string(),
        model.to_string(),
        system_prompt,
    );

    let mut messages: Vec<AgentMessage> = history.to_vec();
    messages.push(AgentMessage {
        role: "user".into(),
        content: Some(user_message.into()),
        tool_calls: None,
        tool_call_id: None,
    });

    for _loop_count in 0..MAX_LOOP {
        match planner.plan(&messages, &tools).await? {
            planner::PlanResult::ToolCalls(tool_calls) => {
                // Record assistant tool call message in history
                let assistant_msg = Executor::build_assistant_tool_call_message(&tool_calls);
                messages.push(assistant_msg);

                for call in &tool_calls {
                    let _ = trace_tx.send(TraceStep::Executing {
                        tool: format!("{}({})", call.name, call.arguments),
                    });
                }

                // Execute tools via MCP
                let tool_results = Executor::execute(mcp, &tool_calls).await?;

                for result in &tool_results {
                    if let Some(ref content) = result.content {
                        let short = if content.len() > 200 {
                            format!("{}...", &content[..200])
                        } else {
                            content.clone()
                        };
                        let _ = trace_tx.send(TraceStep::Observing { result: short });
                    }
                }

                messages.extend(tool_results);
                // Continue loop — LLM sees tool results and decides next step
            }
            planner::PlanResult::FinalText(text) => {
                let _ = trace_tx.send(TraceStep::Done { text: text.clone() });
                return Ok(text);
            }
        }
    }

    Err(anyhow::anyhow!("Agent loop exceeded {} iterations", MAX_LOOP))
}
