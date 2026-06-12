use diesel::{table, joinable};

table! {
    settings (key) {
        key -> Text,
        value -> Text,
    }
}

table! {
    conversations (id) {
        id -> Text,
        title -> Text,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

table! {
    messages (id) {
        id -> Text,
        conversation_id -> Text,
        role -> Text,
        content -> Text,
        created_at -> Timestamp,
    }
}

table! {
    mcp_servers (id) {
        id -> Text,
        name -> Text,
        command -> Text,
        args -> Text,
    }
}

table! {
    memory_items (id) {
        id -> Integer,
        category -> Text,
        content -> Text,
        created_at -> Timestamp,
    }
}

joinable!(messages -> conversations (conversation_id));
