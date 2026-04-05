<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  NButton, 
  NSpace, 
  NTabs, 
  NTabPane,
  NEmpty,
  NProgress,
  NTag,
  NIcon,
  useMessage,
  useDialog
} from 'naive-ui'
import {
  PlayOutline,
  TrashOutline,
  EyeOutline,
  RefreshOutline
} from '@vicons/ionicons5'
import { useTaskStore, type TaskStatus } from '@/stores/task'

const taskStore = useTaskStore()
const message = useMessage()
const dialog = useDialog()

const activeTab = ref<TaskStatus | 'all'>('all')

// 按状态分组
const tasksByStatus = computed(() => {
  const all = taskStore.tasks
  
  return {
    all: all,
    in_progress: all.filter(t => t.status === 'in_progress'),
    completed: all.filter(t => t.status === 'completed'),
    failed: all.filter(t => t.status === 'failed'),
    abandoned: all.filter(t => t.status === 'abandoned')
  }
})

// 当前显示的任务列表
const displayTasks = computed(() => {
  if (activeTab.value === 'all') {
    return taskStore.tasks.slice().sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }
  return tasksByStatus.value[activeTab.value]
})

// 格式化时间
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  
  if (isToday) {
    return `今天 ${time}`
  }
  
  return date.toLocaleDateString('zh-CN', { 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit'
  })
}

// 状态标签
const getStatusTag = (status: TaskStatus) => {
  const map: Record<TaskStatus, { type: 'default' | 'info' | 'success' | 'warning' | 'error'; text: string }> = {
    pending: { type: 'default', text: '待开始' },
    in_progress: { type: 'info', text: '进行中' },
    completed: { type: 'success', text: '已完成' },
    failed: { type: 'error', text: '失败' },
    abandoned: { type: 'warning', text: '已放弃' }
  }
  return map[status]
}

// 查看任务详情
const handleViewDetail = (task: typeof taskStore.tasks[0]) => {
  dialog.info({
    title: '任务详情',
    content: `
任务ID: ${task.taskId}
描述: ${task.taskDescription}
状态: ${getStatusTag(task.status).text}
进度: ${task.completedSteps}/${task.totalSteps}
创建时间: ${formatTime(task.createdAt)}
更新时间: ${formatTime(task.updatedAt)}
${task.error ? `错误: ${task.error}` : ''}
    `.trim(),
    positiveText: '关闭'
  })
}

// 继续任务
const handleContinue = (task: typeof taskStore.tasks[0]) => {
  if (task.status === 'in_progress') {
    message.info('任务已在进行中')
    return
  }
  
  // 设置为当前任务
  taskStore.startTask(task.taskId)
  message.success('已继续任务')
}

// 放弃任务
const handleAbandon = (task: typeof taskStore.tasks[0]) => {
  dialog.warning({
    title: '放弃任务',
    content: `确定要放弃任务「${task.taskDescription.slice(0, 20)}...」吗？`,
    positiveText: '放弃',
    negativeText: '取消',
    onPositiveClick: () => {
      taskStore.abandonTask(task.taskId)
      message.success('任务已放弃')
    }
  })
}

// 删除已完成任务
const handleCleanup = () => {
  taskStore.cleanupCompletedTasks(10)
  message.success('已清理旧任务')
}
</script>

<template>
  <div class="task-manage-panel">
    <!-- 标签页 -->
    <n-tabs v-model:value="activeTab" type="line" size="small">
      <n-tab-pane name="all" tab="全部">
        <template #default>
          <span class="tab-count">({{ taskStore.tasks.length }})</span>
        </template>
      </n-tab-pane>
      <n-tab-pane name="in_progress" tab="进行中">
        <template #default>
          <span class="tab-count">({{ tasksByStatus.in_progress.length }})</span>
        </template>
      </n-tab-pane>
      <n-tab-pane name="completed" tab="已完成">
        <template #default>
          <span class="tab-count">({{ tasksByStatus.completed.length }})</span>
        </template>
      </n-tab-pane>
      <n-tab-pane name="failed" tab="失败">
        <template #default>
          <span class="tab-count">({{ tasksByStatus.failed.length }})</span>
        </template>
      </n-tab-pane>
    </n-tabs>
    
    <!-- 任务列表 -->
    <div class="task-list">
      <template v-if="displayTasks.length > 0">
        <div
          v-for="task in displayTasks"
          :key="task.taskId"
          class="task-item"
          :class="{ active: task.taskId === taskStore.currentTaskId }"
        >
          <div class="task-header">
            <span class="task-name">{{ task.taskDescription }}</span>
            <n-tag 
              :type="getStatusTag(task.status).type" 
              size="small"
            >
              {{ getStatusTag(task.status).text }}
            </n-tag>
          </div>
          
          <div class="task-progress">
            <n-progress
              type="line"
              :percentage="Math.round((task.completedSteps / task.totalSteps) * 100)"
              :height="6"
              :show-indicator="false"
              :border-radius="3"
            />
            <span class="progress-text">
              {{ task.completedSteps }}/{{ task.totalSteps }}
            </span>
          </div>
          
          <div class="task-meta">
            <span class="task-time">{{ formatTime(task.createdAt) }}</span>
            <span class="task-project" v-if="task.projectName">
              {{ task.projectName }}
            </span>
          </div>
          
          <div class="task-actions">
            <n-button 
              quaternary 
              size="tiny"
              @click="handleViewDetail(task)"
            >
              <template #icon>
                <n-icon><EyeOutline /></n-icon>
              </template>
              详情
            </n-button>
            
            <n-button 
              v-if="task.status !== 'in_progress' && task.status !== 'completed'"
              quaternary 
              size="tiny"
              @click="handleContinue(task)"
            >
              <template #icon>
                <n-icon><PlayOutline /></n-icon>
              </template>
              继续
            </n-button>
            
            <n-button 
              v-if="task.status === 'in_progress'"
              quaternary 
              size="tiny"
              type="warning"
              @click="handleAbandon(task)"
            >
              <template #icon>
                <n-icon><TrashOutline /></n-icon>
              </template>
              放弃
            </n-button>
          </div>
        </div>
      </template>
      
      <n-empty v-else description="暂无任务" size="small" />
    </div>
    
    <!-- 底部操作 -->
    <div class="bottom-actions">
      <n-button 
        quaternary 
        size="small"
        @click="handleCleanup"
        :disabled="tasksByStatus.completed.length === 0"
      >
        <template #icon>
          <n-icon><TrashOutline /></n-icon>
        </template>
        清理已完成
      </n-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.task-manage-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  
  :deep(.n-tabs) {
    .n-tabs-nav {
      padding: 0 8px;
    }
    
    .n-tab-pane {
      padding: 0;
    }
  }
}

.tab-count {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: 4px;
}

.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: var(--border-secondary);
    border-radius: 3px;
  }
}

.task-item {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: var(--radius-md);
  background-color: var(--bg-secondary);
  border: 1px solid transparent;
  transition: all 0.2s;
  
  &:hover {
    background-color: var(--bg-tertiary);
  }
  
  &.active {
    border-color: var(--brand-primary);
    background-color: rgba(255, 107, 53, 0.05);
  }
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.task-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
  margin-right: 8px;
  word-break: break-all;
  
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  
  .n-progress {
    flex: 1;
  }
  
  .progress-text {
    font-size: 11px;
    color: var(--text-tertiary);
    flex-shrink: 0;
  }
}

.task-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
}

.task-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.bottom-actions {
  padding: 8px;
  border-top: 1px solid var(--border-secondary);
  display: flex;
  justify-content: flex-end;
}
</style>
