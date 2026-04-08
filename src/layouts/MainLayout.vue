<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import ServicePanel from '@/components/panels/ServicePanel.vue'
import TaskPanel from '@/components/panels/TaskPanel.vue'
import HelpPanel from '@/components/panels/HelpPanel.vue'
import TaskManagePanel from '@/components/panels/TaskManagePanel.vue'
import LogPanel from '@/components/panels/LogPanel.vue'
import TaskRecovery from '@/components/TaskRecovery.vue'
import QuickActions from '@/components/QuickActions.vue'
import type { Task } from '@/stores/task'
import { useServiceStore } from '@/stores/service'
import { useUIStore } from '@/stores/ui'
import { useTaskStore } from '@/stores/task'
import { useChatStore } from '@/stores/chat'

const message = useMessage()
const serviceStore = useServiceStore()
const uiStore = useUIStore()
const taskStore = useTaskStore()
const chatStore = useChatStore()

// 右侧面板标签列表
const panels = [
  { key: 'service', label: '服务管理' },
  { key: 'task', label: '任务进度' },
  { key: 'taskManage', label: '任务管理' },
  { key: 'log', label: '日志' },
  { key: 'help', label: '帮助' }
]

// 任务恢复弹窗
const showRecoveryModal = ref(false)
const unfinishedTask = ref<Task | null>(null)

// 检查未完成任务（由外部调用）
const checkTask = (task: Task) => {
  unfinishedTask.value = task
  showRecoveryModal.value = true
}

// 暴露方法供外部调用
defineExpose({ checkTask })

// 继续任务
const handleContinueTask = async () => {
  if (!unfinishedTask.value) return
  
  const task = unfinishedTask.value
  
  // 设置为当前任务
  taskStore.currentTaskId = task.taskId
  
  // 切换到任务进度面板
  uiStore.setActivePanel('task')
  
  message.success('正在恢复任务上下文...')
  
  // 构建恢复提示消息
  const completedStepsList = task.checkpoints
    .filter(c => c.status === 'completed')
    .map(c => `✅ ${c.title || `步骤 ${c.step}`}`)
    .join('\n')
  
  const pendingStepsList = task.checkpoints
    .filter(c => c.status !== 'completed')
    .map(c => `⏳ ${c.title || `步骤 ${c.step}`}`)
    .join('\n')
  
  const currentStep = task.checkpoints.find(c => c.status === 'in_progress')
  
  const recoveryMessage = `📋 **任务恢复**

**任务名称**: ${task.taskDescription}

**进度**: ${task.completedSteps}/${task.totalSteps} 步骤已完成

**已完成步骤**:
${completedStepsList || '无'}

**待完成步骤**:
${pendingStepsList || '无'}

${currentStep ? `**当前步骤**: ${currentStep.title || `步骤 ${currentStep.step}`}` : ''}

---
请从中断点继续执行任务。`
  
  // 发送恢复消息到聊天
  chatStore.addMessage({
    id: `msg-${Date.now()}`,
    role: 'user',
    content: recoveryMessage,
    timestamp: Date.now()
  })
  
  // TODO: 实际发送到 AI 需要调用 Gateway API
}

// 放弃任务
const handleAbandonTask = () => {
  if (!unfinishedTask.value) return
  
  taskStore.abandonTask(unfinishedTask.value.taskId)
  message.warning('任务已放弃')
}

// 启动时检查未完成任务
onMounted(async () => {
  // 1. 检查未完成任务
  const unfinished = taskStore.checkForUnfinishedTask()
  if (unfinished) {
    // 延迟显示，等待 UI 加载完成
    setTimeout(() => {
      checkTask(unfinished)
    }, 500)
  }
  
  // 2. 检查是否需要自动启动 Gateway
  const urlParams = new URLSearchParams(window.location.search)
  const isAutoStart = urlParams.has('autoStart') || 
    localStorage.getItem('clawdesk-autoStartGateway') === 'true'
  
  if (isAutoStart) {
    // 刷新状态，如果未运行则自动启动
    await serviceStore.refreshStatus()
    if (serviceStore.status !== 'running') {
      const port = parseInt(localStorage.getItem('clawdesk-port') || '18789', 10)
      message.info('正在自动启动 Gateway...')
      await serviceStore.startGateway(port)
    }
  }
})
</script>

<template>
  <n-layout class="main-layout" has-sider>
    <!-- 左侧导航栏 -->
    <AppSidebar />
    
    <n-layout>
      <!-- 顶部栏 -->
      <AppHeader />
      
      <!-- 主内容区 -->
      <n-layout class="content-layout" has-sider>
        <n-layout-content class="main-content">
          <router-view />
        </n-layout-content>
        
        <!-- 右侧面板 -->
        <n-layout-sider
          class="right-panel"
          :width="320"
          :native-scrollbar="false"
          bordered
        >
          <div class="right-panel-inner">
            <div class="panel-tabs">
            <n-button
              v-for="panel in panels"
              :key="panel.key"
              :type="uiStore.activePanel === panel.key ? 'primary' : 'default'"
              size="small"
              @click="uiStore.setActivePanel(panel.key)"
            >
              {{ panel.label }}
            </n-button>
          </div>
          
          <div class="panel-content">
            <ServicePanel v-if="uiStore.activePanel === 'service'" />
            <TaskPanel v-else-if="uiStore.activePanel === 'task'" />
            <TaskManagePanel v-else-if="uiStore.activePanel === 'taskManage'" />
            <LogPanel v-else-if="uiStore.activePanel === 'log'" />
            <HelpPanel v-else-if="uiStore.activePanel === 'help'" />
          </div>
          </div>
        </n-layout-sider>
      </n-layout>
      
      <!-- 快捷操作 -->
      <div class="quick-actions-fixed">
        <QuickActions />
      </div>
      
      <!-- 底部状态栏 -->
      <AppFooter />
    </n-layout>
    
    <!-- 任务恢复弹窗 -->
    <TaskRecovery
      v-model:show="showRecoveryModal"
      :task="unfinishedTask"
      @continue="handleContinueTask"
      @abandon="handleAbandonTask"
    />
  </n-layout>
</template>

<style scoped lang="scss">
.main-layout {
  width: 100%;
  height: 100%;
}

.content-layout {
  height: calc(100vh - 80px); // 减去顶部栏和底部状态栏
}

.main-content {
  padding: 16px;
  background-color: var(--bg-secondary);
}

.right-panel {
  background-color: var(--bg-primary);
}

.right-panel-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panel-tabs {
  display: flex;
  gap: 4px;
  padding: 12px 12px 8px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-primary);
  position: sticky;
  top: 0;
  z-index: 10;
  
  :deep(.n-button) {
    flex: 1;
    height: 32px;
    font-size: 12px;
    font-weight: 500;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    
    &.n-button--default-type {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      
      &:hover {
        background: var(--bg-tertiary);
        color: var(--text-primary);
      }
    }
    
    &.n-button--primary-type {
      background: linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(156, 39, 176, 0.2));
      border: 1px solid var(--border-accent);
      color: var(--brand-primary);
      font-weight: 600;
      
      &:hover {
        background: linear-gradient(135deg, rgba(255, 107, 53, 0.3), rgba(156, 39, 176, 0.3));
      }
    }
  }
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: var(--bg-secondary);
  min-height: 0;
}

.quick-actions-fixed {
  position: fixed;
  bottom: 32px;
  right: 0;
  width: 320px;
  border-top: 1px solid var(--border-primary);
  background: var(--bg-primary);
  z-index: 1000;
}
</style>
