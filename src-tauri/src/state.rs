use std::sync::Mutex;

/// 应用共享状态
/// 用于管理跨命令的共享资源
pub struct AppState {
    /// 示例：计数器
    pub counter: Mutex<i32>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            counter: Mutex::new(0),
        }
    }
}

impl AppState {
    pub fn new() -> Self {
        Self::default()
    }
}
