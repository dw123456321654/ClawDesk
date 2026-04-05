<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NSpace, NAvatar, NPopover, useMessage } from 'naive-ui'
import { useServiceStore } from '@/stores/service'
import { useRoleStore } from '@/stores/role'
import RoleSelector from '@/components/RoleSelector.vue'

const router = useRouter()
const message = useMessage()
const serviceStore = useServiceStore()
const roleStore = useRoleStore()

const showRoleSelector = ref(false)

const goToSettings = () => {
  router.push('/settings')
}

const getStatusText = () => {
  switch (serviceStore.status) {
    case 'running': return '运行中'
    case 'starting': return '启动中'
    case 'stopped': return '已停止'
    default: return '未知'
  }
}

const handleRoleSwitched = (role: typeof roleStore.currentRole) => {
  message.success(`已切换到「${role.nickname}」`)
}

const getRoleColor = (roleId: string): string => {
  const colors: Record<string, string> = {
    'main-agent': '#FF6B9D',
    'product-manager': '#4CAF50',
    'project-manager': '#2196F3',
    'architect': '#9C27B0',
    'developer': '#FF9800',
    'tester': '#F44336',
    'ui-designer': '#E91E63'
  }
  return colors[roleId] || '#607D8B'
}
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <div class="logo-wrapper">
        <span class="logo-icon">🦞</span>
        <span class="logo-text">ClawDesk</span>
      </div>
    </div>
    
    <div class="header-center">
      <n-popover 
        trigger="click" 
        placement="bottom"
        v-model:show="showRoleSelector"
        :show-arrow="false"
        style="padding: 0;"
      >
        <template #trigger>
          <div class="role-trigger">
            <div class="role-avatar-wrapper">
              <n-avatar 
                :size="32" 
                round
                :src="roleStore.currentRole.avatar"
              />
              <div class="status-dot"></div>
            </div>
            <div class="role-info">
              <span class="role-name">{{ roleStore.currentRole.nickname }}</span>
              <span class="role-label">当前角色</span>
            </div>
            <span class="role-arrow">▼</span>
          </div>
        </template>
        <RoleSelector 
          @close="showRoleSelector = false"
          @switched="handleRoleSwitched"
        />
      </n-popover>
    </div>
    
    <div class="header-right">
      <n-space align="center" :size="12">
        <div class="status-badge" :class="serviceStore.status">
          <span class="status-indicator"></span>
          <span class="status-text">{{ getStatusText() }}</span>
          <span class="status-port" v-if="serviceStore.status === 'running'">
            :{{ serviceStore.port }}
          </span>
        </div>
        <n-button quaternary circle size="small" class="settings-btn" @click="goToSettings">
          ⚙️
        </n-button>
      </n-space>
    </div>
  </header>
</template>

<style scoped lang="scss">
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 20px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-primary);
  backdrop-filter: blur(20px);
}

.header-left {
  .logo-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
    
    .logo-icon {
      font-size: 24px;
    }
    
    .logo-text {
      font-size: 18px;
      font-weight: 700;
      background: var(--brand-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.5px;
    }
  }
}

.header-center {
  .role-trigger {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 14px 6px 6px;
    border-radius: var(--radius-xl);
    cursor: pointer;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    transition: all var(--transition-normal);
    
    &:hover {
      background: var(--bg-elevated);
      border-color: var(--border-accent);
      box-shadow: var(--shadow-glow);
    }
    
    .role-avatar-wrapper {
      position: relative;
      
      .status-dot {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 10px;
        height: 10px;
        background: var(--success);
        border-radius: 50%;
        border: 2px solid var(--bg-tertiary);
      }
    }
    
    .role-info {
      display: flex;
      flex-direction: column;
      
      .role-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        line-height: 1.2;
      }
      
      .role-label {
        font-size: 10px;
        color: var(--text-secondary);
        line-height: 1.2;
      }
    }
    
    .role-arrow {
      font-size: 8px;
      color: var(--text-tertiary);
      margin-left: 4px;
    }
  }
}

.header-right {
  .status-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: var(--radius-lg);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-tertiary);
    }
    
    &.running {
      .status-indicator {
        background: var(--success);
        animation: pulse 2s infinite;
      }
    }
    
    &.starting {
      .status-indicator {
        background: var(--warning);
        animation: pulse 1s infinite;
      }
    }
    
    &.stopped {
      .status-indicator {
        background: var(--error);
      }
    }
    
    .status-text {
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .status-port {
      font-size: 11px;
      color: var(--text-tertiary);
      font-family: 'SF Mono', Monaco, monospace;
      padding-left: 6px;
      border-left: 1px solid var(--border-primary);
    }
  }
  
  .settings-btn {
    font-size: 16px;
    opacity: 0.7;
    transition: opacity var(--transition-fast);
    
    &:hover {
      opacity: 1;
    }
  }
}
</style>
