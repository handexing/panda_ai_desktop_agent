use diesel::prelude::*;
use chrono::NaiveDateTime;
use serde::Serialize;

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
