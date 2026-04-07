/**
 * 事件总线 - 全局单例模式
 * 
 * 参考 OpenClaw active-listener.ts 的最佳实践
 * 使用 globalThis 确保所有代码分块共享同一个事件监听器 Map
 */

// ============ 类型定义 ============

type EventCallback<T = unknown> = (payload: T) => void

type EventSubscription = {
  id: string
  callback: EventCallback
  once: boolean
}

// ============ 全局单例 ============

const EVENT_BUS_KEY = '__clawdesk_event_bus__'

type GlobalEventBus = {
  listeners: Map<string, Set<EventSubscription>>
  emitted: Map<string, unknown[]>
}

function getGlobalEventBus(): GlobalEventBus {
  const existing = (globalThis as Record<string, unknown>)[EVENT_BUS_KEY] as GlobalEventBus | undefined
  
  if (existing) {
    return existing
  }
  
  const bus: GlobalEventBus = {
    listeners: new Map(),
    emitted: new Map(),
  }
  
  ;(globalThis as Record<string, unknown>)[EVENT_BUS_KEY] = bus
  return bus
}

// ============ 事件总线 API ============

/**
 * 监听事件
 * 
 * @param event 事件名称
 * @param callback 回调函数
 * @returns 取消监听的函数
 */
export function on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
  const bus = getGlobalEventBus()
  const id = generateSubscriptionId()
  
  const subscription: EventSubscription = {
    id,
    callback: callback as EventCallback,
    once: false,
  }
  
  if (!bus.listeners.has(event)) {
    bus.listeners.set(event, new Set())
  }
  
  bus.listeners.get(event)!.add(subscription)
  
  // 返回取消监听函数
  return () => {
    bus.listeners.get(event)?.delete(subscription)
  }
}

/**
 * 监听事件（只触发一次）
 * 
 * @param event 事件名称
 * @param callback 回调函数
 * @returns 取消监听的函数
 */
export function once<T = unknown>(event: string, callback: EventCallback<T>): () => void {
  const bus = getGlobalEventBus()
  const id = generateSubscriptionId()
  
  const subscription: EventSubscription = {
    id,
    callback: callback as EventCallback,
    once: true,
  }
  
  if (!bus.listeners.has(event)) {
    bus.listeners.set(event, new Set())
  }
  
  bus.listeners.get(event)!.add(subscription)
  
  return () => {
    bus.listeners.get(event)?.delete(subscription)
  }
}

/**
 * 触发事件
 * 
 * @param event 事件名称
 * @param payload 事件数据
 */
export function emit<T = unknown>(event: string, payload?: T): void {
  const bus = getGlobalEventBus()
  const subscriptions = bus.listeners.get(event)
  
  if (!subscriptions || subscriptions.size === 0) {
    return
  }
  
  const toRemove: EventSubscription[] = []
  
  for (const sub of subscriptions) {
    try {
      sub.callback(payload)
      if (sub.once) {
        toRemove.push(sub)
      }
    } catch (err) {
      console.error(`[EventBus] Error in event handler for "${event}":`, err)
    }
  }
  
  // 移除 once 监听器
  for (const sub of toRemove) {
    subscriptions.delete(sub)
  }
}

/**
 * 移除事件的所有监听器
 * 
 * @param event 事件名称
 */
export function off(event: string): void {
  const bus = getGlobalEventBus()
  bus.listeners.delete(event)
}

/**
 * 清除所有事件监听器
 */
export function clearAll(): void {
  const bus = getGlobalEventBus()
  bus.listeners.clear()
}

/**
 * 获取事件的监听器数量
 * 
 * @param event 事件名称
 */
export function listenerCount(event: string): number {
  const bus = getGlobalEventBus()
  return bus.listeners.get(event)?.size ?? 0
}

/**
 * 等待事件触发（Promise 版本）
 * 
 * @param event 事件名称
 * @param timeout 超时时间（毫秒），默认 30000ms
 */
export function waitFor<T = unknown>(event: string, timeout = 30000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      offOnce()
      reject(new Error(`Timeout waiting for event "${event}"`))
    }, timeout)
    
    const offOnce = once<T>(event, (payload) => {
      clearTimeout(timer)
      resolve(payload)
    })
  })
}

// ============ 工具函数 ============

let subscriptionIdCounter = 0

function generateSubscriptionId(): string {
  return `sub-${Date.now()}-${++subscriptionIdCounter}`
}

// ============ Vue Composable ============

import { onUnmounted } from 'vue'

/**
 * Vue 组合式 API：自动清理的事件监听
 * 
 * @example
 * ```typescript
 * const { on, emit } = useEventBus()
 * 
 * // 组件卸载时自动清理
 * on('some-event', (data) => console.log(data))
 * 
 * // 触发事件
 * emit('some-event', { foo: 'bar' })
 * ```
 */
export function useEventBus() {
  const cleanups: Array<() => void> = []
  
  const wrappedOn = <T = unknown>(event: string, callback: EventCallback<T>) => {
    const off = on(event, callback)
    cleanups.push(off)
    return off
  }
  
  const wrappedOnce = <T = unknown>(event: string, callback: EventCallback<T>) => {
    const off = once(event, callback)
    cleanups.push(off)
    return off
  }
  
  // 组件卸载时清理所有监听器
  onUnmounted(() => {
    for (const cleanup of cleanups) {
      cleanup()
    }
    cleanups.length = 0
  })
  
  return {
    on: wrappedOn,
    once: wrappedOnce,
    emit,
    off,
    waitFor,
  }
}

// ============ 预定义事件类型 ============

/**
 * ClawDesk 内置事件
 */
export const ClawDeskEvents = {
  // 服务状态变化
  SERVICE_STATUS_CHANGED: 'service:status-changed',
  
  // 上下文使用率变化
  CONTEXT_USAGE_CHANGED: 'context:usage-changed',
  
  // 消息接收
  MESSAGE_RECEIVED: 'message:received',
  
  // 会话切换
  SESSION_SWITCHED: 'session:switched',
  
  // 角色切换
  ROLE_SWITCHED: 'role:switched',
  
  // 任务进度更新
  TASK_PROGRESS_UPDATED: 'task:progress-updated',
  
  // Gateway 连接状态
  GATEWAY_CONNECTED: 'gateway:connected',
  GATEWAY_DISCONNECTED: 'gateway:disconnected',
  GATEWAY_RECONNECTING: 'gateway:reconnecting',
  
  // Gap 检测（消息丢失）
  GAP_DETECTED: 'gateway:gap-detected',
} as const
