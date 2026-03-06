// 数据库 CRUD 命令
use crate::db::{DbEndpoint, DbGroup, DbMockRule};
use crate::error::{AppError, AppResult};
use sqlx::SqlitePool;
use std::sync::Arc;
use tauri::State;

// ========== 分组 CRUD ==========

/// 获取所有分组
#[tauri::command]
pub async fn db_get_groups(pool: State<'_, Arc<SqlitePool>>) -> AppResult<Vec<DbGroup>> {
    let groups = sqlx::query_as::<_, DbGroup>(
        r#"SELECT id, name, parent_id, "order", created_at, updated_at FROM groups ORDER BY "order""#,
    )
    .fetch_all(&**pool)
    .await
    .map_err(|e| AppError::Custom(format!("查询分组失败: {}", e)))?;

    Ok(groups)
}

/// 创建分组
#[tauri::command]
pub async fn db_create_group(
    group: DbGroup,
    pool: State<'_, Arc<SqlitePool>>,
) -> AppResult<DbGroup> {
    sqlx::query(
        r#"INSERT INTO groups (id, name, parent_id, "order", created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"#,
    )
    .bind(&group.id)
    .bind(&group.name)
    .bind(&group.parent_id)
    .bind(group.order)
    .bind(group.created_at)
    .bind(group.updated_at)
    .execute(&**pool)
    .await
    .map_err(|e| AppError::Custom(format!("创建分组失败: {}", e)))?;

    Ok(group)
}

/// 更新分组
#[tauri::command]
pub async fn db_update_group(
    group: DbGroup,
    pool: State<'_, Arc<SqlitePool>>,
) -> AppResult<()> {
    sqlx::query(
        r#"UPDATE groups SET name = ?, parent_id = ?, "order" = ?, updated_at = ? WHERE id = ?"#,
    )
    .bind(&group.name)
    .bind(&group.parent_id)
    .bind(group.order)
    .bind(group.updated_at)
    .bind(&group.id)
    .execute(&**pool)
    .await
    .map_err(|e| AppError::Custom(format!("更新分组失败: {}", e)))?;

    Ok(())
}

/// 删除分组
#[tauri::command]
pub async fn db_delete_group(id: String, pool: State<'_, Arc<SqlitePool>>) -> AppResult<()> {
    sqlx::query("DELETE FROM groups WHERE id = ?")
        .bind(&id)
        .execute(&**pool)
        .await
        .map_err(|e| AppError::Custom(format!("删除分组失败: {}", e)))?;

    Ok(())
}

// ========== 接口 CRUD ==========

/// 获取所有接口
#[tauri::command]
pub async fn db_get_endpoints(pool: State<'_, Arc<SqlitePool>>) -> AppResult<Vec<DbEndpoint>> {
    let endpoints = sqlx::query_as::<_, DbEndpoint>(
        r#"SELECT id, group_id, name, method, path, description, "order", created_at, updated_at
           FROM endpoints ORDER BY "order""#,
    )
    .fetch_all(&**pool)
    .await
    .map_err(|e| AppError::Custom(format!("查询接口失败: {}", e)))?;

    Ok(endpoints)
}

