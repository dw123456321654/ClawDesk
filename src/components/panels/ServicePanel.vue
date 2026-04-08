<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { NButton, NSpace, NInput, NSwitch, NSelect, NDivider, NIcon, NAlert, NSpin, useMessage } from 'naive-ui'
import { useServiceStore } from '@/stores/service'
import {
  PlayCircleOutline,
  StopCircleOutline,
  RefreshCircleOutline,
  DocumentTextOutline
} from '@vicons/ionicons5'

const serviceStore = useServiceStore()
const message = useMessage()

// 组件挂载时刷新状态
onMounted(() => {
  serviceStore.refreshStatus()
})

// 配置
const port = ref(String(serviceStore.port))
const portError = ref<string | null>(null)
const autoStart = ref(true)
const minimizeToTray = ref(true)
const logLevel = ref('info')

const logLevelOptions = [
  { label: 'Debug', value: 'debug' },
  { label: 'Info', value: 'info' },
  { label: 'Warning', value: 'warn' },
  { label: 'Error', value: 'error' }
]

// 验证端口
function validatePort(value: string): boolean {
  const portNum = parseInt(value, 10)
  if (isNaN(portNum)) {
    portError.value = '请输入有效的端口号'
    return false
  }
  if (portNum < 1024 || portNum > 65535) {
    portError.value = '端口必须在 1024-65535 之间'
    return false
  }
  portError.value = null
  return true
}

// 监听端口变化
watch(port, (value) => {
  if (validatePort(value)) {
    serviceStore.savePort(parseInt(value, 10))
  }
})

// 格式化运行时间
const formattedUptime = computed(() => {
  const seconds = serviceStore.uptime
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`
  }
  if (minutes > 0) {
    return `${minutes}分${secs}秒`
  }
  return `${secs}秒`
})

// 启动服务
const handleStart = () => {
  if (!validatePort(port.value)) {
    message.error(portError.value || '端口无效')
    return
  }
  serviceStore.startGateway(parseInt(port.value) || 18789)
}

// 停止服务
const handleStop = () => {
  serviceStore.stopGateway()
}

// 重启服务
const handleRestart = () => {
  serviceStore.restartGateway()
}
</script>

<template>
  <div class="service-panel">
    <!-- 加载状态 -->
    <NSpin :show="serviceStore.isOperating">
      <!-- 服务状态 -->
      <div class="status-section">
        <div class="status-header">
          <span class="status-label">Gateway 状态:</span>
          <span class="status-value" :class="serviceStore.status">
            {{ serviceStore.statusText }}
          </span>
        </div>
        
        <div class="status-info" v-if="serviceStore.status === 'running'">
          <p>端口: {{ serviceStore.port }}</p>
          <p>进程ID: {{ serviceStore.pid }}</p>
          <p>运行时间: {{ formattedUptime }}</p>
        </div>
        
        <!-- 错误提示 -->
        <NAlert 
          v-if="serviceStore.lastError" 
          type="error" 
          style="margin: 12px 0;"
        >
          {{ serviceStore.lastError }}
        </NAlert>
        
        <!-- 操作按钮 -->
        <n-space class="action-buttons">
          <n-button 
            v-if="serviceStore.status !== 'running'"
            type="primary"
            @click="handleStart"
            :loading="serviceStore.status === 'starting'"
            :disabled="serviceStore.isOperating"
          >
            <template #icon>
              <n-icon><PlayCircleOutline /></n-icon>
            </template>
            启动服务
          </n-button>
          
          <n-button 
            v-if="serviceStore.status === 'running'"
            type="error"
            @click="handleStop"
            :disabled="serviceStore.isOperating"
          >
            <template #icon>
              <n-icon><StopCircleOutline /></n-icon>
            </template>
            停止服务
          </n-button>
          
          <n-button 
            v-if="serviceStore.status === 'running'"
            @click="handleRestart"
            :disabled="serviceStore.isOperating"
          >
            <template #icon>
              <n-icon><RefreshCircleOutline /></n-icon>
            </template>
            重启
          </n-button>
          
          <n-button :disabled="serviceStore.status !== 'running'">
            <template #icon>
              <n-icon><DocumentTextOutline /></n-icon>
            </template>
            日志
          </n-button>
        </n-space>
      </div>
    </NSpin>
    
    <n-divider />
    
    <!-- 启动配置 -->
    <div class="config-section">
      <h4>⚙️ 启动配置</h4>
      
      <div class="config-item">
        <label>端口:</label>
        <n-input 
          v-model:value="port" 
          :disabled="serviceStore.status === 'running'"
          :status="portError ? 'error' : undefined"
          style="width: 120px;"
        />
      </div>
      
      <div class="config-item error-hint" v-if="portError">
        <span>{{ portError }}</span>
      </div>
      
      <div class="config-item">
        <label>开机自启:</label>
        <n-switch v-model:value="autoStart" />
      </div>
      
      <div class="config-item">
        <label>最小化到托盘:</label>
        <n-switch v-model:value="minimizeToTray" />
      </div>
      
      <div class="config-item">
        <label>日志级别:</label>
        <n-select 
          v-model:value="logLevel"
          :options="logLevelOptions"
          style="width: 120px;"
        />
      </div>
    </div>
    

  </div>
</template>

<style scoped lang="scss">
.service-panel {
  font-size: 13px;
}

.status-section {
  margin-bottom: 16px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-label {
  color: var(--text-secondary);
}

.status-value {
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  
  &.running {
    color: #18a058;
    background-color: rgba(24, 160, 88, 0.1);
  }
  
  &.starting {
    color: #f0a020;
    background-color: rgba(240, 160, 32, 0.1);
  }
  
  &.stopped {
    color: var(--text-secondary);
  }
  
  &.error {
    color: #d03050;
    background-color: rgba(208, 48, 80, 0.1);
  }
}

.status-info {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  padding: 8px 12px;
  background-color: var(--bg-tertiary);
  border-radius: 4px;
  
  p {
    margin: 4px 0;
  }
}

.action-buttons {
  margin-top: 12px;
}

.config-section {
  h4 {
    margin: 0 0 12px 0;
    font-size: 13px;
    font-weight: 500;
  }
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  
  label {
    color: var(--text-secondary);
  }
  
  &.error-hint {
    justify-content: flex-end;
    margin-top: -8px;
    margin-bottom: 8px;
    
    span {
      font-size: 12px;
      color: #d03050;
    }
  }
}
</style>
