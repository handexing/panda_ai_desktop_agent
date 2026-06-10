mod db;
mod api;
mod parser;
mod commands;

use std::path::PathBuf;
use tauri::Manager;

fn get_db_path(app: &tauri::App) -> PathBuf {
    let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
    std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
    app_dir.join("panda.db")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let db_path = get_db_path(app);
            let pool = db::create_pool(db_path.to_str().unwrap())
                .expect("Failed to create database pool");
            db::run_migrations(&pool)
                .expect("Failed to run database migrations");
            app.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::config_cmds::get_config,
            commands::config_cmds::set_config,
            commands::config_cmds::test_api_connection,
            commands::chat_cmds::list_conversations,
            commands::chat_cmds::create_conversation,
            commands::chat_cmds::get_messages,
            commands::chat_cmds::delete_conversation,
            commands::chat_cmds::stream_chat,
            commands::parser_cmds::extract_file_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
