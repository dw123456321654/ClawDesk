<script setup lang="ts">
import { computed } from 'vue'
import { NProgress, NIcon, NEmpty } from 'naive-ui'
import { useTaskStore } from '@/stores/task'
import {
  CheckmarkCircleOutline,
  TimeOutline,
  EllipseOutline
} from '@vicons/ionicons5'

const taskStore = useTaskStore()

// 进度颜色
const progressColor = computed(() => {
  const progress = taskStore.progress
  if (progress >= 80) return 'success'
  if (progress >= 50) return 'info'
  return 'default'
})
</script>

<template>
  <div class="task-panel">
    <!-- 当前任务 -->
    <div v-if="taskStore.currentTask" class="current-task">
      <h4>📋 当前任务</h4>
      <p class="task-name">{{ taskStore.currentTask.taskDescription }}</p>
      
      <!-- 进度条 -->
      <n-progress
        type="line"
        :percentage="taskStore.progress"
        :status="progressColor"
        :height="20"
        :border-radius="4"
        style="margin: 12px 0;"
      >
        {{ taskStore.progress }}%
      </n-progress>
      
      <!-- 步骤列表 -->
      <div class="steps-list">
        <div
          v-for="checkpoint in taskStore.currentTask.checkpoints"
          :key="checkpoint.step"
          class="step-item"
          :class="checkpoint.status"
        >
          <n-icon size="18">
            <CheckmarkCircleOutline v-if="checkpoint.status === 'completed'" />
            <TimeOutline v-else-if="checkpoint.status === 'in_progress'" />
            <EllipseOutline v-else />
          </n-icon>
          <span>{{ checkpoint.title }}</span>
          <span v-if="checkpoint.completedAt" class="step-time">
            {{ new Date(checkpoint.completedAt).toLocaleTimeString() }}
          </span>
        </div>
      </div>
    </div>
    
    <!-- 无任务 -->
    <n-empty v-else description="暂无进行中的任务" />
  </div>
</template>

<style scoped lang="scss">
.task-panel {
  font-size: 13px;
}

.current-task {
  h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 500;
  }
}

.task-name {
  color: var(--text-secondary);
  margin: 0;
}

.steps-list {
  margin-top: 12px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-secondary);
  
  &:last-child {
    border-bottom: none;
  }
  
  &.completed {
    color: var(--text-primary);
  }
  
  &.in_progress {
    color: #2080f0;
  }
  
  &.pending {
    color: var(--text-tertiary);
  }
}

.step-time {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-tertiary);
}
</style>
