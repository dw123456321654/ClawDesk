<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NIcon, useMessage, useNotification } from 'naive-ui'
import {
  HeartOutline,
  RefreshOutline,
  OpenOutline
} from '@vicons/ionicons5'
import { useServiceStore } from '@/stores/service'

const message = useMessage()
const notification = useNotification()
const serviceStore = useServiceStore()

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
    
    // 使用 Tauri shell 打开浏览器
    const { open } = await import('@tauri-apps/plugin-shell')
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
      title="健康检查"
    >
      <template #icon>
        <n-icon><HeartOutline /></n-icon>
      </template>
    </n-button>
    
    <n-button 
      quaternary 
      size="small"
      :loading="loading.refresh"
      @click="handleRefresh"
      title="刷新状态"
    >
      <template #icon>
        <n-icon><RefreshOutline /></n-icon>
      </template>
    </n-button>
    
    <n-button 
      quaternary 
      size="small"
      @click="handleOpenBrowser"
      title="打开浏览器"
    >
      <template #icon>
        <n-icon><OpenOutline /></n-icon>
      </template>
    </n-button>
  </div>
</template>

<style scoped lang="scss">
.quick-actions {
  display: flex;
  gap: 4px;
  padding: 8px;
  border-top: 1px solid var(--border-primary);
  
  :deep(.n-button) {
    flex: 1;
    height: 32px;
    
    .n-icon {
      font-size: 16px;
    }
    
    &:hover {
      color: var(--brand-primary);
      background: rgba(255, 107, 53, 0.1);
    }
  }
}
</style>
