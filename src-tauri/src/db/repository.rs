use diesel::prelude::*;
use crate::db::schema::{conversations, messages, settings};
use crate::db::models::{Conversation, Message, NewConversation, NewMessage, McpServer, NewMcpServer, MemoryItem, NewMemoryItem, KnowledgeNode, NewKnowledgeNode, KnowledgeEdge, NewKnowledgeEdge, Reminder, NewReminder};
use crate::db::DbPool;
use uuid::Uuid;
use chrono::Utc;

// === Settings ===

pub fn get_setting(pool: &DbPool, setting_key: &str) -> Result<Option<String>, String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    settings::table
        .filter(settings::key.eq(setting_key))
        .select(settings::value)
        .first::<String>(&mut conn)
        .optional()
        .map_err(|e| e.to_string())
}

pub fn set_setting(pool: &DbPool, setting_key: &str, setting_value: &str) -> Result<(), String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    diesel::insert_into(settings::table)
        .values((settings::key.eq(setting_key), settings::value.eq(setting_value)))
        .on_conflict(settings::key)
        .do_update()
        .set(settings::value.eq(setting_value))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(())
}

// === Conversations ===

pub fn list_conversations(pool: &DbPool) -> Result<Vec<Conversation>, String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    conversations::table
        .order_by(conversations::updated_at.desc())
        .load::<Conversation>(&mut conn)
        .map_err(|e| e.to_string())
}

pub fn create_conversation(pool: &DbPool, title: &str) -> Result<Conversation, String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    let new_conv = NewConversation {
        id: Uuid::new_v4().to_string(),
        title: title.to_string(),
    };
    diesel::insert_into(conversations::table)
        .values(&new_conv)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    conversations::table
        .filter(conversations::id.eq(&new_conv.id))
        .first::<Conversation>(&mut conn)
        .map_err(|e| e.to_string())
}

pub fn update_conversation_time(pool: &DbPool, conv_id: &str) -> Result<(), String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    diesel::update(conversations::table.filter(conversations::id.eq(conv_id)))
        .set(conversations::updated_at.eq(Utc::now().naive_utc()))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_conversation_and_messages(pool: &DbPool, conv_id: &str) -> Result<(), String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    conn.transaction(|conn| {
        diesel::delete(messages::table.filter(messages::conversation_id.eq(conv_id)))
            .execute(conn)?;
        diesel::delete(conversations::table.filter(conversations::id.eq(conv_id)))
            .execute(conn)?;
        Ok(())
    })
    .map_err(|e: diesel::result::Error| e.to_string())?;
    Ok(())
}

// === Messages ===

pub fn get_messages(pool: &DbPool, conv_id: &str) -> Result<Vec<Message>, String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    messages::table
        .filter(messages::conversation_id.eq(conv_id))
        .order_by(messages::created_at.asc())
        .load::<Message>(&mut conn)
        .map_err(|e| e.to_string())
}

pub fn add_message(pool: &DbPool, conv_id: &str, role: &str, content: &str) -> Result<Message, String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    let new_msg = NewMessage {
        id: Uuid::new_v4().to_string(),
        conversation_id: conv_id.to_string(),
        role: role.to_string(),
        content: content.to_string(),
    };
    diesel::insert_into(messages::table)
        .values(&new_msg)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    messages::table
        .filter(messages::id.eq(&new_msg.id))
        .first::<Message>(&mut conn)
        .map_err(|e| e.to_string())
}

// === MCP Servers ===

pub fn list_mcp_servers(pool: &DbPool) -> Result<Vec<McpServer>, String> {
    use crate::db::schema::mcp_servers::dsl::*;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    mcp_servers.load::<McpServer>(&mut conn).map_err(|e| e.to_string())
}

pub fn add_mcp_server(pool: &DbPool, server: NewMcpServer) -> Result<McpServer, String> {
    use crate::db::schema::mcp_servers;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    diesel::insert_into(mcp_servers::table)
        .values(&server)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    mcp_servers::table.find(&server.id).first(&mut conn).map_err(|e| e.to_string())
}

pub fn delete_mcp_server(pool: &DbPool, server_id: &str) -> Result<(), String> {
    use crate::db::schema::mcp_servers::dsl::*;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    diesel::delete(mcp_servers.filter(id.eq(server_id)))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(())
}

// === Memory Items ===

