<template>
  <div class="chat-panel">
    <!-- 消息列表 -->
    <div class="message-list" ref="messageListRef">
      <div v-if="messages.length === 0" class="empty-state">
        <div class="empty-avatar">
          <img :src="currentRole.avatar" :alt="currentRole.nickname" />
        </div>
        <p class="empty-greeting">{{ currentRole.greeting || '开始对话吧！' }}</p>
        <p class="empty-hint">正在和 {{ currentRole.nickname }} 对话</p>
      </div>
      
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message-item"
        :class="msg.role"
      >
        <div class="message-avatar">
          <span v-if="msg.role === 'user'">👤</span>
          <img v-else-if="msg.role === 'assistant'" :src="currentRole.avatar" :alt="currentRole.nickname" />
          <span v-else>⚙️</span>
        </div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-role">
              {{ msg.role === 'user' ? '你' : msg.role === 'assistant' ? currentRole.nickname : '系统' }}
            </span>
            <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
          </div>
          <div class="message-text" v-html="formatContent(msg.content)"></div>
          <!-- AI 回复操作按钮 -->
          <div v-if="msg.role === 'assistant' && !msg.pending" class="message-actions">
            <n-button quaternary size="tiny" @click="handleRefresh(msg)" :loading="msg.refreshing" title="重新生成">
              <template #icon><n-icon><RefreshOutline /></n-icon></template>
              刷新
            </n-button>
            <n-button quaternary size="tiny" @click="handleCopy(msg.content)" title="复制内容">
              <template #icon><n-icon><CopyOutline /></n-icon></template>
              复制
            </n-button>
          </div>
        </div>
      </div>
      
      <!-- 加载中 -->
      <div v-if="isWaiting" class="message-item assistant">
        <div class="message-avatar">
          <img :src="currentRole.avatar" :alt="currentRole.nickname" />
        </div>
        <div class="message-content">
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 输入区域 -->
    <div class="input-area">
      <n-input
        v-model:value="inputText"
        type="textarea"
        placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
        :autosize="{ minRows: 1, maxRows: 4 }"
        @keydown="handleKeydown"
        :disabled="!isConnected || isWaiting"
      />
      <div class="input-actions">
        <n-button
          quaternary
          size="small"
          @click="handleCompact"
          :disabled="!isConnected || isWaiting"
          title="压缩上下文"
        >
          <template #icon>
            <n-icon><ContractOutline /></n-icon>
          </template>
        </n-button>
        <n-button
          quaternary
          size="small"
          @click="handleNewSession"
          :disabled="isWaiting"
          title="新开会话"
        >
          <template #icon>
            <n-icon><AddOutline /></n-icon>
          </template>
        </n-button>
        <n-button
          type="primary"
          @click="sendMessage"
          :disabled="!inputText.trim() || !isConnected || isWaiting"
          :loading="isWaiting"
        >
          <template #icon>
            <n-icon><SendOutline /></n-icon>
          </template>
          发送
        </n-button>
      </div>
    </div>
    
    <!-- 底部状态栏 -->
    <div class="status-bar">
      <div class="status-left">
        <span class="status-item" :class="connectionStatusClass">
          {{ connectionStatusText }}
        </span>
      </div>
      <div class="status-right" v-if="isConnected">
        <span 
          class="status-item context-display clickable" 
          :class="contextStatusClass"
          @click="handleContextClick"
        >
          上下文: {{ contextUsage.percentage }}%
        </span>
      </div>
    </div>
    
    <!-- 上下文警告横幅 -->
    <div class="context-warning" v-if="isConnected && chatStore.shouldWarn && !chatStore.shouldAlert">
      <n-alert type="warning" size="small" closable>
        ⚠️ 上下文使用率较高 ({{ contextUsage.percentage }}%)，建议压缩或新开会话
      </n-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick, watch, onMounted } from 'vue'
