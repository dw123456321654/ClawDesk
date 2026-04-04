import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  startGateway as apiStartGateway, 
  stopGateway as apiStopGateway,
  getGatewayStatus
} from '@/utils/api'

export type GatewayStatus = 'running' | 'starting' | 'stopped' | 'error'

export const useServiceStore = defineStore('service', () => {
  // 状态
  const status = ref<GatewayStatus>('stopped')
  const port = ref(18789)
  const pid = ref<number | null>(null)
  const uptime = ref(0)
  const contextUsage = ref(35)
  const lastError = ref<string | null>(null)
  
  // 是否正在操作
  const isOperating = ref(false)
  
  // 状态文字
  const statusText = computed(() => {
    switch (status.value) {
      case 'running':
        return '运行中'
      case 'starting':
        return '启动中'
      case 'stopped':
        return '已停止'
      case 'error':
        return '错误'
      default:
        return '未知'
    }
  })
  
  // 状态颜色
  const statusColor = computed(() => {
    switch (status.value) {
      case 'running':
        return 'success'
      case 'starting':
        return 'warning'
      case 'error':
        return 'error'
      default:
        return 'default'
    }
  })
  
  // 启动 Gateway
  async function startGateway(customPort?: number) {
    if (isOperating.value) return
    if (status.value === 'running') return
    
    const targetPort = customPort || port.value
    isOperating.value = true
    status.value = 'starting'
    lastError.value = null
    
    try {
      const result = await apiStartGateway(targetPort, false)
      
      status.value = 'running'
      port.value = result.port
      pid.value = result.pid || null
      uptime.value = 0
      
      // 启动运行时间计时器
      startUptimeTimer()
      
    } catch (error) {
      status.value = 'error'
      lastError.value = String(error)
      console.error('启动服务失败:', error)
    } finally {
      isOperating.value = false
    }
  }
  
  // 停止 Gateway
  async function stopGateway() {
    if (isOperating.value) return
    if (status.value !== 'running') return
    
    isOperating.value = true
    
    try {
      await apiStopGateway()
      
      status.value = 'stopped'
      pid.value = null
      uptime.value = 0
      
      // 停止运行时间计时器
      stopUptimeTimer()
      
    } catch (error) {
      lastError.value = String(error)
      console.error('停止服务失败:', error)
    } finally {
      isOperating.value = false
    }
  }
  
  // 重启 Gateway
  async function restartGateway() {
    if (isOperating.value) return
    
    await stopGateway()
    await startGateway()
  }
  
  // 刷新状态
  async function refreshStatus() {
    try {
      const result = await getGatewayStatus()
      
      if (result.running) {
        status.value = 'running'
        pid.value = result.pid || null
        uptime.value = result.uptime || 0
      } else {
        status.value = 'stopped'
        pid.value = null
        uptime.value = 0
      }
      
      if (result.lastError) {
        lastError.value = result.lastError
      }
      
    } catch (error) {
      console.error('获取状态失败:', error)
    }
  }
  
  // 更新上下文使用率
  function updateContextUsage(usage: number) {
    contextUsage.value = Math.min(100, Math.max(0, usage))
  }
  
  // 运行时间计时器
  let uptimeTimer: ReturnType<typeof setInterval> | null = null
  
  function startUptimeTimer() {
    stopUptimeTimer()
    uptimeTimer = setInterval(() => {
      uptime.value++
    }, 1000)
  }
  
  function stopUptimeTimer() {
    if (uptimeTimer) {
      clearInterval(uptimeTimer)
      uptimeTimer = null
    }
  }
  
  return {
    // 状态
    status,
    port,
    pid,
    uptime,
    contextUsage,
    lastError,
    isOperating,
    
    // 计算属性
    statusText,
    statusColor,
    
    // 方法
    startGateway,
    stopGateway,
    restartGateway,
    refreshStatus,
    updateContextUsage
  }
})
