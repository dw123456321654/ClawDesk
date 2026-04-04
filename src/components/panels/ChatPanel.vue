<template>
  <div class="chat-panel">
    <!-- 消息列表 -->
    <div class="message-list" ref="messageListRef">
      <div v-if="messages.length === 0" class="empty-state">
        <p>👋 开始和 AI 助手对话吧！</p>
      </div>
      
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message-item"
        :class="msg.role"
      >
        <div class="message-avatar">
          <span v-if="msg.role === 'user'">👤</span>
          <span v-else-if="msg.role === 'assistant'">🤖</span>
          <span v-else>⚙️</span>
        </div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-role">
              {{ msg.role === 'user' ? '你' : msg.role === 'assistant' ? 'AI' : '系统' }}
            </span>
            <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
          </div>
          <div class="message-text" v-html="formatContent(msg.content)"></div>
        </div>
      </div>
      
      <!-- 加载中 -->
      <div v-if="isWaiting" class="message-item assistant">
        <div class="message-avatar">🤖</div>
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
    
    <!-- 连接状态 -->
    <div class="connection-status" v-if="!isConnected">
      <n-alert type="warning" size="small">
        未连接到 Gateway，请先启动服务
      </n-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick, watch } from 'vue'
import { NInput, NButton, NIcon, NAlert, useMessage } from 'naive-ui'
import { SendOutline } from '@vicons/ionicons5'
import { GatewayClient, ChatMessage, getGatewayClient } from '@/utils/gateway'
import { useServiceStore } from '@/stores/service'
import { readOpenClawConfig } from '@/utils/api'

const message = useMessage()
const serviceStore = useServiceStore()

// 消息列表
const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const isWaiting = ref(false)
const messageListRef = ref<HTMLElement | null>(null)

// Gateway 客户端
let gatewayClient: GatewayClient | null = null

// 客户端连接状态
const clientConnected = ref(false)

// 连接状态（服务运行中 + 客户端已连接）
const isConnected = computed(() => serviceStore.status === 'running' && clientConnected.value)

// 监听服务状态，自动连接
watch(() => serviceStore.status, async (status) => {
  if (status === 'running' && !gatewayClient?.isConnected()) {
    await connectGateway()
  } else if (status !== 'running') {
    clientConnected.value = false
  }
}, { immediate: true })

// 连接 Gateway
async function connectGateway() {
  // 读取 OpenClaw 配置获取 token
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
  }
  
  gatewayClient.onMessage = (msg) => {
    // 处理 content 格式：可能是字符串或数组
    let content: string
    if (typeof msg.content === 'string') {
      content = msg.content
    } else if (Array.isArray(msg.content)) {
      // content 是数组格式: [{ type: 'text', text: '...' }]
      content = msg.content
        .filter((item: { type?: string; text?: string }) => item.type === 'text')
        .map((item: { type?: string; text?: string }) => item.text || '')
        .join('')
    } else if (msg.content && typeof msg.content === 'object') {
      content = JSON.stringify(msg.content, null, 2)
    } else {
      content = String(msg.content ?? '')
    }
    
    // 处理流式消息追加
    if (msg.pending) {
      // 流式消息，追加到最后一条 assistant 消息
      const lastMsg = messages.value[messages.value.length - 1]
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.pending) {
        lastMsg.content += content
        scrollToBottom()
        return
      }
      // 新的流式消息
      messages.value.push({ ...msg, content })
      scrollToBottom()
      return
    }
    
    // 完整消息
    const lastMsg = messages.value[messages.value.length - 1]
    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.pending) {
      // 完成流式消息
      lastMsg.content = content
      lastMsg.pending = false
    } else {
      // 添加新消息
      messages.value.push({ ...msg, content })
    }
    isWaiting.value = false
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
  
  // 添加用户消息
  const userMsg: ChatMessage = {
    id: `user_${Date.now()}`,
    role: 'user',
    content: text,
    timestamp: Date.now()
  }
  messages.value.push(userMsg)
  inputText.value = ''
  isWaiting.value = true
  scrollToBottom()
  
  try {
    if (gatewayClient?.isConnected()) {
      await gatewayClient.sendMessage(text)
    } else {
      // 尝试重连
      await connectGateway()
      if (gatewayClient?.isConnected()) {
        await gatewayClient.sendMessage(text)
      } else {
        throw new Error('未连接到 Gateway')
      }
    }
  } catch (error) {
    console.error('[Chat] Send error:', error)
    message.error('发送失败: ' + String(error))
    isWaiting.value = false
    
    // 移除用户消息
    const index = messages.value.findIndex(m => m.id === userMsg.id)
    if (index > -1) {
      messages.value.splice(index, 1)
      inputText.value = text // 恢复输入
    }
  }
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
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 格式化内容（简单的 Markdown 支持）
function formatContent(content: unknown): string {
  if (typeof content !== 'string') {
    // 如果 content 是对象，尝试 JSON 序列化
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
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
  font-size: 14px;
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
  padding: 16px;
  border-top: 1px solid var(--border-secondary);
  background-color: var(--bg-primary);
}

.connection-status {
  padding: 8px 16px;
  border-top: 1px solid var(--border-secondary);
}
</style>