import { NInput, NButton, NIcon, NAlert, useMessage, useDialog } from 'naive-ui'
import { SendOutline, ContractOutline, AddOutline, RefreshOutline, CopyOutline } from '@vicons/ionicons5'
import { GatewayClient, ChatMessage, getGatewayClient } from '@/utils/gateway'
import { useServiceStore } from '@/stores/service'
import { useChatStore } from '@/stores/chat'
import { useRoleStore } from '@/stores/role'
import { useTaskStore } from '@/stores/task'
import { readOpenClawConfig } from '@/utils/api'
import { exceptionMonitor } from '@/utils/exceptionMonitor'
import { useNotification } from 'naive-ui'
import {
  shouldAppendTaskProtocol,
  TASK_PROTOCOL_PROMPT,
  parseTaskStart,
  parseStepDone,
  parseTaskComplete,
  parseTaskFailed
} from '@/config/taskProtocol'

const message = useMessage()
const dialog = useDialog()
const notification = useNotification()
const serviceStore = useServiceStore()
const chatStore = useChatStore()
const roleStore = useRoleStore()
const taskStore = useTaskStore()

// 使用 chatStore 的消息列表和等待状态
const messages = computed(() => chatStore.messages)
const contextUsage = computed(() => chatStore.contextUsage)
const isWaiting = computed(() => chatStore.isWaiting)

// 当前角色
const currentRole = computed(() => roleStore.currentRole)

const inputText = ref('')
const messageListRef = ref<HTMLElement | null>(null)

// Gateway 客户端
let gatewayClient: GatewayClient | null = null

// 客户端连接状态
const clientConnected = ref(false)

// 连接状态（服务运行中 + 客户端已连接）
const isConnected = computed(() => serviceStore.status === 'running' && clientConnected.value)

// 连接状态显示
const connectionStatusText = computed(() => {
  if (serviceStore.status !== 'running') return '服务未启动'
  if (!clientConnected.value) return '未连接'
  return '已连接'
})

const connectionStatusClass = computed(() => {
  if (serviceStore.status !== 'running') return 'status-error'
  if (!clientConnected.value) return 'status-warning'
  return 'status-ok'
})

// 上下文状态样式
const contextStatusClass = computed(() => {
  return `context-${chatStore.contextStatus}`
})

// 监听服务状态，自动连接
watch(() => serviceStore.status, async (status) => {
  if (status === 'running' && !gatewayClient?.isConnected()) {
    await connectGateway()
  } else if (status !== 'running') {
    clientConnected.value = false
  }
}, { immediate: true })

// 监听上下文警告
watch(() => chatStore.shouldAlert, (shouldAlert) => {
  if (shouldAlert) {
    showContextAlert()
  }
})

// 监听消息变化，自动滚动到底部
watch(() => chatStore.messages.length, () => {
  scrollToBottom()
})

// 监听当前会话变化，滚动到底部
watch(() => chatStore.currentSessionId, () => {
  nextTick(() => {
    scrollToBottom()
  })
})

// 组件挂载时滚动到底部
onMounted(() => {
  // 延迟滚动，等待 DOM 渲染完成
  setTimeout(() => {
    scrollToBottom()
  }, 100)
})

// 显示上下文警告弹窗
function showContextAlert() {
  dialog.warning({
    title: '上下文即将满',
    content: `上下文使用率已达 ${contextUsage.value.percentage}%，建议立即新开会话，否则可能影响响应质量。`,
    positiveText: '新开会话',
    negativeText: '继续使用',
    onPositiveClick: () => {
      handleNewSession()
    }
  })
}

// 显示异常通知
function showExceptionNotification(type: 'task_timeout' | 'service_disconnected' | 'context_full') {
  const titles: Record<string, string> = {
    task_timeout: '⚠️ 任务可能卡死',
    service_disconnected: '🔌 服务连接断开',
    context_full: '📊 上下文即将满'
  }
  
  const messages: Record<string, string> = {
    task_timeout: '当前任务已执行超过60秒无响应',
    service_disconnected: '与 Gateway 的连接已断开',
    context_full: '上下文使用率已超过95%'
  }
  
  notification.warning({
    title: titles[type],
    content: messages[type],
    duration: 0
  })
  
  // 根据类型执行操作
  if (type === 'task_timeout') {
    dialog.warning({
      title: titles[type],
      content: messages[type],
      positiveText: '重试',
      negativeText: '忽略',
      onPositiveClick: () => handleRetry()
    })
  } else if (type === 'service_disconnected') {
    dialog.warning({
      title: titles[type],
      content: messages[type],
      positiveText: '重新连接',
      negativeText: '忽略',
      onPositiveClick: () => connectGateway()
    })
  }
}