pub fn list_memory_items(pool: &DbPool) -> Result<Vec<MemoryItem>, String> {
    use crate::db::schema::memory_items::dsl::*;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    memory_items.order(created_at.desc()).load::<MemoryItem>(&mut conn).map_err(|e| e.to_string())
}

pub fn add_memory_item(pool: &DbPool, item: NewMemoryItem) -> Result<MemoryItem, String> {
    use crate::db::schema::memory_items;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    diesel::insert_into(memory_items::table)
        .values(&item)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    memory_items::table.order(memory_items::id.desc()).first(&mut conn).map_err(|e| e.to_string())
}

pub fn memory_item_count(pool: &DbPool) -> Result<i64, String> {
    use crate::db::schema::memory_items::dsl::*;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    memory_items.count().get_result(&mut conn).map_err(|e| e.to_string())
}

// === Knowledge Nodes ===

pub fn list_knowledge_nodes(pool: &DbPool) -> Result<Vec<KnowledgeNode>, String> {
    use crate::db::schema::knowledge_nodes::dsl::*;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    knowledge_nodes.order(created_at.desc()).load(&mut conn).map_err(|e| e.to_string())
}

pub fn add_knowledge_node(pool: &DbPool, node: NewKnowledgeNode) -> Result<KnowledgeNode, String> {
    use crate::db::schema::knowledge_nodes;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    diesel::insert_into(knowledge_nodes::table).values(&node).execute(&mut conn).map_err(|e| e.to_string())?;
    knowledge_nodes::table.order(knowledge_nodes::id.desc()).first(&mut conn).map_err(|e| e.to_string())
}

// === Knowledge Edges ===

pub fn list_knowledge_edges(pool: &DbPool) -> Result<Vec<KnowledgeEdge>, String> {
    use crate::db::schema::knowledge_edges::dsl::*;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    knowledge_edges.load(&mut conn).map_err(|e| e.to_string())
}

pub fn add_knowledge_edge(pool: &DbPool, edge: NewKnowledgeEdge) -> Result<KnowledgeEdge, String> {
    use crate::db::schema::knowledge_edges;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    diesel::insert_into(knowledge_edges::table).values(&edge).execute(&mut conn).map_err(|e| e.to_string())?;
    knowledge_edges::table.order(knowledge_edges::id.desc()).first(&mut conn).map_err(|e| e.to_string())
}

pub fn clear_knowledge_graph(pool: &DbPool) -> Result<(), String> {
    use crate::db::schema::knowledge_edges::dsl as edges_dsl;
    use crate::db::schema::knowledge_nodes::dsl as nodes_dsl;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    diesel::delete(edges_dsl::knowledge_edges).execute(&mut conn).map_err(|e| e.to_string())?;
    diesel::delete(nodes_dsl::knowledge_nodes).execute(&mut conn).map_err(|e| e.to_string())?;
    Ok(())
}

// === Reminders ===

pub fn list_reminders(pool: &DbPool) -> Result<Vec<Reminder>, String> {
    use crate::db::schema::reminders::dsl::*;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    reminders.order(created_at.desc()).load(&mut conn).map_err(|e| e.to_string())
}

pub fn add_reminder(pool: &DbPool, reminder: NewReminder) -> Result<Reminder, String> {
    use crate::db::schema::reminders;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    diesel::insert_into(reminders::table).values(&reminder).execute(&mut conn).map_err(|e| e.to_string())?;
    reminders::table.find(&reminder.id).first(&mut conn).map_err(|e| e.to_string())
}

pub fn mark_reminder_done(pool: &DbPool, reminder_id: &str) -> Result<(), String> {
    use crate::db::schema::reminders::dsl::*;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    diesel::update(reminders.find(reminder_id))
        .set(is_done.eq(true))
        .execute(&mut conn).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_reminder(pool: &DbPool, reminder_id: &str) -> Result<(), String> {
    use crate::db::schema::reminders::dsl::*;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    diesel::delete(reminders.find(reminder_id)).execute(&mut conn).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_due_reminders(pool: &DbPool) -> Result<Vec<Reminder>, String> {
    use crate::db::schema::reminders::dsl::*;
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().naive_utc();
    reminders
        .filter(is_done.eq(false))
        .filter(remind_at.le(now))
        .load(&mut conn)
        .map_err(|e| e.to_string())
}
