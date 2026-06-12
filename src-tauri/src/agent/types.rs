use serde::{Deserialize, Serialize};

/// A single tool call from the LLM.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: serde_json::Value,
}

/// A step in the agent trace, sent to frontend.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "detail")]
pub enum TraceStep {
    #[serde(rename = "planning")]
    Planning,
    #[serde(rename = "executing")]
    Executing { tool: String },
    #[serde(rename = "observing")]
    Observing { result: String },
    #[serde(rename = "done")]
    Done { text: String },
    #[serde(rename = "error")]
    Error { message: String },
}

/// LLM function calling response (non-streaming).
#[derive(Debug, Deserialize)]
pub struct FunctionCallResponse {
    pub choices: Vec<FunctionCallChoice>,
}

#[derive(Debug, Deserialize)]
pub struct FunctionCallChoice {
    pub message: FunctionCallMessage,
    #[serde(default)]
    pub finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct FunctionCallMessage {
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub tool_calls: Option<Vec<RawToolCall>>,
}

#[derive(Debug, Deserialize)]
pub struct RawToolCall {
    pub id: String,
    #[serde(rename = "type")]
    pub call_type: String,
    pub function: RawFunctionCall,
}

#[derive(Debug, Deserialize)]
pub struct RawFunctionCall {
    pub name: String,
    pub arguments: String, // JSON string, caller must parse
}

/// Chat message for the agent loop (supports tool_calls and tool_call_id).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessage {
    pub role: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<AgentToolCall>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentToolCall {
    pub id: String,
    #[serde(rename = "type")]
    pub call_type: String,
    pub function: AgentFunction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentFunction {
    pub name: String,
    pub arguments: String,
}
