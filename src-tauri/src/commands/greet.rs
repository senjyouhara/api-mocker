use crate::error::AppResult;

/// 示例命令：问候
#[tauri::command]
pub fn greet(name: &str) -> AppResult<String> {
    Ok(format!("Hello, {}! You've been greeted from Rust!", name))
}
