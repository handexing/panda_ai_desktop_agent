pub mod config_cmds;
pub mod chat_cmds;
pub mod parser_cmds;
pub mod window_cmds;

#[cfg(feature = "p2-knowledge")]
pub mod knowledge_cmds;

#[cfg(feature = "p3-agent")]
pub mod agent_cmds;
