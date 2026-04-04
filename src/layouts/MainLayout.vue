<script setup lang="ts">
import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import ServicePanel from '@/components/panels/ServicePanel.vue'
import TaskPanel from '@/components/panels/TaskPanel.vue'
import HelpPanel from '@/components/panels/HelpPanel.vue'
import TaskManagePanel from '@/components/panels/TaskManagePanel.vue'
import TaskRecovery from '@/components/TaskRecovery.vue'
import type { Task } from '@/stores/task'

const message = useMessage()

// 右侧面板当前标签
const activePanel = ref('service')
const panels = [
  { key: 'service', label: '服务管理' },
  { key: 'task', label: '任务进度' },
  { key: 'taskManage', label: '任务管理' },
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
const handleContinueTask = () => {
  message.info('正在恢复任务上下文...')
  // TODO: 加载任务上下文到 AI 会话
}

// 放弃任务
const handleAbandonTask = () => {
  message.warning('任务已放弃')
  // TODO: 更新任务状态为 abandoned
}
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
          <div class="panel-tabs">
            <n-button
              v-for="panel in panels"
              :key="panel.key"
              :type="activePanel === panel.key ? 'primary' : 'default'"
              size="small"
              @click="activePanel = panel.key"
            >
              {{ panel.label }}
            </n-button>
          </div>
          
          <div class="panel-content">
            <ServicePanel v-if="activePanel === 'service'" />
            <TaskPanel v-else-if="activePanel === 'task'" />
            <TaskManagePanel v-else-if="activePanel === 'taskManage'" />
            <HelpPanel v-else-if="activePanel === 'help'" />
          </div>
        </n-layout-sider>
      </n-layout>
      
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
  padding: 16px;
  overflow-y: auto;
  height: calc(100% - 56px);
  background: var(--bg-secondary);
}
</style>
