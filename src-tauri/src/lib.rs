// 模块声明
mod commands;
mod db;
mod error;
mod state;

use std::sync::Arc;
use tauri::Manager;

// 导出
pub use error::{AppError, AppResult};
pub use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // 设置 Mock 服务器的 app_handle
            let mock_state: tauri::State<Arc<commands::MockServerState>> = app.state();
            mock_state.set_app_handle(app_handle.clone());

            // 异步初始化数据库
            tauri::async_runtime::spawn(async move {
                match db::get_db_path() {
                    Ok(db_path) => {
                        match db::init_pool(&db_path).await {
                            Ok(pool) => {
                                app_handle.manage(Arc::new(pool));
                                println!("数据库初始化成功: {:?}", db_path);
                            }
                            Err(e) => {
                                eprintln!("数据库初始化失败: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("获取数据库路径失败: {}", e);
                    }
                }
            });

            Ok(())
        })
        .manage(AppState::new())
        .manage(Arc::new(commands::MockServerState::new()))
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::send_http_request,
            commands::send_http_request_stream,
            commands::start_mock_server,
            commands::stop_mock_server,
            commands::get_mock_server_status,
            commands::update_mock_rules,
            commands::update_rule_body,
            // 数据库 CRUD 命令
            commands::db_get_groups,
            commands::db_create_group,
            commands::db_update_group,
            commands::db_delete_group,
            commands::db_get_endpoints,
            commands::db_create_endpoint,
            commands::db_update_endpoint,
            commands::db_delete_endpoint,
            commands::db_get_mock_rules,
            commands::db_create_mock_rule,
            commands::db_update_mock_rule,
            commands::db_delete_mock_rule,
            // 导入导出命令
            commands::export_to_json,
            commands::import_from_json
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
