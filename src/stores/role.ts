import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Role } from '@/types/role'
import { PRESET_ROLES, DEFAULT_ROLE } from '@/types/role'

export const useRoleStore = defineStore('role', () => {
  // 当前角色
  const currentRole = ref<Role>(loadSavedRole())
  
  // 可用角色列表
  const availableRoles = ref<Role[]>([...PRESET_ROLES])
  
  // 计算属性：当前角色索引
  const currentIndex = computed(() => 
    availableRoles.value.findIndex(r => r.id === currentRole.value.id)
  )
  
  // 切换角色
  const switchRole = (roleId: string) => {
    const role = availableRoles.value.find(r => r.id === roleId)
    if (role) {
      currentRole.value = role
      saveRole(role)
      return true
    }
    return false
  }
  
  // 保存角色到本地存储
  const saveRole = (role: Role) => {
    try {
      localStorage.setItem('clawdesk-current-role', JSON.stringify(role))
    } catch (e) {
      console.error('保存角色失败:', e)
    }
  }
  
  return {
    currentRole,
    availableRoles,
    currentIndex,
    switchRole
  }
})

/**
 * 从本地存储加载保存的角色
 */
function loadSavedRole(): Role {
  try {
    const saved = localStorage.getItem('clawdesk-current-role')
    if (saved) {
      const role = JSON.parse(saved) as Role
      // 验证是否是有效的预设角色
      const found = PRESET_ROLES.find(r => r.id === role.id)
      if (found) {
        return found
      }
    }
  } catch (e) {
    console.error('加载角色失败:', e)
  }
  return DEFAULT_ROLE
}
