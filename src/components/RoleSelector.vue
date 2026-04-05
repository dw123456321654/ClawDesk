<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NTag, NAvatar, NText, NIcon, useDialog } from 'naive-ui'
import { CheckmarkCircleOutline } from '@vicons/ionicons5'
import { useRoleStore } from '@/stores/role'
import type { Role } from '@/types/role'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'switched', role: Role): void
}>()

const dialog = useDialog()
const roleStore = useRoleStore()
const justSwitched = ref<string | null>(null)

// 角色颜色映射
const roleColors: Record<string, string> = {
  'main-agent': '#FF6B9D',
  'product-manager': '#4CAF50',
  'project-manager': '#2196F3',
  'architect': '#9C27B0',
  'developer': '#FF9800',
  'tester': '#F44336',
  'ui-designer': '#E91E63'
}

const getRoleColor = (roleId: string): string => {
  return roleColors[roleId] || '#607D8B'
}

const handleSwitch = async (role: Role) => {
  if (role.id === roleStore.currentRole.id) {
    emit('close')
    return
  }
  
  // 检查是否有进行中的任务
  const success = roleStore.switchRole(role.id)
  
  if (!success) {
    // 需要用户确认
    showConfirmDialog(role)
    return
  }
  
  // 切换成功
  justSwitched.value = role.id
  emit('switched', role)
  
  setTimeout(() => {
    emit('close')
  }, 800)
}

// 显示确认对话框
const showConfirmDialog = (targetRole: Role) => {
  dialog.warning({
    title: '切换角色',
    content: `${roleStore.pendingRoleName}正在工作中，尚未完成。切换角色将中断当前任务。`,
    positiveText: '确定切换',
    negativeText: '继续等待',
    onPositiveClick: () => {
      // 强制切换
      roleStore.forceSwitchRole(targetRole.id)
      justSwitched.value = targetRole.id
      emit('switched', targetRole)
      
      setTimeout(() => {
        emit('close')
      }, 800)
    }
  })
}
</script>

<template>
  <div class="role-selector">
    <div class="selector-header">
      <h3 class="selector-title">选择角色</h3>
      <n-button quaternary size="tiny" class="close-btn" @click="emit('close')">
        ✕
      </n-button>
    </div>
    
    <div class="role-list">
      <div
        v-for="role in roleStore.availableRoles"
        :key="role.id"
        class="role-item"
        :class="{ 
          active: role.id === roleStore.currentRole.id,
          'just-switched': justSwitched === role.id
        }"
        @click="handleSwitch(role)"
      >
        <div class="role-avatar" :style="{ '--role-color': getRoleColor(role.id) }">
          <n-avatar 
            :size="44" 
            round
            :src="role.avatar"
            :style="{ backgroundColor: getRoleColor(role.id) }"
          />
          <div class="active-indicator" v-if="role.id === roleStore.currentRole.id">
            <n-icon :size="14" color="#fff">
              <CheckmarkCircleOutline />
            </n-icon>
          </div>
        </div>
        
        <div class="role-info">
          <div class="role-header">
            <n-text strong class="role-nickname">{{ role.nickname }}</n-text>
            <n-text depth="3" class="role-name">{{ role.name }}</n-text>
          </div>
          <n-text depth="2" class="role-desc">
            {{ role.description }}
          </n-text>
          <div class="role-tags">
            <n-tag 
              v-for="tag in role.tags.slice(0, 2)" 
              :key="tag" 
              size="tiny"
              :bordered="false"
              class="role-tag"
            >
              {{ tag }}
            </n-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>



<style scoped lang="scss">
.role-selector {
  width: 340px;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-primary);
  overflow: hidden;
}

.selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--border-primary);
  
  .selector-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .close-btn {
    width: 24px;
    height: 24px;
    padding: 0;
    font-size: 12px;
    color: var(--text-tertiary);
    
    &:hover {
      color: var(--text-primary);
    }
  }
}

.role-list {
  padding: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.role-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
  position: relative;
  
  &:hover {
    background: var(--bg-tertiary);
    
    .role-avatar {
      transform: scale(1.05);
    }
  }
  
  &.active {
    background: linear-gradient(135deg, rgba(255, 107, 53, 0.08), rgba(156, 39, 176, 0.08));
    border-color: var(--border-accent);
    
    .role-nickname {
      color: var(--brand-primary);
    }
  }
  
  &.just-switched {
    animation: switchPulse 0.5s ease;
  }
}

@keyframes switchPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); background: var(--bg-elevated); }
  100% { transform: scale(1); }
}

.role-avatar {
  position: relative;
  transition: transform var(--transition-fast);
  
  .avatar-emoji {
    font-size: 20px;
  }
  
  .active-indicator {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 20px;
    height: 20px;
    background: var(--success);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--bg-primary);
  }
}

.role-info {
  flex: 1;
  min-width: 0;
}

.role-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
  
  .role-nickname {
    font-size: 14px;
    line-height: 1.2;
  }
  
  .role-name {
    font-size: 11px;
    line-height: 1.2;
  }
}

.role-desc {
  font-size: 12px;
  line-height: 1.4;
  display: block;
  margin-bottom: 8px;
}

.role-tags {
  display: flex;
  gap: 4px;
  
  .role-tag {
    background: var(--bg-elevated);
    color: var(--text-secondary);
    font-size: 10px;
  }
}
</style>
