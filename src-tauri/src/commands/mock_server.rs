// Mock 代理服务器模块
use crate::error::{AppError, AppResult};
use bytes::Bytes;
use http_body_util::Full;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{body::Incoming, Method, Request, Response, StatusCode};
use hyper_util::rt::TokioIo;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::net::TcpListener;
use tokio::sync::oneshot;

/// Mock 规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MockRule {
    pub id: String,
    pub method: String,
    pub path: String,
    pub status_code: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub delay_ms: u64,
    pub active: bool,
}

/// Mock 请求事件
#[derive(Debug, Clone, Serialize)]
pub struct MockRequestEvent {
    pub rule_id: String,
    pub template: String,
}

/// Mock 服务器状态
pub struct MockServerState {
    rules: RwLock<Vec<MockRule>>,
    shutdown_tx: RwLock<Option<oneshot::Sender<()>>>,
    running: RwLock<bool>,
    port: RwLock<u16>,
    app_handle: RwLock<Option<AppHandle>>,
    processed_bodies: RwLock<HashMap<String, String>>,
}

impl MockServerState {
    pub fn new() -> Self {
        Self {
            rules: RwLock::new(Vec::new()),
            shutdown_tx: RwLock::new(None),
            running: RwLock::new(false),
            port: RwLock::new(0),
            app_handle: RwLock::new(None),
            processed_bodies: RwLock::new(HashMap::new()),
        }
    }

    pub fn set_app_handle(&self, handle: AppHandle) {
        *self.app_handle.write() = Some(handle);
    }

    pub fn is_running(&self) -> bool {
        *self.running.read()
    }

    pub fn get_port(&self) -> u16 {
        *self.port.read()
    }
}

impl Default for MockServerState {
    fn default() -> Self {
        Self::new()
    }
}

/// 匹配请求的 Mock 规则
fn match_rule(rules: &[MockRule], method: &Method, path: &str) -> Option<MockRule> {
    rules.iter().find(|r| {
        r.active && r.method == method.as_str() && path_matches(&r.path, path)
    }).cloned()
}

/// 路径匹配（支持简单通配符）
fn path_matches(pattern: &str, path: &str) -> bool {
    if pattern == path {
        return true;
    }
    // 支持 /api/* 通配符
    if pattern.ends_with("/*") {
        let prefix = &pattern[..pattern.len() - 1];
        return path.starts_with(prefix);
    }
    // 支持路径参数 /api/:id
    let pattern_parts: Vec<&str> = pattern.split('/').collect();
    let path_parts: Vec<&str> = path.split('/').collect();
    if pattern_parts.len() != path_parts.len() {
        return false;
    }
    pattern_parts.iter().zip(path_parts.iter()).all(|(p, actual)| {
        p.starts_with(':') || *p == *actual
    })
}

