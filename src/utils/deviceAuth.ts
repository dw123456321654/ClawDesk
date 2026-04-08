/**
 * 设备 Token 存储
 * 用于存储 Gateway 颁发的 device token，实现自动重试机制
 */

export interface DeviceAuthEntry {
  deviceId: string
  role: string
  token: string
  scopes: string[]
  issuedAt: number
}

interface DeviceAuthStore {
  version: 1
  deviceId: string
  tokens: Record<string, DeviceAuthEntry> // role -> entry
}

const STORAGE_KEY = 'clawdesk_device_auth_v1'

function readStore(): DeviceAuthStore | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    
    const parsed = JSON.parse(raw) as DeviceAuthStore
    if (!parsed || parsed.version !== 1) return null
    if (!parsed.deviceId || typeof parsed.deviceId !== 'string') return null
    if (!parsed.tokens || typeof parsed.tokens !== 'object') return null
    
    return parsed
  } catch {
    return null
  }
}

function writeStore(store: DeviceAuthStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // best-effort
  }
}

/**
 * 加载设备 Token
 */
export function loadDeviceAuthToken(params: {
  deviceId: string
  role: string
}): DeviceAuthEntry | null {
  const store = readStore()
  if (!store) return null
  
  // 设备 ID 必须匹配
  if (store.deviceId !== params.deviceId) return null
  
  return store.tokens[params.role] || null
}

/**
 * 存储设备 Token
 */
export function storeDeviceAuthToken(params: {
  deviceId: string
  role: string
  token: string
  scopes?: string[]
}): DeviceAuthEntry {
  let store = readStore()
  
  // 如果 store 不存在或设备 ID 不匹配，创建新的
  if (!store || store.deviceId !== params.deviceId) {
    store = {
      version: 1,
      deviceId: params.deviceId,
      tokens: {}
    }
  }
  
  const entry: DeviceAuthEntry = {
    deviceId: params.deviceId,
    role: params.role,
    token: params.token,
    scopes: params.scopes || [],
    issuedAt: Date.now()
  }
  
  store.tokens[params.role] = entry
  writeStore(store)
  
  console.log('[DeviceAuth] Stored token for role:', params.role)
  return entry
}

/**
 * 清除设备 Token
 */
export function clearDeviceAuthToken(params: {
  deviceId: string
  role: string
}): void {
  const store = readStore()
  if (!store) return
  
  if (store.deviceId !== params.deviceId) return
  
  delete store.tokens[params.role]
  writeStore(store)
  
  console.log('[DeviceAuth] Cleared token for role:', params.role)
}

/**
 * 检查 token 是否有指定 scope
 */
export function hasScope(entry: DeviceAuthEntry, scope: string): boolean {
  return entry.scopes.includes(scope)
}
