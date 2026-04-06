import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Role } from '@/types/role'
import { PRESET_ROLES, DEFAULT_ROLE } from '@/types/role'
import { useChatStore } from './chat'

export const useRoleStore = defineStore('role', () => {
  // 当前角色
  const currentRole = ref<Role>(loadSavedRole())
  
  // 可用角色列表
  const availableRoles = ref<Role[]>([...PRESET_ROLES])
  
  // 是否有进行中的任务（需要确认才能切换）
  const hasPendingTask = computed(() => {
    const chatStore = useChatStore()
    return chatStore.isWaiting
  })
  
  // 当前进行中的角色名
  const pendingRoleName = computed(() => {
    if (!hasPendingTask.value) return null
    const chatStore = useChatStore()
    const roleId = chatStore.currentRoleId
    const role = availableRoles.value.find(r => r.id === roleId)
    return role?.nickname || role?.name || 'AI'
  })
  
  // 计算属性：当前角色索引
  const currentIndex = computed(() => 
    availableRoles.value.findIndex(r => r.id === currentRole.value.id)
  )
  
  // 切换角色（返回 true=成功，false=需要确认）
  const switchRole = (roleId: string): boolean => {
    // 同一个角色，不做处理
    if (roleId === currentRole.value.id) {
      return true
    }
    
    const chatStore = useChatStore()
    
    // 尝试切换会话
    const success = chatStore.switchRoleSession(roleId)
    
    if (!success) {
      // 有进行中的任务，返回 false 让调用方处理确认
      return false
    }
    
    // 切换成功，更新角色
    const role = availableRoles.value.find(r => r.id === roleId)
    if (role) {
      currentRole.value = role
      saveRole(role)
    }
    
    return true
  }
  
  // 强制切换角色（忽略进行中的任务）
  const forceSwitchRole = (roleId: string) => {
    const chatStore = useChatStore()
    chatStore.forceSwitchRoleSession(roleId)
    
    const role = availableRoles.value.find(r => r.id === roleId)
    if (role) {
      currentRole.value = role
      saveRole(role)
    }
  }
  
  // 初始化会话
  const initSession = () => {
    const chatStore = useChatStore()
    chatStore.switchRoleSession(currentRole.value.id)
  }
  
  // 保存角色到本地存储
  const saveRole = (role: Role) => {
    try {
      localStorage.setItem('clawdesk-current-role-id', role.id)
    } catch (e) {
      console.error('保存角色失败:', e)
    }
  }
  
  // 更新角色个性化配置
  const updateRoleConfig = (roleId: string, config: Partial<Role>) => {
    const role = availableRoles.value.find(r => r.id === roleId)
    if (!role) return false
    
    // 保存原始值（如果还没保存过）
    if (!role.originalNickname) {
      role.originalNickname = role.nickname
      role.originalAvatar = role.avatar
      role.originalGreeting = role.greeting
    }
    
    // 更新配置
    if (config.nickname !== undefined) role.nickname = config.nickname
    if (config.avatar !== undefined) role.avatar = config.avatar
    if (config.greeting !== undefined) role.greeting = config.greeting
    role.isCustom = true
    
    // 保存到 localStorage
    saveCustomRoles()
    
    // 如果是当前角色，更新 currentRole
    if (currentRole.value.id === roleId) {
      currentRole.value = { ...role }
    }
    
    return true
  }
  
  // 重置角色为默认配置
  const resetRoleConfig = (roleId: string) => {
    const role = availableRoles.value.find(r => r.id === roleId)
    if (!role || !role.isCustom) return false
    
    // 恢复原始值
    if (role.originalNickname) role.nickname = role.originalNickname
    if (role.originalAvatar) role.avatar = role.originalAvatar
    if (role.originalGreeting) role.greeting = role.originalGreeting
    role.isCustom = false
    delete role.originalNickname
    delete role.originalAvatar
    delete role.originalGreeting
    
    saveCustomRoles()
    
    if (currentRole.value.id === roleId) {
      currentRole.value = { ...role }
    }
    
    return true
  }
  
  // 保存自定义角色到 localStorage
  const saveCustomRoles = () => {
    try {
      const customConfigs: Record<string, Partial<Role>> = {}
      availableRoles.value.forEach(role => {
        if (role.isCustom) {
          customConfigs[role.id] = {
            nickname: role.nickname,
            avatar: role.avatar,
            greeting: role.greeting,
            isCustom: true,
            originalNickname: role.originalNickname,
            originalAvatar: role.originalAvatar,
            originalGreeting: role.originalGreeting
          }
        }
      })
      localStorage.setItem('clawdesk-custom-roles', JSON.stringify(customConfigs))
    } catch (e) {
      console.error('保存自定义角色失败:', e)
    }
  }
  
  // 从 localStorage 加载自定义角色
  const loadCustomRoles = () => {
    try {
      const saved = localStorage.getItem('clawdesk-custom-roles')
      if (!saved) return
      
      const customConfigs = JSON.parse(saved) as Record<string, Partial<Role>>
      Object.keys(customConfigs).forEach(roleId => {
        const role = availableRoles.value.find(r => r.id === roleId)
        if (role) {
          const config = customConfigs[roleId]
          if (config.nickname) role.nickname = config.nickname
          if (config.avatar) role.avatar = config.avatar
          if (config.greeting) role.greeting = config.greeting
          role.isCustom = config.isCustom
          role.originalNickname = config.originalNickname
          role.originalAvatar = config.originalAvatar
          role.originalGreeting = config.originalGreeting
        }
      })
    } catch (e) {
      console.error('加载自定义角色失败:', e)
    }
  }
  
  // 初始化时加载自定义角色
  loadCustomRoles()
  
  return {
    currentRole,
    availableRoles,
    currentIndex,
    hasPendingTask,
    pendingRoleName,
    switchRole,
    forceSwitchRole,
    initSession,
    updateRoleConfig,
    resetRoleConfig
  }
})

/**
 * 从本地存储加载保存的角色
 */
function loadSavedRole(): Role {
  try {
    const savedId = localStorage.getItem('clawdesk-current-role-id')
    if (savedId) {
      const found = PRESET_ROLES.find(r => r.id === savedId)
      if (found) {
        return found
      }
    }
  } catch (e) {
    console.error('加载角色失败:', e)
  }
  return DEFAULT_ROLE
}
