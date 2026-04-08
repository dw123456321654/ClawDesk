import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  pending?: boolean
  tokens?: number // 消息使用的 token 数
  refreshing?: boolean // 是否正在刷新
}

// 上下文使用情况
export interface ContextUsage {
  used: number      // 已使用 token
  max: number       // 最大 token
  percentage: number // 使用百分比
  lastUpdated: number // 最后更新时间
}

// 会话（支持多会话）
export interface Session {
  id: string
  name: string           // 会话名称（可用户修改）
  roleId: string         // 关联的角色
  messages: ChatMessage[]
  contextUsage: ContextUsage
  createdAt: number
  updatedAt: number
}

const SESSIONS_STORAGE_KEY = 'clawdesk-sessions-v2'
const CURRENT_SESSION_KEY = 'clawdesk-current-session'

export const useChatStore = defineStore('chat', () => {
  // 所有会话列表
  const sessions = ref<Session[]>([])
  
  // 当前会话 ID
  const currentSessionId = ref<string | null>(null)
  
  // 是否正在等待响应
  const isWaiting = ref(false)
  
  // 当前会话
  const currentSession = computed<Session | undefined>(() => {
    if (!currentSessionId.value) return undefined
    return sessions.value.find(s => s.id === currentSessionId.value)
  })
  
  // 当前消息列表
  const messages = computed<ChatMessage[]>({
    get: () => currentSession.value?.messages || [],
    set: (val) => {
      if (currentSession.value) {
        currentSession.value.messages = val
        currentSession.value.updatedAt = Date.now()
        saveToLocalStorage()
      }
    }
  })
  
  // 当前角色 ID
  const currentRoleId = computed(() => currentSession.value?.roleId || '')
  
  // 上下文使用情况
  const contextUsage = computed<ContextUsage>(() => {
    return currentSession.value?.contextUsage || {
      used: 0,
      max: 200000,
      percentage: 0,
      lastUpdated: 0
    }
  })
  
  // 上下文状态枚举
  const contextStatus = computed(() => {
    const pct = contextUsage.value.percentage
    if (pct >= 95) return 'critical'
    if (pct >= 80) return 'warning'
    if (pct >= 60) return 'caution'
    return 'normal'
  })
  
  // 是否需要显示警告
  const shouldWarn = computed(() => contextUsage.value.percentage >= 80)
  
  // 是否需要弹窗警告
  const shouldAlert = computed(() => contextUsage.value.percentage >= 95)
  
  // ========== 会话管理方法 ==========
  
  /**
   * 创建新会话
   */
  function createSession(roleId: string, name?: string): Session {
    const session: Session = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: name || '新会话',
      roleId,
      messages: [],
      contextUsage: {
        used: 0,
        max: 200000,
        percentage: 0,
        lastUpdated: 0
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    sessions.value.unshift(session)
    currentSessionId.value = session.id
    saveToLocalStorage()
    
    return session
  }
  
  /**
   * 删除会话
   */
  function deleteSession(sessionId: string): boolean {
    const index = sessions.value.findIndex(s => s.id === sessionId)
    if (index === -1) return false
    
    sessions.value.splice(index, 1)
    
    // 如果删除的是当前会话，切换到第一个会话
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = sessions.value[0]?.id || null
    }
    
    saveToLocalStorage()
    return true
  }
  
  /**
   * 切换会话
   */
  function switchSession(sessionId: string): boolean {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session) return false
    
    // 检查是否有进行中的任务
    if (isWaiting.value && currentSessionId.value && currentSessionId.value !== sessionId) {
      return false // 需要用户确认
    }
    
    currentSessionId.value = sessionId
    saveToLocalStorage()
    
    // 同步更新 roleStore 的当前角色
    syncCurrentRole()
    
    return true
  }
  
  /**
   * 强制切换会话（忽略进行中的任务）
   */
  function forceSwitchSession(sessionId: string) {
    isWaiting.value = false
    currentSessionId.value = sessionId
    saveToLocalStorage()
    
    // 同步更新 roleStore 的当前角色
    syncCurrentRole()
  }
  
  /**
   * 重命名会话
   */
  function renameSession(sessionId: string, name: string): boolean {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session) return false
    
    session.name = name
    session.updatedAt = Date.now()
    saveToLocalStorage()
    return true
  }
  
  /**
   * 自动命名会话（基于第一条用户消息）
   */
  function autoNameSession(sessionId: string) {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session || session.messages.length === 0) return
    
    const firstUserMsg = session.messages.find(m => m.role === 'user')
    if (firstUserMsg && session.name === '新会话') {
      // 截取前20个字符作为会话名
      session.name = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '')
      saveToLocalStorage()
    }
  }
  
  // ========== 兼容旧 API ==========
  
  /**
   * 切换角色会话（兼容旧接口）
   */
  function switchRoleSession(roleId: string): boolean {
    // 查找该角色的最新会话
    const existingSession = sessions.value.find(s => s.roleId === roleId)
    if (existingSession) {
      return switchSession(existingSession.id)
    }
    
    // 没有则创建新会话
    createSession(roleId)
    return true
  }
  
  /**
   * 强制切换角色会话
   */
  function forceSwitchRoleSession(roleId: string) {
    const existingSession = sessions.value.find(s => s.roleId === roleId)
    if (existingSession) {
      forceSwitchSession(existingSession.id)
    } else {
      createSession(roleId)
    }
  }
  
  // ========== 消息方法 ==========
  
  /**
   * 添加消息
   */
  function addMessage(msg: ChatMessage) {
    if (!currentSession.value) return
    currentSession.value.messages.push(msg)
    currentSession.value.updatedAt = Date.now()
    
    // 自动命名
    if (msg.role === 'user' && currentSession.value.messages.filter(m => m.role === 'user').length === 1) {
      autoNameSession(currentSession.value.id)
    }
    
    saveToLocalStorage()
  }
  
  /**
   * 更新最后一条消息（流式消息用）
   */
  function updateLastMessage(content: string, pending: boolean = false) {
    if (!currentSession.value) return
    const msgs = currentSession.value.messages
    if (msgs.length > 0) {
      const lastMsg = msgs[msgs.length - 1]
      if (lastMsg.role === 'assistant') {
        lastMsg.content = content
        lastMsg.pending = pending
        saveToLocalStorage()
      }
    }
  }
  
  /**
   * 设置等待状态
   */
  function setWaiting(waiting: boolean) {
    isWaiting.value = waiting
  }
  
  /**
   * 清空当前会话的消息
   */
  function clearMessages() {
    if (!currentSession.value) return
    currentSession.value.messages = []
    currentSession.value.contextUsage = {
      used: 0,
      max: 200000,
      percentage: 0,
      lastUpdated: 0
    }
    currentSession.value.name = '新会话'
    saveToLocalStorage()
  }
  
  /**
   * 更新上下文使用情况
   */
  function updateContextUsage(used: number, max?: number) {
    if (!currentSession.value) return
    const maxTokens = max || currentSession.value.contextUsage.max
    currentSession.value.contextUsage = {
      used,
      max: maxTokens,
      percentage: maxTokens > 0 ? Math.round((used / maxTokens) * 100) : 0,
      lastUpdated: Date.now()
    }
    saveToLocalStorage()
  }
  
  /**
   * 压缩上下文（本地估算值调整）
   * 注意：这只是本地估算值的调整，实际的压缩由 Gateway 完成
   */
  function compactContext() {
    if (!currentSession.value) return
    
    // 估算压缩后的 token 数（假设压缩到原来的 30%）
    const currentUsed = currentSession.value.contextUsage.used
    const compactedUsed = Math.round(currentUsed * 0.3)
    
    updateContextUsage(compactedUsed)
  }
  
  /**
   * 估算消息的 token 数（改进版：考虑中文和工具调用）
   */
  function estimateTokens(content: string): number {
    // 中文约 1.5 字符/token，英文约 4 字符/token
    // 使用 3 作为折中
    const baseTokens = Math.ceil(content.length / 3)
    // 为工具调用和工具结果增加估算（通常包含更多结构化数据）
    const toolOverhead = (content.match(/```/g) || []).length * 50
    return baseTokens + toolOverhead
  }
  
  /**
   * 重新计算所有消息的 token 总数
   */
  function recalculateTokens() {
    if (!currentSession.value) return
    let total = 0
    
    // 系统提示词基础开销（MEMORY.md + SOUL.md + USER.md 等）
    total += 10000
    
    for (const msg of currentSession.value.messages) {
      if (msg.tokens) {
        total += msg.tokens
      } else {
        total += estimateTokens(msg.content)
      }
      // 每条消息有额外的结构开销
      total += 20
    }
    
    updateContextUsage(total)
  }
  
  /**
   * 格式化上下文显示
   */
  function formatContext(): string {
    const { used, max } = contextUsage.value
    const usedK = Math.round(used / 1000)
    const maxK = Math.round(max / 1000)
    return `${usedK}K/${maxK}K tokens`
  }
  
  /**
   * 设置消息的刷新状态
   */
  function setMessageRefreshing(msgId: string, refreshing: boolean) {
    if (!currentSession.value) return
    const msg = currentSession.value.messages.find(m => m.id === msgId)
    if (msg) {
      msg.refreshing = refreshing
      saveToLocalStorage()
    }
  }
  
  /**
   * 移除消息
   */
  function removeMessage(msgId: string) {
    if (!currentSession.value) return
    const index = currentSession.value.messages.findIndex(m => m.id === msgId)
    if (index > -1) {
      currentSession.value.messages.splice(index, 1)
      currentSession.value.updatedAt = Date.now()
      saveToLocalStorage()
    }
  }
  
  /**
   * 获取当前会话的 sessionKey（用于 chat.send）
   * Gateway 期望 'main' 作为主会话
   */
  function getSessionKey(): string {
    return 'main'
  }
  
  /**
   * 获取当前会话的完整 sessionKey（用于 sessions.usage 等 API）
   * Gateway 期望 'agent:main:main' 格式
   */
  function getFullSessionKey(): string {
    return 'agent:main:main'
  }
  
  // ========== 持久化 ==========
  
  /**
   * 保存到 localStorage
   */
  function saveToLocalStorage() {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.value))
      if (currentSessionId.value) {
        localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId.value)
      }
    } catch (e) {
      console.error('[ChatStore] Save error:', e)
    }
  }
  
  /**
   * 从 localStorage 加载
   */
  function loadFromLocalStorage() {
    try {
      // 加载当前会话 ID
      const savedCurrentId = localStorage.getItem(CURRENT_SESSION_KEY)
      if (savedCurrentId) {
        currentSessionId.value = savedCurrentId
      }
      
      // 加载所有会话
      const saved = localStorage.getItem(SESSIONS_STORAGE_KEY)
      if (saved) {
        sessions.value = JSON.parse(saved)
      }
      
      // 如果没有会话，创建一个默认会话
      if (sessions.value.length === 0) {
        createSession('main-agent', '新会话')
      }
      
      // 重新计算 token
      if (currentSessionId.value) {
        recalculateTokens()
      }
    } catch (e) {
      console.error('[ChatStore] Load error:', e)
      // 出错时创建默认会话
      if (sessions.value.length === 0) {
        createSession('main-agent', '新会话')
      }
    }
  }
  
  /**
   * 同步当前角色到 roleStore
   */
  function syncCurrentRole() {
    if (!currentSession.value) return
    
    // 动态导入避免循环依赖
    import('./role').then(({ useRoleStore }) => {
      const roleStore = useRoleStore()
      const roleId = currentSession.value?.roleId
      
      if (roleId && roleStore.currentRole.id !== roleId) {
        const role = roleStore.availableRoles.find(r => r.id === roleId)
        if (role) {
          roleStore.currentRole = role
          // 保存到 localStorage
          localStorage.setItem('clawdesk-current-role-id', role.id)
        }
      }
    })
  }
  
  // 初始化时加载
  loadFromLocalStorage()
  
  // 初始化后同步角色
  syncCurrentRole()
  
  return {
    // 状态
    sessions,
    currentSessionId,
    currentSession,
    currentRoleId,
    messages,
    contextUsage,
    contextStatus,
    shouldWarn,
    shouldAlert,
    isWaiting,
    
    // 会话管理
    createSession,
    deleteSession,
    switchSession,
    forceSwitchSession,
    renameSession,
    autoNameSession,
    
    // 兼容旧 API
    switchRoleSession,
    forceSwitchRoleSession,
    
    // 消息操作
    addMessage,
    updateLastMessage,
    setWaiting,
    clearMessages,
    updateContextUsage,
    compactContext,
    recalculateTokens,
    estimateTokens,
    formatContext,
    getSessionKey,
    getFullSessionKey,
    setMessageRefreshing,
    removeMessage
  }
})
