<script setup lang="ts">
import { ref, computed } from 'vue'
import { NTabs, NTabPane, NEmpty, NButton, NTag, NSpace, NIcon, NPopconfirm, NText } from 'naive-ui'
import { 
  TrashOutline, 
  CheckmarkCircleOutline,
  TimeOutline,
  CloseCircleOutline
} from '@vicons/ionicons5'
import { useTaskStore, type Task } from '@/stores/task'

const taskStore = useTaskStore()

// 当前标签
const activeTab = ref<'in_progress' | 'completed' | 'abandoned'>('in_progress')

// 获取任务列表
const taskList = computed(() => {
  return taskStore.getTasksByStatus(activeTab.value)
})

// 状态标签类型
const getStatusType = (status: string) => {
  switch (status) {
    case 'in_progress': return 'warning'
    case 'completed': return 'success'
    case 'abandoned': return 'error'
    default: return 'default'
  }
}

// 状态文字
const getStatusText = (status: string) => {
  switch (status) {
    case 'in_progress': return '进行中'
    case 'completed': return '已完成'
    case 'abandoned': return '已放弃'
    case 'pending': return '待开始'
    default: return '未知'
  }
}

// 放弃任务
const handleAbandon = (task: Task) => {
  taskStore.abandonTask(task.taskId)
}

// 格式化时间
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 计算进度
const getProgress = (task: Task) => {
  if (task.totalSteps === 0) return 0
  return Math.round((task.completedSteps / task.totalSteps) * 100)
}
</script>

<template>
  <div class="task-manage-panel">
    <n-tabs v-model:value="activeTab" type="line" size="small">
      <n-tab-pane name="in_progress" tab="进行中">
        <template #tab>
          <n-space align="center" :size="4">
            <n-icon><TimeOutline /></n-icon>
            <span>进行中</span>
            <n-tag 
              v-if="taskStore.getTasksByStatus('in_progress').length > 0"
              size="small" 
              round
              :bordered="false"
            >
              {{ taskStore.getTasksByStatus('in_progress').length }}
            </n-tag>
          </n-space>
        </template>
      </n-tab-pane>
      
      <n-tab-pane name="completed" tab="已完成">
        <template #tab>
          <n-space align="center" :size="4">
            <n-icon><CheckmarkCircleOutline /></n-icon>
            <span>已完成</span>
          </n-space>
        </template>
      </n-tab-pane>
      
      <n-tab-pane name="abandoned" tab="已放弃">
        <template #tab>
          <n-space align="center" :size="4">
            <n-icon><CloseCircleOutline /></n-icon>
            <span>已放弃</span>
          </n-space>
        </template>
      </n-tab-pane>
    </n-tabs>
    
    <div class="task-list">
      <n-empty v-if="taskList.length === 0" description="暂无任务" />
      
      <div 
        v-for="task in taskList" 
        :key="task.taskId" 
        class="task-item"
      >
        <div class="task-header">
          <n-text strong class="task-name">{{ task.taskDescription }}</n-text>
          <n-tag :type="getStatusType(task.status)" size="small">
            {{ getStatusText(task.status) }}
          </n-tag>
        </div>
        
        <div class="task-meta">
          <span class="meta-item">
            进度: {{ task.completedSteps }}/{{ task.totalSteps }} ({{ getProgress(task) }}%)
          </span>
          <span class="meta-item">
            更新: {{ formatTime(task.updatedAt) }}
          </span>
        </div>
        
        <div class="task-progress">
          <div class="progress-bar" :style="{ width: getProgress(task) + '%' }"></div>
        </div>
        
        <div class="task-actions" v-if="task.status === 'in_progress'">
          <n-popconfirm @positive-click="handleAbandon(task)">
            <template #trigger>
              <n-button size="tiny" type="error" quaternary>
                <template #icon><n-icon><TrashOutline /></n-icon></template>
                放弃
              </n-button>
            </template>
            确定要放弃这个任务吗？
          </n-popconfirm>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.task-manage-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.task-list {
  flex: 1;
  overflow-y: auto;
  margin-top: 12px;
}

.task-item {
  padding: 12px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.02);
  margin-bottom: 8px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  
  .task-name {
    flex: 1;
    font-size: 13px;
    line-height: 1.4;
  }
}

.task-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  
  .meta-item {
    font-size: 11px;
    color: var(--text-secondary);
  }
}

.task-progress {
  height: 4px;
  background-color: rgba(0, 0, 0, 0.06);
  border-radius: 2px;
  overflow: hidden;
  
  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #18a058, #36ad6a);
    border-radius: 2px;
    transition: width 0.3s ease;
  }
}

.task-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
