<script setup lang="ts">
import { computed } from 'vue'
import { NProgress } from 'naive-ui'
import { useServiceStore } from '@/stores/service'
import { useTaskStore } from '@/stores/task'

const serviceStore = useServiceStore()
const taskStore = useTaskStore()

const contextColor = computed(() => {
  const usage = serviceStore.contextUsage
  if (usage >= 95) return 'error'
  if (usage >= 80) return 'warning'
  return 'success'
})

const contextText = computed(() => {
  return `${serviceStore.contextUsage}%`
})
</script>

<template>
  <footer class="app-footer">
    <div class="footer-left">
      <div class="footer-item">
        <span class="status-dot" :class="serviceStore.status"></span>
        <span class="status-label">{{ serviceStore.status === 'running' ? '运行中' : '已停止' }}</span>
      </div>
      
      <div class="footer-divider"></div>
      
      <div class="footer-item">
        <span class="footer-icon">🔌</span>
        <span class="footer-value">:{{ serviceStore.port }}</span>
      </div>
    </div>
    
    <div class="footer-center">
      <div class="context-usage">
        <span class="footer-icon">🧠</span>
        <span class="context-label">上下文</span>
        <n-progress
          type="line"
          :percentage="serviceStore.contextUsage"
          :status="contextColor"
          :show-indicator="false"
          :height="6"
          :border-radius="3"
          style="width: 120px;"
        />
        <span class="context-value" :class="contextColor">{{ contextText }}</span>
      </div>
    </div>
    
    <div class="footer-right">
      <div class="footer-item task-info">
        <span class="footer-icon">📋</span>
        <span>{{ taskStore.currentTask?.taskDescription || '空闲' }}</span>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.app-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 16px;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-primary);
  font-size: 12px;
  color: var(--text-secondary);
}

.footer-left, .footer-center, .footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 6px;
  
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transition: all var(--transition-fast);
    
    &.running {
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
      animation: pulse 2s infinite;
    }
    
    &.starting {
      background: var(--warning);
      animation: pulse 1s infinite;
    }
    
    &.stopped {
      background: var(--error);
    }
  }
  
  .status-label {
    font-weight: 500;
  }
  
  .footer-icon {
    font-size: 12px;
    opacity: 0.7;
  }
  
  .footer-value {
    font-family: 'SF Mono', Monaco, monospace;
    color: var(--text-primary);
  }
}

.footer-divider {
  width: 1px;
  height: 16px;
  background: var(--border-primary);
}

.context-usage {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
  
  .context-label {
    font-size: 11px;
    color: var(--text-tertiary);
  }
  
  .context-value {
    font-weight: 600;
    font-size: 11px;
    min-width: 32px;
    text-align: right;
    
    &.success { color: var(--success); }
    &.warning { color: var(--warning); }
    &.error { color: var(--error); }
  }
  
  :deep(.n-progress) {
    .n-progress-graph-line-fill {
      background: var(--brand-gradient);
    }
  }
}

.task-info {
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
