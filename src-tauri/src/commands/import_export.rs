// 导入导出命令
use crate::db::{DbEndpoint, DbGroup, DbMockRule};
use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};

/// 导出数据结构
#[derive(Debug, Serialize, Deserialize)]
pub struct ExportData {
    pub version: String,
    pub groups: Vec<DbGroup>,
    pub endpoints: Vec<DbEndpoint>,
    pub mock_rules: Vec<DbMockRule>,
}

/// 导出所有数据为 JSON
#[tauri::command]
pub fn export_to_json(
    groups: Vec<DbGroup>,
    endpoints: Vec<DbEndpoint>,
    mock_rules: Vec<DbMockRule>,
) -> AppResult<String> {
    let data = ExportData {
        version: "1.0".to_string(),
        groups,
        endpoints,
        mock_rules,
    };

    serde_json::to_string_pretty(&data)
        .map_err(|e| AppError::Custom(format!("导出失败: {}", e)))
}

/// 从 JSON 导入数据
#[tauri::command]
pub fn import_from_json(json: String) -> AppResult<ExportData> {
    serde_json::from_str(&json)
        .map_err(|e| AppError::Custom(format!("导入失败: {}", e)))
}
