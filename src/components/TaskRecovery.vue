<script setup lang="ts">
import { computed } from 'vue'
import { NModal, NButton, NSpace, NProgress, NIcon } from 'naive-ui'
import {
  CheckmarkCircleOutline,
  EllipseOutline
} from '@vicons/ionicons5'
import type { Task } from '@/stores/task'

const props = defineProps<{
  show: boolean
  task: Task | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'continue'): void
  (e: 'abandon'): void
  (e: 'close'): void
}>()

// 进度百分比
const progress = computed(() => {
  if (!props.task) return 0
  if (props.task.totalSteps === 0) return 0
  return Math.round((props.task.completedSteps / props.task.totalSteps) * 100)
})

// 已完成步骤
const completedSteps = computed(() => {
  if (!props.task) return []
  return props.task.checkpoints.filter(c => c.status === 'completed')
})

// 待完成步骤
const pendingSteps = computed(() => {
  if (!props.task) return []
  return props.task.checkpoints.filter(c => c.status !== 'completed')
})

// 当前步骤
const currentStep = computed(() => {
  if (!props.task) return null
  return props.task.checkpoints.find(c => c.status === 'in_progress')
})

// 关闭弹窗
const handleClose = () => {
  emit('update:show', false)
  emit('close')
}

// 继续任务
const handleContinue = () => {
  emit('continue')
  handleClose()
}

// 放弃任务
const handleAbandon = () => {
  emit('abandon')
  handleClose()
}
</script>

<template>
  <n-modal
    :show="show"
    @update:show="handleClose"
    preset="card"
    style="width: 500px;"
    :bordered="false"
  >
    <template #header>
      <div class="modal-header">
        <span class="header-icon">⚠️</span>
        <span>检测到未完成的任务</span>
      </div>
    </template>
    
    <div v-if="task" class="task-recovery">
      <!-- 任务信息 -->
      <div class="task-info">
        <p class="task-name">{{ task.taskDescription }}</p>
        <div class="task-meta">
          <span class="meta-item">
            <span class="meta-label">进度</span>
            <span class="meta-value">{{ task.completedSteps }}/{{ task.totalSteps }}</span>
          </span>
          <span class="meta-item">
            <span class="meta-label">最后更新</span>
            <span class="meta-value">{{ new Date(task.updatedAt).toLocaleString() }}</span>
          </span>
        </div>
      </div>
      
      <!-- 进度条 -->
      <n-progress
        type="line"
        :percentage="progress"
        :height="20"
        :border-radius="10"
        :show-indicator="false"
        class="progress-bar"
      >
        <template #default>
          <span class="progress-text">{{ progress }}%</span>
        </template>
      </n-progress>
      
      <!-- 当前步骤 -->
      <div class="steps-section current-step" v-if="currentStep">
        <h4>正在进行</h4>
        <div class="step-item current">
          <n-icon size="16" color="#ff6b35">
            <EllipseOutline />
          </n-icon>
          <span>{{ currentStep.title || `步骤 ${currentStep.step}` }}</span>
        </div>
      </div>
      
      <!-- 已完成步骤 -->
      <div class="steps-section" v-if="completedSteps.length > 0">
        <h4>已完成 ({{ completedSteps.length }})</h4>
        <div class="step-list">
          <div
            v-for="step in completedSteps"
            :key="step.step"
            class="step-item completed"
          >
            <n-icon size="16" color="#34c759">
              <CheckmarkCircleOutline />
            </n-icon>
            <span>{{ step.title || `步骤 ${step.step}` }}</span>
          </div>
        </div>
      </div>
      
      <!-- 待完成步骤 -->
      <div class="steps-section" v-if="pendingSteps.length > 0">
        <h4>待完成 ({{ pendingSteps.length }})</h4>
        <div class="step-list">
          <div
            v-for="step in pendingSteps"
            :key="step.step"
            class="step-item pending"
          >
            <n-icon size="16" color="#48484a">
              <EllipseOutline />
            </n-icon>
            <span>{{ step.title || `步骤 ${step.step}` }}</span>
          </div>
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <n-space justify="end" style="margin-top: 20px;">
        <n-button @click="handleAbandon" type="error" ghost>
          放弃任务
        </n-button>
        <n-button @click="handleContinue" type="primary">
          继续任务
        </n-button>
      </n-space>
    </div>
    
    <div v-else class="no-task">
      <p>未找到任务信息</p>
    </div>
  </n-modal>
</template>

<style scoped lang="scss">
.modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  
  .header-icon {
    font-size: 18px;
  }
}

.task-recovery {
  font-size: 14px;
}

.task-info {
  margin-bottom: 16px;
  
  .task-name {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 12px 0;
    color: var(--text-primary);
  }
  
  .task-meta {
    display: flex;
    gap: 16px;
    
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      
      .meta-label {
        font-size: 11px;
        color: var(--text-tertiary);
      }
      
      .meta-value {
        font-size: 13px;
        color: var(--text-secondary);
        font-weight: 500;
      }
    }
  }
}

.progress-bar {
  margin: 16px 0;
  
  .progress-text {
    font-size: 12px;
    font-weight: 600;
    color: white;
  }
}

.steps-section {
  margin: 12px 0;
  
  h4 {
    font-size: 12px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  &.current-step {
    background: linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(156, 39, 176, 0.1));
    padding: 12px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-accent);
  }
}

.step-list {
  padding-left: 4px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  
  &.completed {
    color: var(--text-primary);
  }
  
  &.current {
    color: var(--brand-primary);
    font-weight: 500;
  }
  
  &.pending {
    color: var(--text-tertiary);
  }
}

.no-task {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}
</style>
