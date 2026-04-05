<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { 
  NButton, 
  NSpace, 
  NSelect, 
  NEmpty, 
  NIcon,
  NScrollbar,
  useMessage
} from 'naive-ui'
import {
  TrashOutline,
  DownloadOutline,
  RefreshOutline
} from '@vicons/ionicons5'
import { useLogStore, type LogLevel } from '@/stores/log'
import { useServiceStore } from '@/stores/service'

const logStore = useLogStore()
const serviceStore = useServiceStore()
const message = useMessage()

const logContainer = ref<HTMLElement | null>(null)
const autoScroll = ref(true)

const levelOptions = [
  { label: '全部', value: 'all' },
  { label: 'Debug', value: 'debug' },
  { label: 'Info', value: 'info' },
  { label: 'Warning', value: 'warn' },
  { label: 'Error', value: 'error' }
]

// 格式化时间
const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 日志级别颜色
const getLevelClass = (level: LogLevel): string => {
  switch (level) {
    case 'debug': return 'level-debug'
    case 'info': return 'level-info'
    case 'warn': return 'level-warn'
    case 'error': return 'level-error'
    default: return ''
  }
}

// 日志级别标签
const getLevelLabel = (level: LogLevel): string => {
  return level.toUpperCase()
}

// 清空日志
const handleClear = () => {
  logStore.clearLogs()
  message.success('日志已清空')
}

// 导出日志
const handleExport = () => {
  const content = logStore.exportLogs()
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `gateway-log-${new Date().toISOString().slice(0, 10)}.txt`
  link.click()
  
  URL.revokeObjectURL(url)
  message.success('日志已导出')
}

// 刷新日志（模拟添加一些测试日志）
const handleRefresh = () => {
  // TODO: 从 Gateway 获取实际日志
  logStore.info('刷新日志', 'System')
}

// 自动滚动到底部
const scrollToBottom = () => {
  if (!autoScroll.value) return
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

// 监听日志变化
onMounted(() => {
  // 添加一些示例日志
  logStore.info('Gateway 服务已启动', 'Gateway')
  logStore.info('WebSocket 连接就绪', 'WebSocket')
})
</script>

<template>
  <div class="log-panel">
    <!-- 工具栏 -->
    <div class="toolbar">
      <n-select
        v-model:value="logStore.filterLevel"
        :options="levelOptions"
        style="width: 100px;"
        size="small"
      />
      
      <n-space>
        <n-button 
          quaternary 
          size="small" 
          @click="handleRefresh"
          title="刷新"
        >
          <template #icon>
            <n-icon><RefreshOutline /></n-icon>
          </template>
        </n-button>
        
        <n-button 
          quaternary 
          size="small" 
          @click="handleExport"
          :disabled="logStore.logs.length === 0"
          title="导出日志"
        >
          <template #icon>
            <n-icon><DownloadOutline /></n-icon>
          </template>
        </n-button>
        
        <n-button 
          quaternary 
          size="small" 
          @click="handleClear"
          :disabled="logStore.logs.length === 0"
          title="清空日志"
        >
          <template #icon>
            <n-icon><TrashOutline /></n-icon>
          </template>
        </n-button>
      </n-space>
    </div>
    
    <!-- 日志列表 -->
    <div class="log-container" ref="logContainer">
      <template v-if="logStore.filteredLogs.length > 0">
        <div
          v-for="log in logStore.filteredLogs"
          :key="log.id"
          class="log-entry"
          :class="getLevelClass(log.level)"
        >
          <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          <span class="log-level">{{ getLevelLabel(log.level) }}</span>
          <span class="log-source" v-if="log.source">[{{ log.source }}]</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </template>
      <n-empty v-else description="暂无日志" size="small" />
    </div>
    
    <!-- 底部状态 -->
    <div class="status-bar">
      <span>共 {{ logStore.logs.length }} 条日志</span>
      <span v-if="logStore.filterLevel !== 'all'">
        (筛选显示 {{ logStore.filteredLogs.length }} 条)
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.log-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--border-secondary);
}

.log-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: var(--border-secondary);
    border-radius: 3px;
  }
}

.log-entry {
  display: flex;
  gap: 8px;
  padding: 2px 0;
  
  &:hover {
    background-color: var(--bg-tertiary);
  }
}

.log-time {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.log-level {
  flex-shrink: 0;
  font-weight: 600;
  width: 50px;
}

.log-source {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.log-message {
  color: var(--text-primary);
  word-break: break-all;
}

// 日志级别颜色
.level-debug {
  .log-level { color: #909399; }
}

.level-info {
  .log-level { color: #409eff; }
}

.level-warn {
  .log-level { color: #e6a23c; }
  .log-message { color: #e6a23c; }
}

.level-error {
  .log-level { color: #f56c6c; }
  .log-message { color: #f56c6c; }
}

.status-bar {
  padding: 6px 8px;
  border-top: 1px solid var(--border-secondary);
  font-size: 11px;
  color: var(--text-tertiary);
}
</style>
