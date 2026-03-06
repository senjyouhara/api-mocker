use serde::Serialize;
use thiserror::Error;

/// 应用错误类型
#[derive(Debug, Error)]
pub enum AppError {
    #[error("IO 错误: {0}")]
    Io(#[from] std::io::Error),

    #[error("序列化错误: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("Tauri 错误: {0}")]
    Tauri(#[from] tauri::Error),

    #[error("HTTP 请求错误: {0}")]
    Http(#[from] reqwest::Error),

    #[error("数据库错误: {0}")]
    Database(#[from] sqlx::Error),

    #[error("自定义错误: {0}")]
    Custom(String),
}

/// 前端友好的错误响应
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub code: i32,
    pub message: String,
}

impl From<AppError> for ErrorResponse {
    fn from(err: AppError) -> Self {
        let (code, message) = match &err {
            AppError::Io(_) => (1001, err.to_string()),
            AppError::Serde(_) => (1002, err.to_string()),
            AppError::Tauri(_) => (1003, err.to_string()),
            AppError::Http(_) => (1004, err.to_string()),
            AppError::Database(_) => (1005, err.to_string()),
            AppError::Custom(_) => (1000, err.to_string()),
        };
        ErrorResponse { code, message }
    }
}

// 实现 Serialize 以便 Tauri 可以将错误返回给前端
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        ErrorResponse::from(AppError::Custom(self.to_string())).serialize(serializer)
    }
}

/// 应用结果类型别名
pub type AppResult<T> = Result<T, AppError>;
