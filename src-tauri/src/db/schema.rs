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

table! {
    knowledge_nodes (id) {
        id -> Integer,
        name -> Text,
        node_type -> Text,
        created_at -> Timestamp,
    }
}

table! {
    knowledge_edges (id) {
        id -> Integer,
        from_node_id -> Integer,
        to_node_id -> Integer,
        relation -> Text,
        created_at -> Timestamp,
    }
}

table! {
    reminders (id) {
        id -> Text,
        title -> Text,
        description -> Text,
        remind_at -> Nullable<Timestamp>,
        is_done -> Bool,
        created_at -> Timestamp,
    }
}

joinable!(knowledge_edges -> knowledge_nodes (from_node_id));