/// 处理 HTTP 请求
async fn handle_request(
    req: Request<Incoming>,
    state: Arc<MockServerState>,
) -> Result<Response<Full<Bytes>>, hyper::Error> {
    let method = req.method().clone();
    let path = req.uri().path().to_string();

    println!("收到请求: {} {}", method, path);

    let matched_rule = {
        let rules = state.rules.read();
        match_rule(&rules, &method, &path)
    };

    if let Some(rule) = matched_rule {
        // 发送事件到前端处理 Mock.js
        let app_handle_opt = state.app_handle.read().clone();
        if let Some(app_handle) = app_handle_opt {
            let event = MockRequestEvent {
                rule_id: rule.id.clone(),
                template: rule.body.clone(),
            };
            let _ = app_handle.emit("mock-request", event);

            // 等待前端处理
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }

        // 获取处理后的 body
        let body = {
            let bodies = state.processed_bodies.read();
            bodies.get(&rule.id).cloned().unwrap_or(rule.body.clone())
        };

        // 模拟延迟
        if rule.delay_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(rule.delay_ms)).await;
        }

        let mut response = Response::builder()
            .status(StatusCode::from_u16(rule.status_code).unwrap_or(StatusCode::OK));

        for (key, value) in &rule.headers {
            response = response.header(key.as_str(), value.as_str());
        }

        if !rule.headers.contains_key("content-type") {
            response = response.header("content-type", "application/json");
        }

        Ok(response.body(Full::new(Bytes::from(body))).unwrap())
    } else {
        Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .header("content-type", "application/json")
            .body(Full::new(Bytes::from(r#"{"error":"No matching mock rule"}"#)))
            .unwrap())
    }
}

/// 启动 Mock 服务器
#[tauri::command]
pub async fn start_mock_server(
    port: u16,
    state: tauri::State<'_, Arc<MockServerState>>,
) -> AppResult<u16> {
    if state.is_running() {
        return Err(AppError::Custom("Mock 服务器已在运行".into()));
    }

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = TcpListener::bind(addr).await
        .map_err(|e| AppError::Custom(format!("绑定端口失败: {}", e)))?;

    let actual_port = listener.local_addr()
        .map_err(|e| AppError::Custom(format!("获取端口失败: {}", e)))?
        .port();

    let (shutdown_tx, mut shutdown_rx) = oneshot::channel::<()>();

    {
        let mut tx = state.shutdown_tx.write();
        *tx = Some(shutdown_tx);
        *state.running.write() = true;
        *state.port.write() = actual_port;
    }

    let state_clone = Arc::clone(&state);

    tokio::spawn(async move {
        loop {
            tokio::select! {
                result = listener.accept() => {
                    match result {
                        Ok((stream, _)) => {
                            let io = TokioIo::new(stream);
                            let state = Arc::clone(&state_clone);

                            tokio::spawn(async move {
                                let service = service_fn(move |req| {
                                    let state = Arc::clone(&state);
                                    async move { handle_request(req, state).await }
                                });

                                if let Err(e) = http1::Builder::new()
                                    .serve_connection(io, service)
                                    .await
                                {
                                    eprintln!("连接处理错误: {}", e);
                                }
                            });
                        }
                        Err(e) => {
                            eprintln!("接受连接失败: {}", e);
                        }
                    }
                }
                _ = &mut shutdown_rx => {
                    break;
                }
            }
        }
    });

    Ok(actual_port)
}

/// 停止 Mock 服务器
#[tauri::command]
pub async fn stop_mock_server(
    state: tauri::State<'_, Arc<MockServerState>>,
) -> AppResult<()> {
    if !state.is_running() {
        return Err(AppError::Custom("Mock 服务器未运行".into()));
    }

    let tx = state.shutdown_tx.write().take();
    if let Some(tx) = tx {
        let _ = tx.send(());
    }

    *state.running.write() = false;
    *state.port.write() = 0;

    Ok(())
}

/// 获取 Mock 服务器状态
#[tauri::command]
pub fn get_mock_server_status(
    state: tauri::State<'_, Arc<MockServerState>>,
) -> AppResult<MockServerStatus> {
    Ok(MockServerStatus {
        running: state.is_running(),
        port: state.get_port(),
    })
}

#[derive(Serialize)]
pub struct MockServerStatus {
    pub running: bool,
    pub port: u16,
}

/// 更新 Mock 规则
#[tauri::command]
pub fn update_mock_rules(
    rules: Vec<MockRule>,
    state: tauri::State<'_, Arc<MockServerState>>,
) -> AppResult<()> {
    println!("收到规则更新: {} 条", rules.len());
    for rule in &rules {
        println!("  规则: {} {} active={}", rule.method, rule.path, rule.active);
    }
    let mut server_rules = state.rules.write();
    *server_rules = rules;
    println!("规则已更新到服务器状态");
    Ok(())
}

/// 更新指定规则的响应体（用于动态 Mock.js 处理）
#[tauri::command]
pub fn update_rule_body(
    rule_id: String,
    body: String,
    state: tauri::State<'_, Arc<MockServerState>>,
) -> AppResult<()> {
    let mut bodies = state.processed_bodies.write();
    bodies.insert(rule_id, body);
    Ok(())
}
