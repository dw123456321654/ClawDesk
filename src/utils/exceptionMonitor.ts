/**
 * 异常监控器
 * 
 * 负责检测任务超时、服务断开、上下文满等异常状态
 */

import { ref, computed } from 'vue'

export type ExceptionType = 'task_timeout' | 'service_disconnected' | 'context_full'

export interface Exception {
  type: ExceptionType
  title: string
  message: string
  actions: Array<{
    label: string
    handler: () => void
  }>
  timestamp: number
}

// 任务超时阈值（毫秒）
const TASK_TIMEOUT_MS = 60 * 1000 // 60秒

class ExceptionMonitor {
  private taskTimer: ReturnType<typeof setTimeout> | null = null
  private taskStartTime: number = 0
  
  // 当前异常
  currentException = ref<Exception | null>(null)
  
  // 是否有异常
  hasException = computed(() => this.currentException.value !== null)
  
  /**
   * 开始任务超时监控
   */
  startTaskMonitor(onTimeout: () => void) {
    this.clearTaskMonitor()
    this.taskStartTime = Date.now()
    
    this.taskTimer = setTimeout(() => {
      this.triggerException('task_timeout', onTimeout)
    }, TASK_TIMEOUT_MS)
  }
  
  /**
   * 清除任务超时监控
   */
  clearTaskMonitor() {
    if (this.taskTimer) {
      clearTimeout(this.taskTimer)
      this.taskTimer = null
    }
    this.taskStartTime = 0
  }
  
  /**
   * 触发异常
   */
  triggerException(type: ExceptionType, actionHandler?: () => void) {
    const exception: Exception = {
      type,
      title: this.getExceptionTitle(type),
      message: this.getExceptionMessage(type),
      actions: this.getExceptionActions(type, actionHandler),
      timestamp: Date.now()
    }
    
    this.currentException.value = exception
  }
  
  /**
   * 清除当前异常
   */
  clearException() {
    this.currentException.value = null
  }
  
  /**
   * 获取异常标题
   */
  private getExceptionTitle(type: ExceptionType): string {
    switch (type) {
      case 'task_timeout':
        return '⚠️ 任务可能卡死'
      case 'service_disconnected':
        return '🔌 服务连接断开'
      case 'context_full':
        return '📊 上下文即将满'
      default:
        return '⚠️ 异常提示'
    }
  }
  
  /**
   * 获取异常消息
   */
  private getExceptionMessage(type: ExceptionType): string {
    switch (type) {
      case 'task_timeout':
        return '当前任务已执行超过60秒无响应'
      case 'service_disconnected':
        return '与 Gateway 的连接已断开，无法继续对话'
      case 'context_full':
        return '上下文使用率已超过95%，可能影响响应质量'
      default:
        return '检测到异常状态'
    }
  }
  
  /**
   * 获取异常操作选项
   */
  private getExceptionActions(type: ExceptionType, handler?: () => void): Exception['actions'] {
    switch (type) {
      case 'task_timeout':
        return [
          { label: '重试', handler: handler || (() => {}) },
          { label: '忽略', handler: () => this.clearException() },
          { label: '新开会话', handler: handler || (() => {}) }
        ]
      case 'service_disconnected':
        return [
          { label: '重新连接', handler: handler || (() => {}) },
          { label: '查看日志', handler: () => this.clearException() }
        ]
      case 'context_full':
        return [
          { label: '新开会话', handler: handler || (() => {}) },
          { label: '压缩上下文', handler: handler || (() => {}) },
          { label: '忽略', handler: () => this.clearException() }
        ]
      default:
        return [{ label: '确定', handler: () => this.clearException() }]
    }
  }
  
  /**
   * 获取任务已执行时间（秒）
   */
  getTaskElapsedTime(): number {
    if (this.taskStartTime === 0) return 0
    return Math.round((Date.now() - this.taskStartTime) / 1000)
  }
}

// 单例
export const exceptionMonitor = new ExceptionMonitor()
