<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NIcon, useMessage, useNotification } from 'naive-ui'
import {
  HeartOutline,
  RefreshOutline,
  OpenOutline
} from '@vicons/ionicons5'
import { useServiceStore } from '@/stores/service'
import { open } from '@tauri-apps/plugin-shell'

console.log('[QuickActions] 组件加载')

const message = useMessage()
const notification = useNotification()
const serviceStore = useServiceStore()

console.log('[QuickActions] message:', message)
console.log('[QuickActions] notification:', notification)
console.log('[QuickActions] serviceStore:', serviceStore)

onMounted(() => {
  console.log('[QuickActions] 组件已挂载')
})

const loading = ref({
  health: false,
  refresh: false
})

// 健康检查
const handleHealthCheck = async () => {
  loading.value.health = true
  
  try {
    // 检查 Gateway 状态
    await serviceStore.refreshStatus()
    
    const gatewayOk = serviceStore.status === 'running'
    const port = serviceStore.port
    
    notification.info({
      title: '健康检查结果',
      content: `Gateway 状态: ${gatewayOk ? '✅ 运行中' : '❌ 未运行'}
端口: ${port}
运行时间: ${formatUptime(serviceStore.uptime)}`,
      duration: 5000
    })
  } catch (e) {
    notification.error({
      title: '健康检查失败',
      content: String(e),
      duration: 5000
    })
  } finally {
    loading.value.health = false
  }
}

// 刷新状态
const handleRefresh = async () => {
  loading.value.refresh = true
  
  try {
    await serviceStore.refreshStatus()
    message.success('状态已刷新')
  } catch (e) {
    message.error('刷新失败: ' + String(e))
  } finally {
    loading.value.refresh = false
  }
}

// 打开浏览器
const handleOpenBrowser = async () => {
  try {
    const port = serviceStore.port || 18789
    const url = `http://localhost:${port}`
    
    await open(url)
    message.success('已在浏览器中打开')
  } catch (e) {
    message.error('打开失败: ' + String(e))
  }
}

// 格式化运行时间
const formatUptime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}小时${mins}分钟`
}
</script>

<template>
  <div class="quick-actions">
    <n-button 
      quaternary 
      size="small"
      :loading="loading.health"
      @click="handleHealthCheck"
    >
      <template #icon>
        <n-icon><HeartOutline /></n-icon>
      </template>
      健康检查
    </n-button>
    
    <n-button 
      quaternary 
      size="small"
      :loading="loading.refresh"
      @click="handleRefresh"
    >
      <template #icon>
        <n-icon><RefreshOutline /></n-icon>
      </template>
      刷新
    </n-button>
    
    <n-button 
      quaternary 
      size="small"
      @click="handleOpenBrowser"
    >
      <template #icon>
        <n-icon><OpenOutline /></n-icon>
      </template>
      打开浏览器
    </n-button>
  </div>
</template>

<style scoped lang="scss">
.quick-actions {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--border-primary);
  background: var(--bg-primary);
  
  :deep(.n-button) {
    flex: 1;
    height: 36px;
    border-radius: var(--radius-md);
    font-size: 13px;
    
    .n-icon {
      font-size: 18px;
    }
    
    &:hover {
      color: var(--brand-primary);
      background: rgba(255, 107, 53, 0.1);
    }
  }
}
</style>
