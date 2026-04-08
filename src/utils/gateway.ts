/**
 * Gateway WebSocket 客户端
 * 基于 OpenClaw Gateway Protocol v3
 */

import {
  DeviceIdentity,
  loadOrCreateDeviceIdentity,
  signPayload,
  buildSignaturePayload,
  getPlatform
} from './deviceIdentity'
import {
  loadDeviceAuthToken,
  storeDeviceAuthToken,
  clearDeviceAuthToken
} from './deviceAuth'

export interface GatewayMessage {
  type: 'req' | 'res' | 'event'
  id?: string
  method?: string
  params?: Record<string, unknown>
  event?: string
  payload?: unknown
  ok?: boolean
  error?: { message: string; code?: string; details?: { code?: string } }
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  pending?: boolean
}

type MessageHandler = (msg: GatewayMessage) => void
type EventHandler = (event: string, payload: unknown) => void

export class GatewayClient {
  private ws: WebSocket | null = null
  private url: string
  private token: string
  private requestId = 0
  private pendingRequests = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()
  private messageHandlers: MessageHandler[] = []
  private eventHandlers: EventHandler[] = []
  private connected = false
  private deviceIdentity: DeviceIdentity | null = null
  
  // Token 重试机制
  private pendingDeviceTokenRetry = false
  private deviceTokenRetryBudgetUsed = false
  
  // 自动重连（指数退避）
  private closed = false
  private backoffMs = 800
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  // 状态回调
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void
  onMessage?: (msg: ChatMessage) => void

  constructor(url: string = 'ws://127.0.0.1:18789', token: string = '') {
    this.url = url
    this.token = token
  }

  /**
   * 设置 token
   */
  setToken(token: string) {
    this.token = token
  }

  /**
   * 设置端口
   */
  setPort(port: number) {
    this.url = `ws://127.0.0.1:${port}`
  }

