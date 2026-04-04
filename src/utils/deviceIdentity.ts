/**
 * 设备身份管理
 * 基于 WebCrypto API 实现 Ed25519 密钥对生成、签名和验证
 */

export interface DeviceIdentity {
  deviceId: string
  publicKeyBase64Url: string
  privateKey: CryptoKey
  createdAt: number
}

export interface StoredIdentity {
  deviceId: string
  publicKeyBase64Url: string
  privateKeyJwk: JsonWebKey
  createdAt: number
}

const DEVICE_IDENTITY_KEY = 'clawdesk_device_identity'

/**
 * 从公钥派生设备 ID (SHA-256 哈希)
 */
async function deriveDeviceId(publicKey: CryptoKey): Promise<string> {
  const publicKeyRaw = await crypto.subtle.exportKey('raw', publicKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', publicKeyRaw)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 将 ArrayBuffer 转换为 Base64URL 字符串
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * 生成新的设备身份
 */
async function generateIdentity(): Promise<DeviceIdentity> {
  // 生成 Ed25519 密钥对
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true, // 可导出
    ['sign', 'verify']
  )

  // 导出公钥为原始格式
  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey)
  const publicKeyBase64Url = arrayBufferToBase64Url(publicKeyRaw)

  // 派生设备 ID
  const deviceId = await deriveDeviceId(keyPair.publicKey)

  return {
    deviceId,
    publicKeyBase64Url,
    privateKey: keyPair.privateKey,
    createdAt: Date.now()
  }
}

/**
 * 存储设备身份到 localStorage
 */
async function storeIdentity(identity: DeviceIdentity): Promise<void> {
  // 导出私钥为 JWK 格式
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', identity.privateKey)

  const stored: StoredIdentity = {
    deviceId: identity.deviceId,
    publicKeyBase64Url: identity.publicKeyBase64Url,
    privateKeyJwk,
    createdAt: identity.createdAt
  }

  localStorage.setItem(DEVICE_IDENTITY_KEY, JSON.stringify(stored))
}

/**
 * 从 localStorage 加载设备身份
 */
async function loadIdentity(): Promise<DeviceIdentity | null> {
  const storedStr = localStorage.getItem(DEVICE_IDENTITY_KEY)
  if (!storedStr) return null

  try {
    const stored: StoredIdentity = JSON.parse(storedStr)

    // 从 JWK 导入私钥
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      stored.privateKeyJwk,
      { name: 'Ed25519' },
      true,
      ['sign']
    )

    return {
      deviceId: stored.deviceId,
      publicKeyBase64Url: stored.publicKeyBase64Url,
      privateKey,
      createdAt: stored.createdAt
    }
  } catch (e) {
    console.error('[DeviceIdentity] Failed to load identity:', e)
    return null
  }
}

/**
 * 加载或创建设备身份
 */
export async function loadOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  const existing = await loadIdentity()
  if (existing) {
    console.log('[DeviceIdentity] Loaded existing identity:', existing.deviceId)
    return existing
  }

  console.log('[DeviceIdentity] Generating new identity...')
  const identity = await generateIdentity()
  await storeIdentity(identity)
  console.log('[DeviceIdentity] Created new identity:', identity.deviceId)
  return identity
}

/**
 * 签名 payload
 * @param identity 设备身份
 * @param payload 要签名的字符串
 * @returns Base64URL 编码的签名
 */
export async function signPayload(
  identity: DeviceIdentity,
  payload: string
): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(payload)

  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    identity.privateKey,
    data
  )

  return arrayBufferToBase64Url(signature)
}

/**
 * 构建 v2 签名 payload
 * 格式: v2|device-id|client-id|client-mode|role|scopes|timestamp|token|nonce
 */
export function buildSignaturePayload(params: {
  deviceId: string
  clientId: string
  mode: string
  role: string
  scopes: string[]
  timestamp: number
  token: string
  nonce: string
}): string {
  const parts = [
    'v2',
    params.deviceId,
    params.clientId,
    params.mode,
    params.role,
    params.scopes.join(','),
    String(params.timestamp),
    params.token || '',
    params.nonce
  ]
  return parts.join('|')
}

/**
 * 获取当前平台标识
 */
export function getPlatform(): string {
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'windows'
  if (ua.includes('Mac')) return 'macos'
  if (ua.includes('Linux')) return 'linux'
  return 'unknown'
}

/**
 * 获取设备家族
 */
export function getDeviceFamily(): string {
  return 'desktop'
}
