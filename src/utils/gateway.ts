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
          this.onStatusChange?.('connected')
          console.log('[Gateway] Connected successfully')
          connectResolve?.()

          // 处理 hello-ok 中的设备 token
          const payload = msg.payload as { auth?: { deviceToken?: string } }
          if (payload?.auth?.deviceToken) {
            console.log('[Gateway] Received device token')
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

    // 构建签名 payload (v2格式)
    const signaturePayload = buildSignaturePayload({
      deviceId,
      clientId: client,
      mode,
      role,
      scopes,
      timestamp,
      token,
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
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connected = false
    this.pendingRequests.clear()
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN
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
