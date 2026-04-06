<script setup lang="ts">
import { watch, ref, onMounted, onUnmounted } from 'vue'
import { useNotification, useDialog } from 'naive-ui'
import { useServiceStore } from '@/stores/service'
import { useChatStore } from '@/stores/chat'
import { useTaskStore } from '@/stores/task'

const notification = useNotification()
const dialog = useDialog()
const serviceStore = useServiceStore()
const chatStore = useChatStore()
const taskStore = useTaskStore()

// 防止重复提示
const hasShownContextWarning = ref(false)
const hasShownContextCritical = ref(false)
const hasShownDisconnected = ref(false)

// 监听服务状态变化
watch(
  () => serviceStore.status,
  (newStatus, oldStatus) => {
    // 服务断开检测
    if (oldStatus === 'running' && newStatus === 'stopped') {
      if (!hasShownDisconnected.value) {
        hasShownDisconnected.value = true
        notification.warning({
          title: '服务断开',
          content: '与 Gateway 服务断开连接，请检查服务状态',
          duration: 5000
        })
      }
    }
    
    // 服务恢复
    if (newStatus === 'running') {
      hasShownDisconnected.value = false
    }
  }
)

// 监听上下文使用率
watch(
  () => chatStore.contextUsage.percentage,
  (percentage) => {
    // 重置标记（上下文降低时）
    if (percentage < 60) {
      hasShownContextWarning.value = false
      hasShownContextCritical.value = false
      return
    }
    
    // 80% 警告
    if (percentage >= 80 && percentage < 95 && !hasShownContextWarning.value) {
      hasShownContextWarning.value = true
      notification.warning({
        title: '上下文使用率较高',
        content: `当前上下文使用率 ${percentage}%，建议精简对话或新开会话`,
        duration: 5000
      })
    }
    
    // 95% 严重警告
    if (percentage >= 95 && !hasShownContextCritical.value) {
      hasShownContextCritical.value = true
      dialog.warning({
        title: '上下文即将满',
        content: `当前上下文使用率 ${percentage}%，即将达到上限。建议新开会话以避免对话中断。`,
        positiveText: '新开会话',
        negativeText: '稍后处理',
        onPositiveClick: () => {
          chatStore.clearMessages()
          notification.success({
            content: '已新开会话',
            duration: 2000
          })
        }
      })
    }
  }
)

// 任务超时检测
const TASK_TIMEOUT = 10 * 60 * 1000 // 10分钟无更新视为超时
let taskTimeoutChecker: ReturnType<typeof setInterval> | null = null

const checkTaskTimeout = () => {
  const currentTask = taskStore.currentTask
  if (!currentTask || currentTask.status !== 'in_progress') return
  
  const lastUpdate = new Date(currentTask.updatedAt).getTime()
  const now = Date.now()
  
  if (now - lastUpdate > TASK_TIMEOUT) {
    dialog.warning({
      title: '任务可能卡死',
      content: `任务「${currentTask.taskDescription.slice(0, 30)}...」已超过10分钟无响应。是否重试或放弃？`,
      positiveText: '继续等待',
      negativeText: '放弃任务',
      onNegativeClick: () => {
        taskStore.abandonTask(currentTask.taskId)
        notification.info({
          content: '任务已放弃',
          duration: 2000
        })
      }
    })
  }
}

onMounted(() => {
  // 每5分钟检查一次任务超时
  taskTimeoutChecker = setInterval(checkTaskTimeout, 5 * 60 * 1000)
})

onUnmounted(() => {
  if (taskTimeoutChecker) {
    clearInterval(taskTimeoutChecker)
  }
})
</script>

<template>
  <!-- 这是一个无界面组件，只负责监控和提示 -->
</template>