// 重试发送
function handleRetry() {
  // 重置等待状态
  chatStore.setWaiting(false)
  exceptionMonitor.clearTaskMonitor()
}

// 连接 Gateway
async function connectGateway() {
  const config = await readOpenClawConfig()
  console.log('[Chat] OpenClaw config:', config)
  const token = config?.gatewayToken || ''
  const port = config?.port || 18789
  console.log('[Chat] Token:', token ? '***' + token.slice(-6) : '(empty)', 'Port:', port)
  
  gatewayClient = getGatewayClient()
  gatewayClient.setToken(token)
  gatewayClient.setPort(port)
  
  gatewayClient.onStatusChange = (status) => {
    console.log('[Chat] Gateway status:', status)
    clientConnected.value = status === 'connected'
    
    // 服务断开时触发异常
    if (status === 'disconnected' && isWaiting.value) {
      showExceptionNotification('service_disconnected')
    }
  }
  
  gatewayClient.onMessage = (msg) => {
    // 处理 content 格式：可能是字符串或数组
    const rawContent = msg.content as unknown
    let content: string
    if (typeof rawContent === 'string') {
      content = rawContent
    } else if (Array.isArray(rawContent)) {
      content = (rawContent as Array<{ type?: string; text?: string }>)
        .filter((item) => item.type === 'text')
        .map((item) => item.text || '')
        .join('')
    } else if (rawContent && typeof rawContent === 'object') {
      content = JSON.stringify(rawContent, null, 2)
    } else {
      content = String(rawContent ?? '')
    }
    
    // 处理流式消息追加
    if (msg.pending) {
      const lastMsg = chatStore.messages[chatStore.messages.length - 1]
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.pending) {
        chatStore.updateLastMessage(lastMsg.content + content, true)
        scrollToBottom()
        return
      }
      chatStore.addMessage({ ...msg, content, pending: true })
      scrollToBottom()
      return
    }
    
    // 完整消息
    const lastMsg = chatStore.messages[chatStore.messages.length - 1]
    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.pending) {
      chatStore.updateLastMessage(content, false)
    } else {
      chatStore.addMessage({ ...msg, content, pending: false })
    }
    chatStore.setWaiting(false)
    
    // 清除任务超时监控
    exceptionMonitor.clearTaskMonitor()
    
    // ========== 解析任务进度 ==========
    
    // 1. 解析任务开始
    const taskStart = parseTaskStart(content)
    if (taskStart) {
      const task = taskStore.createTask(
        taskStart.name,
        taskStart.stepCount
      )
      taskStore.startTask(task.taskId)
      
      // 初始化步骤标题
      if (taskStart.steps.length > 0) {
        taskStore.initTaskSteps(task.taskId, 
          taskStart.steps.map((title, i) => ({ step: i + 1, title }))
        )
      }
      
      console.log('[Task] 任务已创建:', taskStart.name, taskStart.stepCount, '步')
    }
    
    // 2. 解析步骤完成
    const stepDones = parseStepDone(content)
    if (stepDones.length > 0 && taskStore.currentTaskId) {
      stepDones.forEach(stepNum => {
        taskStore.completeStep(taskStore.currentTaskId!, stepNum)
        console.log('[Task] 步骤完成:', stepNum)
      })
    }
    
    // 3. 解析任务完成
    if (parseTaskComplete(content) && taskStore.currentTaskId) {
      taskStore.completeTask(taskStore.currentTaskId)
      message.success('任务已完成')
      console.log('[Task] 任务完成')
    }
    
    // 4. 解析任务失败
    const taskFailed = parseTaskFailed(content)
    if (taskFailed && taskStore.currentTaskId) {
      taskStore.failTask(taskStore.currentTaskId, taskFailed)
      message.error('任务失败: ' + taskFailed)
      console.log('[Task] 任务失败:', taskFailed)
    }
    
    // 重新计算 token
    chatStore.recalculateTokens()
    scrollToBottom()
  }
  
  try {
    await gatewayClient.connect()
    message.success('已连接到 Gateway')
  } catch (error) {
    console.error('[Chat] Connect error:', error)
    message.error('连接 Gateway 失败: ' + String(error))
  }
}

