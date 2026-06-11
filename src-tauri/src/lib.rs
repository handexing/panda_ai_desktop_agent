mod db;
mod api;
mod parser;
mod commands;

#[cfg(feature = "p2-knowledge")]
mod lancedb;

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
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let db_path = get_db_path(app);
            let pool = db::create_pool(db_path.to_str().unwrap())
                .expect("Failed to create database pool");
            db::run_migrations(&pool)
                .expect("Failed to run database migrations");
            app.manage(pool);

            // Edge snap: snap to screen edges when dragged within 15px
            let window = app.get_webview_window("panda").unwrap();
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Moved(position) = event {
                    let screen = match window_clone.primary_monitor() {
                        Ok(Some(m)) => m,
                        _ => return,
                    };
                    let screen_size = screen.size();
                    let (x, y) = (position.x, position.y);
                    let snap_dist = 15;
                    let win_w = 220i32;
                    let win_h = 220i32;

                    let mut new_x = x;
                    let mut new_y = y;

                    if x.abs() <= snap_dist {
                        new_x = 0;
                    } else if (x + win_w - screen_size.width as i32).abs() <= snap_dist {
                        new_x = screen_size.width as i32 - win_w;
                    }

                    if y.abs() <= snap_dist {
                        new_y = 0;
                    } else if (y + win_h - screen_size.height as i32).abs() <= snap_dist {
                        new_y = screen_size.height as i32 - win_h;
                    }

                    if new_x != x || new_y != y {
                        let _ = window_clone.set_position(tauri::PhysicalPosition::new(new_x, new_y));
                    }
                }
            });

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
            #[cfg(feature = "p2-knowledge")]
            commands::chat_cmds::stream_multimodal_chat,
            commands::parser_cmds::extract_file_text,
            commands::parser_cmds::image_to_base64,
            commands::window_cmds::check_first_run,
            commands::window_cmds::collapse_window,
            #[cfg(feature = "p2-knowledge")]
            commands::knowledge_cmds::import_file,
            #[cfg(feature = "p2-knowledge")]
            commands::knowledge_cmds::search_knowledge,
            #[cfg(feature = "p2-knowledge")]
            commands::knowledge_cmds::list_knowledge_files,
            #[cfg(feature = "p2-knowledge")]
            commands::knowledge_cmds::delete_knowledge_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
