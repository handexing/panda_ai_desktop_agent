use tauri::State;
use serde::Serialize;
use crate::db::{DbPool, repository, models};

#[derive(Serialize)]
pub struct GraphData {
    pub nodes: Vec<models::KnowledgeNode>,
    pub edges: Vec<models::KnowledgeEdge>,
}

#[tauri::command]
#[cfg(feature = "p4-graph")]
pub fn get_graph(pool: State<'_, DbPool>) -> Result<GraphData, String> {
    let nodes = repository::list_knowledge_nodes(&pool)?;
    let edges = repository::list_knowledge_edges(&pool)?;
    Ok(GraphData { nodes, edges })
}

#[tauri::command]
#[cfg(feature = "p4-graph")]
pub async fn extract_graph(pool: State<'_, DbPool>) -> Result<String, String> {
    crate::graph::extractor::extract_graph(&pool).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[cfg(feature = "p4-graph")]
pub fn clear_graph(pool: State<'_, DbPool>) -> Result<(), String> {
    repository::clear_knowledge_graph(&pool)
}

#[tauri::command]
#[cfg(feature = "p4-graph")]
pub fn list_reminders(pool: State<'_, DbPool>) -> Result<Vec<models::Reminder>, String> {
    repository::list_reminders(&pool)
}

#[tauri::command]
#[cfg(feature = "p4-graph")]
pub fn add_reminder(
    pool: State<'_, DbPool>,
    title: String,
    description: String,
    remind_at: Option<String>,
) -> Result<models::Reminder, String> {
    use chrono::NaiveDateTime;
    let remind_dt = remind_at.and_then(|s| {
        NaiveDateTime::parse_from_str(&s, "%Y-%m-%d %H:%M:%S").ok()
            .or_else(|| NaiveDateTime::parse_from_str(&s, "%Y-%m-%d %H:%M").ok())
    });
    let reminder = models::NewReminder {
        id: uuid::Uuid::new_v4().to_string(),
        title,
        description,
        remind_at: remind_dt,
    };
    repository::add_reminder(&pool, reminder)
}

#[tauri::command]
#[cfg(feature = "p4-graph")]
pub fn mark_reminder_done(pool: State<'_, DbPool>, id: String) -> Result<(), String> {
    repository::mark_reminder_done(&pool, &id)
}

#[tauri::command]
#[cfg(feature = "p4-graph")]
pub fn delete_reminder(pool: State<'_, DbPool>, id: String) -> Result<(), String> {
    repository::delete_reminder(&pool, &id)
}

#[derive(Serialize)]
pub struct DueReminders {
    pub reminders: Vec<models::Reminder>,
}

#[tauri::command]
#[cfg(feature = "p4-graph")]
pub fn check_due_reminders(pool: State<'_, DbPool>) -> Result<DueReminders, String> {
    let reminders = repository::get_due_reminders(&pool)?;
    Ok(DueReminders { reminders })
}
