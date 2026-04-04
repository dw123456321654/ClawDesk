import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  pending?: boolean
}

export const useChatStore = defineStore('chat', () => {
  // 当前会话的消息列表
  const messages = ref<ChatMessage[]>([])
  
  // 当前会话 key
  const sessionKey = ref<string>('main')
  
  // 添加消息
  function addMessage(msg: ChatMessage) {
    messages.value.push(msg)
    saveToLocalStorage()
  }
  
  // 清空消息
  function clearMessages() {
    messages.value = []
    saveToLocalStorage()
  }
  
  // 保存到 localStorage
  function saveToLocalStorage() {
    try {
      localStorage.setItem('clawdesk-chat-messages', JSON.stringify(messages.value))
    } catch (e) {
      console.error('[ChatStore] Save error:', e)
    }
  }
  
  // 从 localStorage 加载
  function loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('clawdesk-chat-messages')
      if (saved) {
        messages.value = JSON.parse(saved)
      }
    } catch (e) {
      console.error('[ChatStore] Load error:', e)
    }
  }
  
  // 初始化时加载
  loadFromLocalStorage()
  
  return {
    messages,
    sessionKey,
    addMessage,
    clearMessages
  }
})
