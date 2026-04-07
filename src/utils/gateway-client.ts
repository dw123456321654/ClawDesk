/**
 * Gateway WebSocket 客户端
 * 
 * 参考 OpenClaw 官方实现: ui/src/ui/gateway.ts
 * 
 * 核心特性：
 * - 事件监听 (event)
 * - 请求-响应模式 (req/res)
 * - Gap 检测（消息序列号跳跃）
 * - Tick Watch 心跳检测
 * - Backoff 重连机制
 */

import { useNotification } from 'naive-ui'

// ============ 类型定义 ============

export type GatewayEventFrame = {
  type: 'event'
  event: string
  payload?: unknown
  seq?: number
  stateVersion?: { presence: number; health: number }
}

export type GatewayResponseFrame = {
  type: 'res'
  id: string
  ok: boolean
  payload?: unknown
  error?: { code: string; message: string; details?: unknown }
}

export type GatewayErrorInfo = {
  code: string
  message: string
  details?: unknown
}

export class GatewayRequestError extends Error {
  readonly gatewayCode: string
  readonly details?: unknown

  constructor(error: GatewayErrorInfo) {
    super(error.message)
    this.name = 'GatewayRequestError'
    this.gatewayCode = error.code
    this.details = error.details
  }
}

export type GatewayHelloOk = {
  type: 'hello-ok'
  protocol: number
  server?: {
    version?: string
    connId?: string
  }
  features?: { methods?: string[]; events?: string[] }
  snapshot?: unknown
  auth?: {
    deviceToken?: string
    role?: string
    scopes?: string[]
    issuedAtMs?: number
  }
  policy?: { tickIntervalMs?: number }
}

type Pending = {
  resolve: (value: unknown) => void
  reject: (err: unknown) => void
  timeout: ReturnType<typeof setTimeout> | null
}

export type GatewayBrowserClientOptions = {
  url: string
  token?: string
  onHello?: (hello: GatewayHelloOk) => void
  onEvent?: (evt: GatewayEventFrame) => void
  onClose?: (info: { code: number; reason: string; error?: GatewayErrorInfo }) => void
  onGap?: (info: { expected: number; received: number }) => void
  onReconnect?: () => void
}

// ============ 默认配置 ============

const DEFAULT_BACKOFF_MS = 800
const MAX_BACKOFF_MS = 15000
const BACKOFF_FACTOR = 1.7
const DEFAULT_TICK_INTERVAL_MS = 30000
const TICK_TIMEOUT_FACTOR = 2
const REQUEST_TIMEOUT_MS = 30000
const CONNECT_DELAY_MS = 750

// ============ Gateway 浏览器客户端 ============

/**
 * Gateway 浏览器客户端
 * 
 * 使用方法：
 * ```typescript
 * const client = new GatewayBrowserClient({
 *   url: 'ws://127.0.0.1:18789',
 *   token: 'your-token',
 *   onEvent: (evt) => console.log('Event:', evt),
 *   onClose: (info) => console.log('Closed:', info),
 * })
 * 
 * client.start()
 * 
 * // 发送请求
 * const result = await client.request('someMethod', { param: 'value' })
 * ```
 */
export class GatewayBrowserClient {
  private ws: WebSocket | null = null
  private pending = new Map<string, Pending>()
  private closed = false
  private lastSeq: number | null = null
  private connectSent = false
  private connectTimer: ReturnType<typeof setTimeout> | null = null
  private backoffMs = DEFAULT_BACKOFF_MS
  private pendingConnectError: GatewayErrorInfo | undefined
  private tickIntervalMs = DEFAULT_TICK_INTERVAL_MS
  private lastTick: number | null = null
  private tickTimer: ReturnType<typeof setInterval> | null = null

  constructor(private opts: GatewayBrowserClientOptions) {}

  /**
   * 启动客户端
   */
  start() {
    this.closed = false
    this.connect()
  }

  /**
   * 停止客户端
   */
  stop() {
    this.closed = true
    this.clearTimers()
    this.ws?.close()
    this.ws = null
    this.pendingConnectError = undefined
    this.flushPending(new Error('gateway client stopped'))
  }

