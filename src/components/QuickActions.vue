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
  console.log('[QuickActions] 点击健康检查按钮')
  loading.value.health = true
  
  try {
    // 检查 Gateway 状态
    console.log('[QuickActions] 调用 refreshStatus')
    await serviceStore.refreshStatus()
    
    const gatewayOk = serviceStore.status === 'running'
    const port = serviceStore.port
    
    console.log('[QuickActions] 状态:', gatewayOk, port, serviceStore.uptime)
    
    notification.info({
      title: '健康检查结果',
      content: `Gateway 状态: ${gatewayOk ? '✅ 运行中' : '❌ 未运行'}\n端口: ${port}\n运行时间: ${formatUptime(serviceStore.uptime)}`,
      duration: 5000
    })
  } catch (e) {
    console.error('[QuickActions] 健康检查错误:', e)
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
  console.log('[QuickActions] 点击刷新按钮')
  loading.value.refresh = true
  
  try {
    await serviceStore.refreshStatus()
    console.log('[QuickActions] 刷新成功')
    message.success('状态已刷新')
  } catch (e) {
    console.error('[QuickActions] 刷新错误:', e)
    message.error('刷新失败: ' + String(e))
  } finally {
    loading.value.refresh = false
  }
}

// 打开浏览器
const handleOpenBrowser = async () => {
  console.log('[QuickActions] 点击打开浏览器按钮')
  try {
    const port = serviceStore.port || 18789
    const url = `http://localhost:${port}`
    
    console.log('[QuickActions] 打开 URL:', url)
    await open(url)
    console.log('[QuickActions] 打开成功')
    message.success('已在浏览器中打开')
  } catch (e) {
    console.error('[QuickActions] 打开浏览器错误:', e)
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
  <div class="quick-actions" @click="() => console.log('[QuickActions] 区域被点击')">
    <!-- 原生按钮测试 -->
    <button 
      style="flex: 1; height: 36px; cursor: pointer;"
      @click.stop="handleHealthCheck"
    >
      ❤️ 健康检查
    </button>
    
    <button 
      style="flex: 1; height: 36px; cursor: pointer;"
      @click.stop="handleRefresh"
    >
      🔄 刷新
    </button>
    
    <button 
      style="flex: 1; height: 36px; cursor: pointer;"
      @click.stop="handleOpenBrowser"
    >
      🔗 打开浏览器
    </button>
  </div>
</template>

<style scoped lang="scss">
.quick-actions {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--border-primary);
  background: var(--bg-primary);
  flex-shrink: 0;
  min-height: 60px;
  position: relative;
  z-index: 100;
  pointer-events: auto;
  
  :deep(.n-button) {
    flex: 1;
    height: 36px;
    border-radius: var(--radius-md);
    font-size: 13px;
    pointer-events: auto;
    
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
