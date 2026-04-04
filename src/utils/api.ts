import { invoke } from '@tauri-apps/api/core'

/**
 * OpenClaw 安装状态
 */
export interface OpenClawStatus {
  installed: boolean
  version?: string
}

/**
 * 读取 OpenClaw 配置
 */
export async function readOpenClawConfig(): Promise<{ gatewayToken: string; port: number } | null> {
  try {
    const result = await invoke<{ gatewayToken: string; port: number } | null>('read_openclaw_config')
    return result
  } catch {
    return null
  }
}

/**
 * 检查 OpenClaw 是否已安装
 */
export async function checkOpenClawInstalled(): Promise<OpenClawStatus> {
  try {
    const result = await invoke<OpenClawStatus>('check_openclaw_installed')
    return result
  } catch {
    return { installed: false }
  }
}

/**
 * 服务状态
 */
export interface ServiceStatus {
  running: boolean
  port: number
  pid?: number
  uptime?: number
  lastError?: string
}

/**
 * 启动 Gateway 服务
 */
export async function startGateway(port: number, force: boolean = false): Promise<ServiceStatus> {
  try {
    const result = await invoke<{
      success: boolean
      pid: number
      port: number
    }>('start_gateway', { port, force })
    
    return {
      running: true,
      port: result.port,
      pid: result.pid,
      uptime: 0
    }
  } catch (error) {
    throw new Error(`启动服务失败: ${error}`)
  }
}

/**
 * 停止 Gateway 服务
 */
export async function stopGateway(): Promise<void> {
  try {
    await invoke('stop_gateway')
  } catch (error) {
    throw new Error(`停止服务失败: ${error}`)
  }
}

/**
 * 获取 Gateway 状态
 */
export async function getGatewayStatus(): Promise<ServiceStatus> {
  try {
    const result = await invoke<ServiceStatus>('get_gateway_status')
    return result
  } catch (error) {
    return {
      running: false,
      port: 18789,
      lastError: String(error)
    }
  }
}

/**
 * 读取配置
 */
export async function readConfig<T>(key: string): Promise<T | null> {
  try {
    const result = await invoke<T | null>('read_config', { key })
    return result
  } catch {
    return null
  }
}

/**
 * 写入配置
 */
export async function writeConfig<T>(key: string, value: T): Promise<void> {
  try {
    await invoke('write_config', { key, value })
  } catch (error) {
    throw new Error(`保存配置失败: ${error}`)
  }
}