/// 创建接口
#[tauri::command]
pub async fn db_create_endpoint(
    endpoint: DbEndpoint,
    pool: State<'_, Arc<SqlitePool>>,
) -> AppResult<DbEndpoint> {
    sqlx::query(
        r#"INSERT INTO endpoints (id, group_id, name, method, path, description, "order", created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(&endpoint.id)
    .bind(&endpoint.group_id)
    .bind(&endpoint.name)
    .bind(&endpoint.method)
    .bind(&endpoint.path)
    .bind(&endpoint.description)
    .bind(endpoint.order)
    .bind(endpoint.created_at)
    .bind(endpoint.updated_at)
    .execute(&**pool)
    .await
    .map_err(|e| AppError::Custom(format!("创建接口失败: {}", e)))?;

    Ok(endpoint)
}

/// 更新接口
#[tauri::command]
pub async fn db_update_endpoint(
    endpoint: DbEndpoint,
    pool: State<'_, Arc<SqlitePool>>,
) -> AppResult<()> {
    sqlx::query(
        r#"UPDATE endpoints SET group_id = ?, name = ?, method = ?, path = ?,
           description = ?, "order" = ?, updated_at = ? WHERE id = ?"#,
    )
    .bind(&endpoint.group_id)
    .bind(&endpoint.name)
    .bind(&endpoint.method)
    .bind(&endpoint.path)
    .bind(&endpoint.description)
    .bind(endpoint.order)
    .bind(endpoint.updated_at)
    .bind(&endpoint.id)
    .execute(&**pool)
    .await
    .map_err(|e| AppError::Custom(format!("更新接口失败: {}", e)))?;

    Ok(())
}

/// 删除接口
#[tauri::command]
pub async fn db_delete_endpoint(id: String, pool: State<'_, Arc<SqlitePool>>) -> AppResult<()> {
    sqlx::query("DELETE FROM endpoints WHERE id = ?")
        .bind(&id)
        .execute(&**pool)
        .await
        .map_err(|e| AppError::Custom(format!("删除接口失败: {}", e)))?;

    Ok(())
}

// ========== Mock 规则 CRUD ==========

/// 获取所有 Mock 规则
#[tauri::command]
pub async fn db_get_mock_rules(pool: State<'_, Arc<SqlitePool>>) -> AppResult<Vec<DbMockRule>> {
    let rules = sqlx::query_as::<_, DbMockRule>(
        r#"SELECT id, endpoint_id, name, method, path, active, delay,
           status_code, headers, body_type, body, "order"
           FROM mock_rules ORDER BY "order""#,
    )
    .fetch_all(&**pool)
    .await
    .map_err(|e| AppError::Custom(format!("查询规则失败: {}", e)))?;

    Ok(rules)
}

/// 创建 Mock 规则
#[tauri::command]
pub async fn db_create_mock_rule(
    rule: DbMockRule,
    pool: State<'_, Arc<SqlitePool>>,
) -> AppResult<DbMockRule> {
    sqlx::query(
        r#"INSERT INTO mock_rules (id, endpoint_id, name, method, path, active, delay,
           status_code, headers, body_type, body, "order")
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(&rule.id)
    .bind(&rule.endpoint_id)
    .bind(&rule.name)
    .bind(&rule.method)
    .bind(&rule.path)
    .bind(rule.active)
    .bind(rule.delay)
    .bind(rule.status_code)
    .bind(&rule.headers)
    .bind(&rule.body_type)
    .bind(&rule.body)
    .bind(rule.order)
    .execute(&**pool)
    .await
    .map_err(|e| AppError::Custom(format!("创建规则失败: {}", e)))?;

    Ok(rule)
}

/// 更新 Mock 规则
#[tauri::command]
pub async fn db_update_mock_rule(
    rule: DbMockRule,
    pool: State<'_, Arc<SqlitePool>>,
) -> AppResult<()> {
    sqlx::query(
        r#"UPDATE mock_rules SET endpoint_id = ?, name = ?, method = ?, path = ?,
           active = ?, delay = ?, status_code = ?, headers = ?, body_type = ?,
           body = ?, "order" = ? WHERE id = ?"#,
    )
    .bind(&rule.endpoint_id)
    .bind(&rule.name)
    .bind(&rule.method)
    .bind(&rule.path)
    .bind(rule.active)
    .bind(rule.delay)
    .bind(rule.status_code)
    .bind(&rule.headers)
    .bind(&rule.body_type)
    .bind(&rule.body)
    .bind(rule.order)
    .bind(&rule.id)
    .execute(&**pool)
    .await
    .map_err(|e| AppError::Custom(format!("更新规则失败: {}", e)))?;

    Ok(())
}

/// 删除 Mock 规则
#[tauri::command]
pub async fn db_delete_mock_rule(id: String, pool: State<'_, Arc<SqlitePool>>) -> AppResult<()> {
    sqlx::query("DELETE FROM mock_rules WHERE id = ?")
        .bind(&id)
        .execute(&**pool)
        .await
        .map_err(|e| AppError::Custom(format!("删除规则失败: {}", e)))?;

    Ok(())
}
