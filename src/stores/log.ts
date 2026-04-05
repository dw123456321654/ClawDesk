import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  id: string
  timestamp: number
  level: LogLevel
  message: string
  source?: string
}

const MAX_LOGS = 1000

export const useLogStore = defineStore('log', () => {
  // 日志列表
  const logs = ref<LogEntry[]>([])
  
  // 筛选级别
  const filterLevel = ref<LogLevel | 'all'>('all')
  
  // 筛选后的日志
  const filteredLogs = computed(() => {
    if (filterLevel.value === 'all') {
      return logs.value
    }
    return logs.value.filter(log => log.level === filterLevel.value)
  })
  
  // 添加日志
  function addLog(level: LogLevel, message: string, source?: string) {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      level,
      message,
      source
    }
    
    logs.value.push(entry)
    
    // 限制日志数量
    if (logs.value.length > MAX_LOGS) {
      logs.value = logs.value.slice(-MAX_LOGS)
    }
  }
  
  // 清空日志
  function clearLogs() {
    logs.value = []
  }
  
  // 导出日志
  function exportLogs(): string {
    const lines = logs.value.map(log => {
      const time = new Date(log.timestamp).toLocaleString('zh-CN')
      const level = log.level.toUpperCase().padEnd(5)
      const source = log.source ? `[${log.source}] ` : ''
      return `${time} ${level} ${source}${log.message}`
    })
    return lines.join('\n')
  }
  
  // 设置筛选级别
  function setFilterLevel(level: LogLevel | 'all') {
    filterLevel.value = level
  }
  
  // 便捷方法
  function debug(message: string, source?: string) {
    addLog('debug', message, source)
  }
  
  function info(message: string, source?: string) {
    addLog('info', message, source)
  }
  
  function warn(message: string, source?: string) {
    addLog('warn', message, source)
  }
  
  function error(message: string, source?: string) {
    addLog('error', message, source)
  }
  
  return {
    // 状态
    logs,
    filterLevel,
    filteredLogs,
    
    // 方法
    addLog,
    clearLogs,
    exportLogs,
    setFilterLevel,
    
    // 便捷方法
    debug,
    info,
    warn,
    error
  }
})
