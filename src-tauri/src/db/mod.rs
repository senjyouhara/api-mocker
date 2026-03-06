// 数据库模块
mod schema;

pub use schema::*;

use crate::error::{AppError, AppResult};
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use std::path::PathBuf;

/// 获取数据库文件路径（当前程序运行目录）
pub fn get_db_path() -> AppResult<PathBuf> {
    let current_dir = std::env::current_exe()
        .map_err(|e| AppError::Custom(format!("获取程序路径失败: {}", e)))?
        .parent()
        .ok_or_else(|| AppError::Custom("无法获取程序目录".to_string()))?
        .to_path_buf();

    Ok(current_dir.join("mock_data.db"))
}

/// 初始化数据库连接池
pub async fn init_pool(db_path: &PathBuf) -> AppResult<SqlitePool> {
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .map_err(|e| AppError::Custom(format!("连接数据库失败: {}", e)))?;

    // 启用 WAL 模式
    sqlx::query("PRAGMA journal_mode=WAL")
        .execute(&pool)
        .await
        .map_err(|e| AppError::Custom(format!("设置 WAL 模式失败: {}", e)))?;

    // 运行迁移
    run_migrations(&pool).await?;

    Ok(pool)
}

/// 运行数据库迁移
async fn run_migrations(pool: &SqlitePool) -> AppResult<()> {
    // 创建分组表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT,
            "order" INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Custom(format!("创建 groups 表失败: {}", e)))?;

    // 创建接口表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS endpoints (
            id TEXT PRIMARY KEY,
            group_id TEXT NOT NULL,
            name TEXT NOT NULL,
            method TEXT NOT NULL,
            path TEXT NOT NULL,
            description TEXT,
            "order" INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (group_id) REFERENCES groups(id)
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Custom(format!("创建 endpoints 表失败: {}", e)))?;

    // 创建 Mock 规则表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS mock_rules (
            id TEXT PRIMARY KEY,
            endpoint_id TEXT NOT NULL,
            name TEXT NOT NULL,
            method TEXT NOT NULL,
            path TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 0,
            delay INTEGER NOT NULL DEFAULT 0,
            status_code INTEGER NOT NULL DEFAULT 200,
            headers TEXT NOT NULL DEFAULT '{}',
            body_type TEXT NOT NULL DEFAULT 'json',
            body TEXT NOT NULL DEFAULT '',
            "order" INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (endpoint_id) REFERENCES endpoints(id)
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Custom(format!("创建 mock_rules 表失败: {}", e)))?;

    // 创建环境变量表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS environments (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 0
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Custom(format!("创建 environments 表失败: {}", e)))?;

    // 创建环境变量键值表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS env_variables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            env_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (env_id) REFERENCES environments(id)
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Custom(format!("创建 env_variables 表失败: {}", e)))?;

    Ok(())
}
