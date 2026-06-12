use diesel::prelude::*;
use chrono::NaiveDateTime;
use serde::{Serialize, Deserialize};

#[derive(Debug, Queryable, Selectable, Insertable, Serialize, Clone)]
#[diesel(table_name = crate::db::schema::settings)]
pub struct Setting {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Queryable, Selectable, Insertable, Serialize, Clone)]
#[diesel(table_name = crate::db::schema::conversations)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Queryable, Selectable, Insertable, Serialize, Clone)]
#[diesel(table_name = crate::db::schema::messages)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = crate::db::schema::conversations)]
pub struct NewConversation {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = crate::db::schema::messages)]
pub struct NewMessage {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
}

#[derive(Debug, Queryable, Selectable, Insertable, Serialize, Clone)]
#[diesel(table_name = crate::db::schema::mcp_servers)]
pub struct McpServer {
    pub id: String,
    pub name: String,
    pub command: String,
    pub args: String,
}

#[derive(Debug, Insertable, Deserialize)]
#[diesel(table_name = crate::db::schema::mcp_servers)]
pub struct NewMcpServer {
    pub id: String,
    pub name: String,
    pub command: String,
    pub args: String,
}

#[derive(Debug, Queryable, Selectable, Insertable, Serialize, Clone)]
#[diesel(table_name = crate::db::schema::memory_items)]
pub struct MemoryItem {
    pub id: i32,
    pub category: String,
    pub content: String,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = crate::db::schema::memory_items)]
pub struct NewMemoryItem {
    pub category: String,
    pub content: String,
}

#[derive(Debug, Queryable, Selectable, Insertable, Serialize, Clone)]
#[diesel(table_name = crate::db::schema::knowledge_nodes)]
pub struct KnowledgeNode {
    pub id: i32,
    pub name: String,
    pub node_type: String,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = crate::db::schema::knowledge_nodes)]
pub struct NewKnowledgeNode {
    pub name: String,
    pub node_type: String,
}

#[derive(Debug, Queryable, Selectable, Insertable, Serialize, Clone)]
#[diesel(table_name = crate::db::schema::knowledge_edges)]
pub struct KnowledgeEdge {
    pub id: i32,
    pub from_node_id: i32,
    pub to_node_id: i32,
    pub relation: String,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = crate::db::schema::knowledge_edges)]
pub struct NewKnowledgeEdge {
    pub from_node_id: i32,
    pub to_node_id: i32,
    pub relation: String,
}

#[derive(Debug, Queryable, Selectable, Insertable, Serialize, Clone)]
#[diesel(table_name = crate::db::schema::reminders)]
pub struct Reminder {
    pub id: String,
    pub title: String,
    pub description: String,
    pub remind_at: Option<NaiveDateTime>,
    pub is_done: bool,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = crate::db::schema::reminders)]
pub struct NewReminder {
    pub id: String,
    pub title: String,
    pub description: String,
    pub remind_at: Option<NaiveDateTime>,
}
