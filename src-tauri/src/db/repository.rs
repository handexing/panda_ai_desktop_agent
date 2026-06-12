use diesel::prelude::*;
use crate::db::schema::{conversations, messages, settings};
use crate::db::models::{Conversation, Message, NewConversation, NewMessage, McpServer, NewMcpServer, MemoryItem, NewMemoryItem};
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