  /**
   * 是否已连接
   */
  get connected() {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * 发送请求
   */
  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('gateway not connected'))
    }

    const id = generateUUID()
    const frame = { type: 'req', id, method, params }
    
    const p = new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`gateway request timeout for ${method}`))
      }, REQUEST_TIMEOUT_MS)

      this.pending.set(id, {
        resolve: (v) => resolve(v as T),
        reject,
        timeout,
      })
    })

    this.ws.send(JSON.stringify(frame))
    return p
  }

  // ============ 私有方法 ============

  private connect() {
    if (this.closed) return

    this.ws = new WebSocket(this.opts.url)
    
    this.ws.addEventListener('open', () => this.queueConnect())
    this.ws.addEventListener('message', (ev) => this.handleMessage(String(ev.data ?? '')))
    this.ws.addEventListener('close', (ev) => {
      const reason = String(ev.reason ?? '')
      const connectError = this.pendingConnectError
      this.pendingConnectError = undefined
      this.ws = null
      this.stopTickWatch()
      this.flushPending(new Error(`gateway closed (${ev.code}): ${reason}`))
      this.opts.onClose?.({ code: ev.code, reason, error: connectError })
      
      // 非致命错误，尝试重连
      if (!this.closed && !isNonRecoverableAuthError(connectError)) {
        this.scheduleReconnect()
      }
    })
    this.ws.addEventListener('error', () => {
      // 错误会触发 close 事件
    })
  }

  private queueConnect() {
    this.connectSent = false
    if (this.connectTimer) {
      clearTimeout(this.connectTimer)
    }
    this.connectTimer = setTimeout(() => {
      void this.sendConnect()
    }, CONNECT_DELAY_MS)
  }

  private async sendConnect() {
    if (this.connectSent) return
    this.connectSent = true
    if (this.connectTimer) {
      clearTimeout(this.connectTimer)
      this.connectTimer = null
    }

    try {
      const hello = await this.request<GatewayHelloOk>('connect', {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'clawdesk',
          version: '1.0.0',
          platform: navigator.platform,
          mode: 'webchat',
        },
        role: 'operator',
        scopes: ['operator.admin', 'operator.read', 'operator.write'],
        auth: this.opts.token ? { token: this.opts.token } : undefined,
        userAgent: navigator.userAgent,
        locale: navigator.language,
      })

      this.backoffMs = DEFAULT_BACKOFF_MS
      this.tickIntervalMs = hello.policy?.tickIntervalMs ?? DEFAULT_TICK_INTERVAL_MS
      this.lastTick = Date.now()
      this.startTickWatch()
      this.opts.onHello?.(hello)
    } catch (err) {
      if (err instanceof GatewayRequestError) {
        this.pendingConnectError = {
          code: err.gatewayCode,
          message: err.message,
          details: err.details,
        }
      }
      this.ws?.close(4008, 'connect failed')
    }
  }

  private handleMessage(raw: string) {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return
    }

    const frame = parsed as { type?: unknown }

    // 处理事件帧
    if (frame.type === 'event') {
      const evt = parsed as GatewayEventFrame
      this.lastTick = Date.now()

      // 处理序列号和 Gap 检测
      const seq = typeof evt.seq === 'number' ? evt.seq : null
      if (seq !== null) {
        if (this.lastSeq !== null && seq > this.lastSeq + 1) {
          this.opts.onGap?.({ expected: this.lastSeq + 1, received: seq })
        }
        this.lastSeq = seq
      }

      try {
        this.opts.onEvent?.(evt)
      } catch (err) {
        console.error('[gateway] event handler error:', err)
      }
      return
    }

    // 处理响应帧
    if (frame.type === 'res') {
      const res = parsed as GatewayResponseFrame
      const pending = this.pending.get(res.id)
      if (!pending) return

      this.pending.delete(res.id)
      if (pending.timeout) {
        clearTimeout(pending.timeout)
      }

      if (res.ok) {
        pending.resolve(res.payload)
      } else {
        pending.reject(
          new GatewayRequestError({
            code: res.error?.code ?? 'UNAVAILABLE',
            message: res.error?.message ?? 'request failed',
            details: res.error?.details,
          })
        )
      }
      return
    }
  }

  private scheduleReconnect() {
    if (this.closed) return

    const delay = this.backoffMs
    this.backoffMs = Math.min(this.backoffMs * BACKOFF_FACTOR, MAX_BACKOFF_MS)

    console.log(`[gateway] reconnecting in ${delay}ms...`)
    this.opts.onReconnect?.()

    setTimeout(() => this.connect(), delay)
  }

  private flushPending(err: Error) {
    for (const [, p] of this.pending) {
      if (p.timeout) {
        clearTimeout(p.timeout)
      }
      p.reject(err)
    }
    this.pending.clear()
  }

  private startTickWatch() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
    }
    this.tickTimer = setInterval(() => {
      if (this.closed || !this.lastTick) return

      const gap = Date.now() - this.lastTick
      if (gap > this.tickIntervalMs * TICK_TIMEOUT_FACTOR) {
        console.warn('[gateway] tick timeout, closing connection')
        this.ws?.close(4000, 'tick timeout')
      }
    }, this.tickIntervalMs)
  }

  private stopTickWatch() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
  }

  private clearTimers() {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer)
      this.connectTimer = null
    }
    this.stopTickWatch()
  }
}

// ============ 工具函数 ============

/**
 * 生成 UUID
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 判断是否为不可恢复的认证错误
 */
function isNonRecoverableAuthError(error: GatewayErrorInfo | undefined): boolean {
  if (!error) return false
  
  const nonRecoverableCodes = [
    'AUTH_TOKEN_MISSING',
    'AUTH_BOOTSTRAP_TOKEN_INVALID',
    'AUTH_PASSWORD_MISSING',
    'AUTH_PASSWORD_MISMATCH',
    'AUTH_RATE_LIMITED',
    'PAIRING_REQUIRED',
  ]
  
  return nonRecoverableCodes.includes(error.code)
}

// ============ 全局单例 ============

const GATEWAY_CLIENT_KEY = '__clawdesk_gateway_client__'

/**
 * 获取或创建 Gateway 客户端单例
 */
export function getGatewayClient(options?: GatewayBrowserClientOptions): GatewayBrowserClient {
  const existing = (globalThis as Record<string, unknown>)[GATEWAY_CLIENT_KEY]
  if (existing instanceof GatewayBrowserClient) {
    return existing
  }
  
  if (!options) {
    throw new Error('Gateway client not initialized. Call getGatewayClient with options first.')
  }
  
  const client = new GatewayBrowserClient(options)
  ;(globalThis as Record<string, unknown>)[GATEWAY_CLIENT_KEY] = client
  return client
}