// 发送消息
async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || !isConnected.value || isWaiting.value) return
  
  // 检查是否需要追加任务协议提示
  let finalText = text
  if (shouldAppendTaskProtocol(text)) {
    finalText = text + TASK_PROTOCOL_PROMPT
  }
  
  // 添加用户消息（显示原始文本，不带协议提示）
  const userMsg: ChatMessage = {
    id: `user_${Date.now()}`,
    role: 'user',
    content: text,
    timestamp: Date.now()
  }
  chatStore.addMessage(userMsg)
  inputText.value = ''
  chatStore.setWaiting(true)
  
  // 启动任务超时监控
  exceptionMonitor.startTaskMonitor(() => {
    showExceptionNotification('task_timeout')
  })
  
  // 重新计算 token
  chatStore.recalculateTokens()
  scrollToBottom()
  
  try {
    if (gatewayClient?.isConnected()) {
      await gatewayClient.sendMessage(finalText, chatStore.getSessionKey())
    } else {
      await connectGateway()
      if (gatewayClient?.isConnected()) {
        await gatewayClient.sendMessage(finalText, chatStore.getSessionKey())
      } else {
        throw new Error('未连接到 Gateway')
      }
    }
  } catch (error) {
    console.error('[Chat] Send error:', error)
    message.error('发送失败: ' + String(error))
    chatStore.setWaiting(false)
    
    // 移除用户消息
    const index = chatStore.messages.findIndex(m => m.id === userMsg.id)
    if (index > -1) {
      chatStore.messages.splice(index, 1)
      inputText.value = text
    }
  }
}

// 点击上下文显示
function handleContextClick() {
  // 显示上下文管理选项
  dialog.info({
    title: '上下文管理',
    content: `当前使用: ${chatStore.formatContext()} (${contextUsage.value.percentage}%)`,
    positiveText: '压缩上下文',
    negativeText: '新开会话',
    onPositiveClick: () => {
      handleCompact()
    },
    onNegativeClick: () => {
      handleNewSession()
    }
  })
}

// 压缩上下文
async function handleCompact() {
  if (!gatewayClient?.isConnected()) {
    message.warning('未连接到 Gateway')
    return
  }
  
  try {
    await gatewayClient.sendMessage('/compact')
    // 更新本地上下文估算值
    chatStore.compactContext()
    message.success('上下文已压缩')
  } catch (error) {
    console.error('[Chat] Compact error:', error)
    message.error('压缩失败: ' + String(error))
  }
}

// 新开会话
function handleNewSession() {
  // 使用当前角色创建新会话
  const currentRoleId = chatStore.currentRoleId || roleStore.currentRole.id
  chatStore.createSession(currentRoleId)
  message.success('已创建新会话')
}

