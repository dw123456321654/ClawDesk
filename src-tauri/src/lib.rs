use tauri::Manager;

/// 读取 OpenClaw 配置
#[tauri::command]
async fn read_openclaw_config() -> Result<serde_json::Value, String> {
    use std::fs;
    use std::path::PathBuf;
    
    // OpenClaw 配置文件在用户主目录下：~/.openclaw/openclaw.json
    // Windows: C:\Users\xxx\.openclaw\openclaw.json
    // Linux/macOS: ~/.openclaw/openclaw.json
    let config_path = if cfg!(target_os = "windows") {
        std::env::var("USERPROFILE")
            .map(|p| PathBuf::from(p).join(".openclaw").join("openclaw.json"))
            .unwrap_or_else(|_| {
                dirs::config_dir()
                    .unwrap_or_default()
                    .parent()
                    .map(|p| p.join(".openclaw").join("openclaw.json"))
                    .unwrap_or_default()
            })
    } else {
        dirs::home_dir()
            .map(|p| p.join(".openclaw").join("openclaw.json"))
            .unwrap_or_default()
    };
    
    if !config_path.exists() {
        return Ok(serde_json::json!(null));
    }
    
    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("读取配置失败: {}", e))?;
    
    let config: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("解析配置失败: {}", e))?;
    
    // 提取 gateway token
    let token = config
        .get("gateway")
        .and_then(|g| g.get("auth"))
        .and_then(|a| a.get("token"))
        .and_then(|t| t.as_str())
        .unwrap_or("");
    
    Ok(serde_json::json!({
        "gatewayToken": token,
        "port": config.get("gateway").and_then(|g| g.get("port")).and_then(|p| p.as_u64()).unwrap_or(18789)
    }))
}

/// 检查 OpenClaw 是否已安装
#[tauri::command]
async fn check_openclaw_installed() -> Result<serde_json::Value, String> {
    use std::process::Command;
    
    #[cfg(target_os = "windows")]
    let output = Command::new("cmd")
        .args(["/C", "openclaw", "--version"])
        .output();
    
    #[cfg(not(target_os = "windows"))]
    let output = Command::new("openclaw")
        .args(["--version"])
        .output();
    
    match output {
        Ok(output) => {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                Ok(serde_json::json!({
                    "installed": true,
                    "version": version
                }))
            } else {
                Ok(serde_json::json!({
                    "installed": false,
                    "version": null
                }))
            }
        }
        Err(_) => {
            Ok(serde_json::json!({
                "installed": false,
                "version": null
            }))
        }
    }
}

/// 启动 Gateway 服务
#[tauri::command]
async fn start_gateway(port: u16, force: bool) -> Result<serde_json::Value, String> {
    use std::process::Command;
    
    #[cfg(target_os = "windows")]
    let mut cmd = {
        let mut c = Command::new("cmd");
        c.args(["/C", "openclaw", "gateway", "--port", &port.to_string()]);
        c
    };
    
    #[cfg(not(target_os = "windows"))]
    let mut cmd = {
        let mut c = Command::new("openclaw");
        c.arg("gateway").arg("--port").arg(port.to_string());
        c
    };
    
    if force {
        cmd.arg("--force");
    }
    
    match cmd.spawn() {
        Ok(child) => {
            let pid = child.id();
            Ok(serde_json::json!({
                "success": true,
                "pid": pid,
                "port": port
            }))
        }
        Err(e) => Err(format!("启动服务失败: {}", e))
    }
}

/// 停止 Gateway 服务
#[tauri::command]
async fn stop_gateway() -> Result<(), String> {
    use std::process::Command;
    
    #[cfg(target_os = "windows")]
    let output = Command::new("cmd")
        .args(["/C", "openclaw", "gateway", "stop"])
        .output();
    
    #[cfg(not(target_os = "windows"))]
    let output = Command::new("openclaw")
        .args(["gateway", "stop"])
        .output();
    
    let output = output.map_err(|e| format!("停止服务失败: {}", e))?;
    
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// 获取 Gateway 状态
#[tauri::command]
async fn get_gateway_status() -> Result<serde_json::Value, String> {
    use std::process::Command;
    
    // 尝试通过 openclaw status 命令检查
    #[cfg(target_os = "windows")]
    let output = Command::new("cmd")
        .args(["/C", "openclaw", "status"])
        .output();
    
    #[cfg(not(target_os = "windows"))]
    let output = Command::new("openclaw")
        .args(["status"])
        .output();
    
    match output {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                // 检查 Gateway 状态
                let running = stdout.to_lowercase().contains("running") 
                    || stdout.to_lowercase().contains("active")
                    || stdout.to_lowercase().contains("reachable")
                    || stdout.contains("18789")
                    || stdout.contains("ws://127.0.0.1:18789");
                
                Ok(serde_json::json!({
                    "running": running,
                    "port": 18789,
                    "uptime": 0,
                    "raw": stdout.to_string()
                }))
            } else {
                Ok(serde_json::json!({
                    "running": false,
                    "port": 18789,
                    "uptime": 0
                }))
            }
        }
        Err(_) => {
            // 如果 openclaw 命令不存在，尝试 HTTP 检查
            // TODO: 实现通过 HTTP 检查 Gateway 状态
            Ok(serde_json::json!({
                "running": false,
                "port": 18789,
                "uptime": 0
            }))
        }
    }
}

/// 读取配置
#[tauri::command]
async fn read_config(key: String) -> Result<serde_json::Value, String> {
    // TODO: 实现配置读取
    Ok(serde_json::json!(null))
}

/// 写入配置
#[tauri::command]
async fn write_config(key: String, value: serde_json::Value) -> Result<(), String> {
    // TODO: 实现配置写入
    Ok(())
}

/// 保存任务检查点
#[tauri::command]
async fn save_task_checkpoint(
    project_path: String,
    task_data: serde_json::Value,
) -> Result<String, String> {
    use std::fs;
    use std::path::PathBuf;
    
    let task_dir = PathBuf::from(&project_path).join(".clawdesk");
    let task_file = task_dir.join("task.json");
    
    // 创建目录
    if !task_dir.exists() {
        fs::create_dir_all(&task_dir)
            .map_err(|e| format!("创建目录失败: {}", e))?;
    }
    
    // 写入文件
    let content = serde_json::to_string_pretty(&task_data)
        .map_err(|e| format!("序列化失败: {}", e))?;
    
    fs::write(&task_file, content)
        .map_err(|e| format!("写入文件失败: {}", e))?;
    
    Ok(task_file.to_string_lossy().to_string())
}

/// 读取任务检查点
#[tauri::command]
async fn load_task_checkpoint(project_path: String) -> Result<serde_json::Value, String> {
    use std::fs;
    use std::path::PathBuf;
    
    let task_file = PathBuf::from(&project_path).join(".clawdesk/task.json");
    
    if !task_file.exists() {
        return Ok(serde_json::json!(null));
    }
    
    let content = fs::read_to_string(&task_file)
        .map_err(|e| format!("读取文件失败: {}", e))?;
    
    let task_data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("解析失败: {}", e))?;
    
    Ok(task_data)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            read_openclaw_config,
            check_openclaw_installed,
            start_gateway,
            stop_gateway,
            get_gateway_status,
            read_config,
            write_config,
            save_task_checkpoint,
            load_task_checkpoint
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