  /**
   * 连接 Gateway
   */
  async connect(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.onStatusChange?.('connecting')

      // 加载或创建设备身份
      try {
        this.deviceIdentity = await loadOrCreateDeviceIdentity()
        console.log('[Gateway] Device identity loaded:', this.deviceIdentity.deviceId)
      } catch (e) {
        console.error('[Gateway] Failed to load device identity:', e)
        reject(new Error('无法加载设备身份'))
        return
      }

      this.ws = new WebSocket(this.url)

      const connectTimeout = setTimeout(() => {
        if (!this.connected) {
          this.ws?.close()
          reject(new Error('连接超时'))
        }
      }, 30000)

      this.ws.onopen = () => {
        console.log('[Gateway] WebSocket opened, waiting for challenge...')
      }

      this.ws.onmessage = (event) => {
        try {
          const msg: GatewayMessage = JSON.parse(event.data)
          this.handleMessage(msg, resolve, reject, connectTimeout)
        } catch (e) {
          console.error('[Gateway] Parse error:', e)
        }
      }

      this.ws.onerror = (error) => {
        console.error('[Gateway] WebSocket error:', error)
        clearTimeout(connectTimeout)
        this.onStatusChange?.('error')
        reject(new Error('WebSocket 连接失败'))
      }

      this.ws.onclose = (event) => {
        console.log('[Gateway] WebSocket closed:', event.code, event.reason)
        clearTimeout(connectTimeout)
        this.connected = false
        this.onStatusChange?.('disconnected')
        
        // 非主动关闭时自动重连
        if (!this.closed) {
          this.scheduleReconnect()
        }
      }
    })
  }

  /**
   * 处理消息
   */
  private handleMessage(
    msg: GatewayMessage,
    connectResolve?: () => void,
    connectReject?: (error: Error) => void,
    connectTimeout?: ReturnType<typeof setTimeout>
  ) {
    // 处理 challenge
    if (msg.type === 'event' && msg.event === 'connect.challenge') {
      console.log('[Gateway] Received challenge:', msg.payload)
      const challenge = msg.payload as { nonce: string; ts: number }
      this.sendConnect(challenge.nonce)
      return
    }

    // 处理连接响应
    if (msg.type === 'res') {
      if (msg.ok) {
        // 连接成功
        if (!this.connected) {
          clearTimeout(connectTimeout)
          this.connected = true
          this.backoffMs = 800  // 重置退避延迟
          this.onStatusChange?.('connected')
          console.log('[Gateway] Connected successfully')
          connectResolve?.()

          // 处理 hello-ok 中的设备 token
          const payload = msg.payload as {
            auth?: {
              deviceToken?: string
              role?: string
              scopes?: string[]
            }
          }
          if (payload?.auth?.deviceToken && this.deviceIdentity) {
            storeDeviceAuthToken({
              deviceId: this.deviceIdentity.deviceId,
              role: payload.auth.role || 'operator',
              token: payload.auth.deviceToken,
              scopes: payload.auth.scopes
            })
            console.log('[Gateway] Stored device token for role:', payload.auth.role)
            
            // 重置重试状态
            this.pendingDeviceTokenRetry = false
            this.deviceTokenRetryBudgetUsed = false
          }
        }

        // 处理其他响应
        const pending = this.pendingRequests.get(msg.id || '')
        if (pending) {
          this.pendingRequests.delete(msg.id || '')
          pending.resolve(msg.payload)
        }
        return
      } else {
        // 错误响应
        const pending = this.pendingRequests.get(msg.id || '')
        if (pending) {
          this.pendingRequests.delete(msg.id || '')
          pending.reject(new Error(msg.error?.message || '请求失败'))
          return
        }

        // 连接失败
        if (!this.connected) {
          clearTimeout(connectTimeout)
          const errorCode = msg.error?.details?.code || msg.error?.code || 'UNKNOWN'
          const errorMsg = msg.error?.message || '连接失败'
          console.error('[Gateway] Connect failed:', errorCode, errorMsg)
          
          // 处理 AUTH_TOKEN_MISMATCH：清除存储的 token 并重试一次
          if (errorCode === 'AUTH_TOKEN_MISMATCH' && this.deviceIdentity && !this.deviceTokenRetryBudgetUsed) {
            console.log('[Gateway] Token mismatch, clearing stored token and retrying...')
            clearDeviceAuthToken({
              deviceId: this.deviceIdentity.deviceId,
              role: 'operator'
            })
            this.pendingDeviceTokenRetry = true
            this.deviceTokenRetryBudgetUsed = true
            
            // 关闭当前连接并重试
            this.ws?.close()
            this.ws = null
            setTimeout(() => void this.connect(), 1000)
            return
          }
          
          connectReject?.(new Error(`${errorMsg} (${errorCode})`))
        }
        return
      }
    }

    // 处理事件
    if (msg.type === 'event') {
      console.log('[Gateway] Event:', msg.event, msg.payload)
      this.eventHandlers.forEach(h => h(msg.event || '', msg.payload))

      // 处理聊天相关事件
      if (msg.event === 'agent.message' || msg.event === 'chat.message') {
        this.handleChatEvent(msg)
      } else if (msg.event === 'chat') {
        this.handleChatEvent(msg)
      } else if (msg.event === 'agent') {
        this.handleAgentEvent(msg)
      }
      return
    }

    // 通知所有处理器
    this.messageHandlers.forEach(h => h(msg))
  }

  /**
   * 发送连接请求
   */
  private async sendConnect(nonce: string) {
    if (!this.deviceIdentity) {
      console.error('[Gateway] No device identity')
      return
    }

    const client = 'cli'
    const platform = getPlatform()
    const deviceId = this.deviceIdentity.deviceId
    const role = 'operator'
    const scopes = ['operator.read', 'operator.write']
    const token = this.token
    const mode = 'webchat'
    const timestamp = Date.now()

    // 检查是否有存储的 device token
    const storedToken = loadDeviceAuthToken({ deviceId, role })
    
    // 如果没有显式 token 且有存储的 token，使用存储的 token
    const resolvedToken = token || storedToken?.token || ''

    // 构建签名 payload (v2格式)
    const signaturePayload = buildSignaturePayload({
      deviceId,
      clientId: client,
      mode,
      role,
      scopes,
      timestamp,
      token: resolvedToken,
      nonce
    })

    // 签名
    const signature = await signPayload(this.deviceIdentity, signaturePayload)

    const connectReq: GatewayMessage = {
      type: 'req',
      id: this.nextId(),
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: client,
          version: '0.1.0',
          platform,
          mode: 'webchat'
        },
        role,
        scopes,
        caps: [],
        commands: [],
        permissions: {},
        auth: { token },
        locale: 'zh-CN',
        userAgent: 'ClawDesk/0.1.0',
        device: {
          id: deviceId,
          publicKey: this.deviceIdentity.publicKeyBase64Url,
          signature,
          signedAt: timestamp,
          nonce
        }
      }
    }

    console.log('[Gateway] Sending connect request...')
    this.send(connectReq)
  }

  /**
   * 处理聊天事件
   */
  private handleChatEvent(msg: GatewayMessage) {
    const payload = msg.payload as Record<string, unknown>
    const message = payload.message as Record<string, unknown> | undefined
    
    if (!message) {
      console.log('[Gateway] No message in chat event')
      return
    }

    // 处理 content 格式：可能是字符串或数组
    let content = ''
    if (typeof message.content === 'string') {
      content = message.content
    } else if (Array.isArray(message.content)) {
      content = message.content
        .filter((item: { type?: string; text?: string }) => item.type === 'text')
        .map((item: { type?: string; text?: string }) => item.text || '')
        .join('')
    } else if (message.content && typeof message.content === 'object') {
      content = JSON.stringify(message.content)
    }

    // 转换为 ChatMessage 格式
    // 使用时间戳+随机数确保 ID 唯一
    const uniqueId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const chatMsg: ChatMessage = {
      id: uniqueId,
      role: (message.role as 'user' | 'assistant' | 'system') || 'assistant',
      content,
      timestamp: (message.timestamp as number) || Date.now(),
      pending: payload.state === 'delta'
    }

    this.onMessage?.(chatMsg)
  }

  /**
   * 处理 Agent 事件
   */
  private handleAgentEvent(msg: GatewayMessage) {
    const payload = msg.payload as Record<string, unknown>
    
    if (!payload.data) return
    
    const data = payload.data as Record<string, unknown>
    
    if (data.type === 'text' || data.text) {
      // 使用时间戳+随机数确保 ID 唯一
      const uniqueId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const chatMsg: ChatMessage = {
        id: uniqueId,
        role: 'assistant',
        content: (data.text as string) || (data.content as string) || '',
        timestamp: (payload.ts as number) || Date.now(),
        pending: true
      }
      this.onMessage?.(chatMsg)
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(content: string, sessionKey?: string): Promise<void> {
    const targetSessionKey = sessionKey || 'main'
    const idempotencyKey = `chat_${Date.now()}_${++this.requestId}`
    
    const params: Record<string, unknown> = {
      sessionKey: targetSessionKey,
      message: content,
      idempotencyKey
    }

    try {
      await this.request('chat.send', params)
    } catch (error) {
      console.error('[Gateway] Send message error:', error)
      throw error
    }
  }

  /**
   * 发送请求并等待响应
   */
  async request(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this.nextId()
      const req: GatewayMessage = {
        type: 'req',
        id,
        method,
        params
      }

      this.pendingRequests.set(id, { resolve, reject })
      this.send(req)

      // 超时处理
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error('请求超时'))
        }
      }, 60000)
    })
  }

  /**
   * 发送原始消息
   */
  private send(msg: GatewayMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  /**
   * 生成请求 ID
   */
  private nextId(): string {
    return `req_${Date.now()}_${++this.requestId}`
  }

  /**
   * 自动重连（指数退避）
   */
  private scheduleReconnect() {
    if (this.closed) return
    
    const delay = this.backoffMs
    this.backoffMs = Math.min(Math.round(this.backoffMs * 1.7), 15000)
    
    console.log(`[Gateway] Reconnecting in ${delay}ms...`)
    this.reconnectTimer = setTimeout(() => {
      void this.connect()
    }, delay)
  }

  /**
   * 断开连接（不再重连）
   */
  stop() {
    this.closed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connected = false
    this.pendingRequests.clear()
  }

  /**
   * 断开连接（兼容旧接口）
   */
  disconnect() {
    this.stop()
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * 获取会话使用情况（包括上下文 token 使用量）
   */
  async getSessionUsage(sessionKey: string = 'agent:main:main'): Promise<{ used: number; max: number; percentage: number } | null> {
    console.log('[Gateway] getSessionUsage called, sessionKey:', sessionKey)
    
    try {
      // 方法1: 尝试 status API（包含 context 信息）
      const statusResult = await this.request('status', {}) as Record<string, unknown>
      console.log('[Gateway] status result:', JSON.stringify(statusResult, null, 2))
      
      // status 可能直接包含 context 信息
      if (statusResult.context) {
        const ctx = statusResult.context as { used?: number; max?: number; percent?: number }
        const used = ctx.used || 0
        const max = ctx.max || 200000
        const percentage = ctx.percent || (max > 0 ? Math.round((used / max) * 100) : 0)
        return { used, max, percentage }
      }
      
      // 方法2: sessions.usage 返回所有会话的用量
      const result = await this.request('sessions.usage', {}) as Record<string, unknown>
      
      console.log('[Gateway] sessions.usage result:', JSON.stringify(result, null, 2))
      
      // 尝试多种可能的响应格式
      // 格式1: { sessions: [{ key, contextTokens }] }
      // 格式2: { contextTokens: { used, max } }
      // 格式3: { usage: { contextTokens } }
      
      let contextTokens: { used?: number; max?: number } | undefined
      
      // 查找匹配 sessionKey 的会话
      if (result.sessions && Array.isArray(result.sessions)) {
        const session = (result.sessions as Array<{ key?: string; contextTokens?: { used?: number; max?: number } }>)
          .find(s => s.key === sessionKey)
        contextTokens = session?.contextTokens
        console.log('[Gateway] Found session:', session?.key, 'contextTokens:', contextTokens)
      } else if (result.contextTokens) {
        contextTokens = result.contextTokens as { used?: number; max?: number }
      }
      
      if (contextTokens) {
        const used = contextTokens.used || 0
        const max = contextTokens.max || 200000
        const percentage = max > 0 ? Math.round((used / max) * 100) : 0
        console.log('[Gateway] Context usage:', { used, max, percentage })
        return { used, max, percentage }
      }
      
      console.log('[Gateway] No contextTokens found in result for sessionKey:', sessionKey)
      return null
    } catch (error) {
      console.error('[Gateway] Get session usage error:', error)
      return null
    }
  }

  /**
   * 订阅事件
   */
  on(_event: string, handler: EventHandler) {
    this.eventHandlers.push(handler)
    return () => {
      const index = this.eventHandlers.indexOf(handler)
      if (index > -1) {
        this.eventHandlers.splice(index, 1)
      }
    }
  }
}

// 单例
let gatewayClient: GatewayClient | null = null

export function getGatewayClient(): GatewayClient {
  if (!gatewayClient) {
    gatewayClient = new GatewayClient()
  }
  return gatewayClient
}