// 刷新回复
async function handleRefresh(msg: ChatMessage) {
  if (!isConnected.value || isWaiting.value) return
  
  // 找到这条回复对应的用户问题（上一条用户消息）
  const msgIndex = chatStore.messages.findIndex(m => m.id === msg.id)
  if (msgIndex <= 0) {
    message.error('找不到对应的用户问题')
    return
  }
  
  // 向前查找用户消息
  let userMsgIndex = msgIndex - 1
  while (userMsgIndex >= 0 && chatStore.messages[userMsgIndex].role !== 'user') {
    userMsgIndex--
  }
  
  if (userMsgIndex < 0) {
    message.error('找不到对应的用户问题')
    return
  }
  
  const userMsg = chatStore.messages[userMsgIndex]
  const userQuestion = userMsg.content
  
  // 确认提示
  dialog.warning({
    title: '重新生成回复',
    content: '确定要重新生成这条回复吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      // 设置刷新中状态
      chatStore.setMessageRefreshing(msg.id, true)
      
      // 移除旧回复
      chatStore.removeMessage(msg.id)
      
      // 重新发送问题
      chatStore.setWaiting(true)
      
      try {
        if (gatewayClient?.isConnected()) {
          await gatewayClient.sendMessage(userQuestion, chatStore.getSessionKey())
        }
      } catch (error) {
        console.error('[Chat] Refresh error:', error)
        message.error('刷新失败: ' + String(error))
        chatStore.setWaiting(false)
      }
    }
  })
}

// 复制内容
function handleCopy(content: string) {
  navigator.clipboard.writeText(content)
    .then(() => {
      message.success('已复制到剪贴板')
    })
    .catch(() => {
      message.error('复制失败')
    })
}

// 键盘事件
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// 格式化时间
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 格式化内容（简单的 Markdown 支持）
function formatContent(content: unknown): string {
  if (typeof content !== 'string') {
    if (content && typeof content === 'object') {
      return JSON.stringify(content, null, 2)
    }
    return String(content ?? '')
  }
  return content
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}

// 组件卸载时断开连接
onUnmounted(() => {
  gatewayClient?.disconnect()
})
</script>

<style scoped lang="scss">
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: var(--border-secondary);
    border-radius: 3px;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
  
  .empty-avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    overflow: hidden;
    margin-bottom: 16px;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  
  .empty-greeting {
    font-size: 16px;
    color: var(--text-primary);
    margin: 0 0 8px;
  }
  
  .empty-hint {
    font-size: 13px;
    color: var(--text-tertiary);
    margin: 0;
  }
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  
  &.user {
    flex-direction: row-reverse;
    
    .message-content {
      background-color: var(--brand-color, #ff6b35);
      color: white;
      border-radius: 16px 16px 4px 16px;
    }
    
    .message-text {
      color: white;
    }
    
    .message-header {
      flex-direction: row-reverse;
    }
  }
  
  &.assistant {
    .message-content {
      background-color: var(--bg-tertiary);
      border-radius: 16px 16px 16px 4px;
    }
  }
}

.message-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.message-role {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.message-time {
  font-size: 11px;
  color: var(--text-tertiary);
}

.message-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  word-break: break-word;
  
  :deep(code) {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
    font-size: 13px;
  }
  
  :deep(pre) {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 8px 0;
    
    code {
      background: none;
      padding: 0;
    }
  }
}

// 消息操作按钮
.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-secondary);
  
  :deep(.n-button) {
    font-size: 12px;
    
    .n-button__icon {
      margin-right: 4px;
    }
  }
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 0;
  
  span {
    width: 8px;
    height: 8px;
    background-color: var(--text-tertiary);
    border-radius: 50%;
    animation: typing 1.4s infinite ease-in-out both;
    
    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
    &:nth-child(3) { animation-delay: 0s; }
  }
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.input-area {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-secondary);
  background-color: var(--bg-primary);
}

.input-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
  justify-content: flex-end;
}

// 底部状态栏
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 16px;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-secondary);
  font-size: 12px;
}

.status-left, .status-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-ok { color: #10b981; }
.status-warning { color: #f59e0b; }
.status-error { color: #ef4444; }

.context-display {
  &.clickable {
    cursor: pointer;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

.context-normal { color: #10b981; }
.context-caution { color: #f59e0b; }
.context-warning { color: #f97316; font-weight: 500; }
.context-critical { color: #ef4444; font-weight: 600; }

.context-warning-banner {
  padding: 0 16px;
  
  :deep(.n-alert) {
    border-radius: 0;
  }
}

.connection-status {
  padding: 8px 16px;
  border-top: 1px solid var(--border-secondary);
}
</style>
