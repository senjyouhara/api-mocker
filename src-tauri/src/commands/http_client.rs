// HTTP 客户端命令
use crate::error::{AppError, AppResult};
use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use futures_util::StreamExt;

#[derive(Debug, Deserialize)]
pub struct HttpRequest {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
    pub proxy: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct HttpResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub duration: u64,
    #[serde(rename = "isBase64")]
    pub is_base64: bool,
    #[serde(rename = "contentType")]
    pub content_type: Option<String>,
}

/// 根据代理配置构建 reqwest Client
fn build_client(proxy: &Option<String>) -> AppResult<Client> {
    let mut builder = Client::builder();
    if let Some(proxy_url) = proxy {
        if !proxy_url.is_empty() {
            let p = reqwest::Proxy::all(proxy_url)
                .map_err(|e| AppError::Custom(format!("代理配置无效: {}", e)))?;
            builder = builder.proxy(p);
        }
    }
    builder.build().map_err(|e| AppError::Custom(format!("创建 HTTP 客户端失败: {}", e)))
}

#[tauri::command]
pub async fn send_http_request(request: HttpRequest) -> AppResult<HttpResponse> {
    let client = build_client(&request.proxy)?;
    let start = Instant::now();

    // 构建请求
    let method = request.method.parse().unwrap_or(reqwest::Method::GET);
    let mut req_builder = client.request(method, &request.url);

    // 添加请求头
    for (key, value) in &request.headers {
        req_builder = req_builder.header(key, value);
    }

    // 添加请求体
    if let Some(body) = request.body {
        req_builder = req_builder.body(body);
    }

    // 发送请求
    let response = req_builder.send().await?;
    let duration = start.elapsed().as_millis() as u64;

    // 解析响应头
    let mut headers = HashMap::new();
    for (key, value) in response.headers() {
        if let Ok(v) = value.to_str() {
            headers.insert(key.to_string(), v.to_string());
        }
    }

    let status = response.status().as_u16();

    // 获取 Content-Type
    let content_type = headers.get("content-type").cloned();

    // 判断是否为二进制内容（图片、音频、视频等）
    let is_binary = content_type.as_ref().map_or(false, |ct| {
        ct.starts_with("image/")
            || ct.starts_with("audio/")
            || ct.starts_with("video/")
            || ct.starts_with("application/octet-stream")
    });

    let (body, is_base64) = if is_binary {
        // 二进制内容使用 base64 编码
        let bytes = response.bytes().await.unwrap_or_default();
        (STANDARD.encode(&bytes), true)
    } else {
        // 文本内容直接返回
        (response.text().await.unwrap_or_default(), false)
    };

    Ok(HttpResponse {
        status,
        headers,
        body,
        duration,
        is_base64,
        content_type,
    })
}

// 流式响应事件
#[derive(Debug, Clone, Serialize)]
pub struct StreamChunk {
    pub request_id: String,
    pub chunk: String,  // base64 编码的数据块
    pub done: bool,
    pub chunk_index: u32,      // 当前块号
    pub received_bytes: u64,   // 已接收字节数
}

#[derive(Debug, Clone, Serialize)]
pub struct StreamStart {
    pub request_id: String,
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub content_type: Option<String>,
    pub content_length: Option<u64>,
}

// 流式 HTTP 请求（用于图片等二进制内容的渐进式加载）
#[tauri::command(rename_all = "camelCase")]
pub async fn send_http_request_stream(
    app: AppHandle,
    request: HttpRequest,
    request_id: String,
) -> AppResult<()> {
    let client = build_client(&request.proxy)?;

    // 构建请求
    let method = request.method.parse().unwrap_or(reqwest::Method::GET);
    let mut req_builder = client.request(method, &request.url);

    // 添加请求头
    for (key, value) in &request.headers {
        req_builder = req_builder.header(key, value);
    }

    // 添加请求体
    if let Some(body) = request.body {
        req_builder = req_builder.body(body);
    }

    // 发送请求
    let response = req_builder.send().await?;

    // 解析响应头
    let mut headers = HashMap::new();
    for (key, value) in response.headers() {
        if let Ok(v) = value.to_str() {
            headers.insert(key.to_string(), v.to_string());
        }
    }

    let status = response.status().as_u16();
    let content_type = headers.get("content-type").cloned();
    let content_length = response.content_length();

    // 发送开始事件
    let _ = app.emit("http-stream-start", StreamStart {
        request_id: request_id.clone(),
        status,
        headers,
        content_type,
        content_length,
    });

    // 流式读取响应体，收集所有字节
    let mut all_bytes = Vec::new();
    let mut stream = response.bytes_stream();
    let mut chunk_count: u32 = 0;

    while let Some(chunk_result) = stream.next().await {
        if let Ok(chunk) = chunk_result {
            all_bytes.extend_from_slice(&chunk);
            chunk_count += 1;
            // 发送进度事件
            let _ = app.emit("http-stream-chunk", StreamChunk {
                request_id: request_id.clone(),
                chunk: String::new(),
                done: false,
                chunk_index: chunk_count,
                received_bytes: all_bytes.len() as u64,
            });
        }
    }

    // 发送完成事件（包含完整的 base64 编码数据）
    let _ = app.emit("http-stream-chunk", StreamChunk {
        request_id: request_id.clone(),
        chunk: STANDARD.encode(&all_bytes),
        done: true,
        chunk_index: chunk_count,
        received_bytes: all_bytes.len() as u64,
    });

    Ok(())
}
