// 数据库模型定义
use serde::{Deserialize, Serialize};

/// 分组模型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DbGroup {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub order: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

/// API 接口模型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DbEndpoint {
    pub id: String,
    pub group_id: String,
    pub name: String,
    pub method: String,
    pub path: String,
    pub description: Option<String>,
    pub order: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Mock 规则模型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DbMockRule {
    pub id: String,
    pub endpoint_id: String,
    pub name: String,
    pub method: String,
    pub path: String,
    pub active: bool,
    pub delay: i32,
    pub status_code: i32,
    pub headers: String,
    pub body_type: String,
    pub body: String,
    pub order: i32,
}

/// 环境模型（预留）
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DbEnvironment {
    pub id: String,
    pub name: String,
    pub is_active: bool,
}

/// 环境变量模型（预留）
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DbEnvVariable {
    pub id: i64,
    pub env_id: String,
    pub key: String,
    pub value: String,
    pub enabled: bool,
}
