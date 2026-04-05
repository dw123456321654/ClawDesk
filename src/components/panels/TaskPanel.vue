<script setup lang="ts">
import { computed } from 'vue'
import { NProgress, NIcon, NEmpty, NTag } from 'naive-ui'
import { useTaskStore } from '@/stores/task'
import {
  CheckmarkCircleOutline,
  TimeOutline,
  EllipseOutline,
  AlertCircleOutline
} from '@vicons/ionicons5'

const taskStore = useTaskStore()

// 进度状态
const progressStatus = computed((): 'error' | 'success' | undefined => {
  if (!taskStore.currentTask) return undefined
  const task = taskStore.currentTask
  
  if (task.status === 'failed') return 'error'
  if (task.status === 'completed') return 'success'
  if (taskStore.progress >= 80) return 'success'
  return undefined
})

// 状态标签
const statusTag = computed((): { type: 'default' | 'info' | 'success' | 'warning' | 'error' | 'primary'; text: string } | null => {
  if (!taskStore.currentTask) return null
  const task = taskStore.currentTask
  
  switch (task.status) {
    case 'in_progress':
      return { type: 'info', text: '进行中' }
    case 'completed':
      return { type: 'success', text: '已完成' }
    case 'failed':
      return { type: 'error', text: '失败' }
    case 'abandoned':
      return { type: 'warning', text: '已放弃' }
    default:
      return { type: 'default', text: '待开始' }
  }
})
</script>

<template>
  <div class="task-panel">
    <!-- 当前任务 -->
    <div v-if="taskStore.currentTask" class="current-task">
      <!-- 任务头部 -->
      <div class="task-header">
        <h4>📋 当前任务</h4>
        <n-tag v-if="statusTag" :type="statusTag.type" size="small">
          {{ statusTag.text }}
        </n-tag>
      </div>
      
      <!-- 任务名称 -->
      <p class="task-name">{{ taskStore.currentTask.taskDescription }}</p>
      
      <!-- 进度条 -->
      <div class="progress-wrapper">
        <n-progress
          type="line"
          :percentage="taskStore.progress"
          :status="progressStatus"
          :height="24"
          :border-radius="6"
          :fill-border-radius="6"
          rail-color="rgba(255,255,255,0.1)"
        >
          <span class="progress-text">{{ taskStore.progress }}%</span>
        </n-progress>
      </div>
      
      <!-- 进度信息 -->
      <div class="progress-info">
        <span class="step-count">
          {{ taskStore.currentTask.completedSteps }} / {{ taskStore.currentTask.totalSteps }} 步骤
        </span>
        <span v-if="taskStore.formattedEstimatedTime" class="estimated-time">
          ⏱️ {{ taskStore.formattedEstimatedTime }}
        </span>
      </div>
      
      <!-- 当前步骤 -->
      <div v-if="taskStore.currentStep" class="current-step">
        <n-icon size="16" color="#2080f0">
          <TimeOutline />
        </n-icon>
        <span>{{ taskStore.currentStep.title || `步骤 ${taskStore.currentStep.step}` }}</span>
      </div>
      
      <!-- 步骤列表 -->
      <div class="steps-list">
        <div class="steps-header">执行步骤：</div>
        <div
          v-for="checkpoint in taskStore.currentTask.checkpoints"
          :key="checkpoint.step"
          class="step-item"
          :class="checkpoint.status"
        >
          <n-icon size="16">
            <CheckmarkCircleOutline v-if="checkpoint.status === 'completed'" />
            <TimeOutline v-else-if="checkpoint.status === 'in_progress'" class="spin" />
            <EllipseOutline v-else />
          </n-icon>
          <span class="step-title">
            {{ checkpoint.title || `步骤 ${checkpoint.step}` }}
          </span>
          <span v-if="checkpoint.completedAt" class="step-time">
            {{ new Date(checkpoint.completedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
          </span>
        </div>
      </div>
      
      <!-- 错误信息 -->
      <div v-if="taskStore.currentTask.error" class="error-info">
        <n-icon size="16" color="#d03050">
          <AlertCircleOutline />
        </n-icon>
        <span>{{ taskStore.currentTask.error }}</span>
      </div>
    </div>
    
    <!-- 无任务 -->
    <n-empty v-else description="暂无进行中的任务" />
  </div>
</template>

<style scoped lang="scss">
.task-panel {
  font-size: 13px;
  padding: 8px;
}

.current-task {
  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.task-name {
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  font-size: 13px;
}

.progress-wrapper {
  margin: 12px 0;
  
  .progress-text {
    font-size: 12px;
    font-weight: 600;
  }
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 12px;
  
  .step-count {
    color: var(--text-secondary);
  }
  
  .estimated-time {
    color: var(--text-tertiary);
  }
}

.current-step {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(32, 128, 240, 0.1);
  border-radius: var(--radius-md);
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-primary);
}

.steps-list {
  margin-top: 12px;
  
  .steps-header {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-bottom: 8px;
  }
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--border-secondary);
  
  &:last-child {
    border-bottom: none;
  }
  
  &.completed {
    color: var(--success, #18a058);
    
    .step-title {
      text-decoration: line-through;
      opacity: 0.7;
    }
  }
  
  &.in_progress {
    color: #2080f0;
    
    .step-title {
      font-weight: 500;
    }
    
    .spin {
      animation: spin 1s linear infinite;
    }
  }
  
  &.pending {
    color: var(--text-tertiary);
  }
}

.step-title {
  flex: 1;
}

.step-time {
  font-size: 11px;
  color: var(--text-tertiary);
}

.error-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(208, 48, 80, 0.1);
  border-radius: var(--radius-md);
  margin-top: 12px;
  font-size: 12px;
  color: #d03050;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
