<script setup lang="ts">
import { ref, h } from 'vue'
import { NMenu, NButton, NIcon, NDropdown, NEmpty, NAvatar } from 'naive-ui'
import type { MenuOption, DropdownOption } from 'naive-ui'
import { useRouter } from 'vue-router'
import {
  SettingsOutline,
  HelpCircleOutline,
  AddOutline,
  TrashOutline,
  CreateOutline
} from '@vicons/ionicons5'
import { useChatStore } from '@/stores/chat'
import { useRoleStore } from '@/stores/role'
import { useUIStore } from '@/stores/ui'
import { useDialog, useMessage } from 'naive-ui'
import QuickActions from '@/components/QuickActions.vue'

const router = useRouter()
const dialog = useDialog()
const message = useMessage()
const chatStore = useChatStore()
const roleStore = useRoleStore()
const uiStore = useUIStore()
const collapsed = ref(false)

// 会话列表右键菜单
const getSessionDropdownOptions = (): DropdownOption[] => [
  {
    label: '重命名',
    key: 'rename',
    icon: () => h(NIcon, null, { default: () => h(CreateOutline) })
  },
  {
    label: '删除',
    key: 'delete',
    icon: () => h(NIcon, null, { default: () => h(TrashOutline) })
  }
]

// 处理会话右键菜单
const handleSessionDropdown = (key: string, sessionId: string) => {
  if (key === 'delete') {
    dialog.warning({
      title: '删除会话',
      content: '确定要删除这个会话吗？',
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: () => {
        chatStore.deleteSession(sessionId)
        message.success('会话已删除')
      }
    })
  } else if (key === 'rename') {
    const session = chatStore.sessions.find(s => s.id === sessionId)
    if (session) {
      const newName = prompt('请输入新名称', session.name)
      if (newName && newName.trim()) {
        chatStore.renameSession(sessionId, newName.trim())
        message.success('会话已重命名')
      }
    }
  }
}

// 获取会话关联的角色信息
const getRoleInfo = (roleId: string) => {
  return roleStore.availableRoles.find(r => r.id === roleId)
}

// 格式化时间
const formatTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 新建会话
const handleNewSession = () => {
  const currentRoleId = chatStore.currentRoleId || roleStore.currentRole.id
  chatStore.createSession(currentRoleId)
  message.success('已创建新会话')
  router.push('/')
}

// 底部菜单选项
const menuOptions: MenuOption[] = [
  {
    type: 'divider',
    key: 'd1'
  },
  {
    label: '帮助',
    key: 'help',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(HelpCircleOutline) })
  },
  {
    label: '设置',
    key: 'settings',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(SettingsOutline) })
  }
]

const activeKey = ref('sessions')

const handleMenuSelect = (key: string) => {
  activeKey.value = key
  if (key === 'settings') {
    router.push('/settings')
  } else if (key === 'help') {
    // 切换右侧面板到帮助标签
    uiStore.setActivePanel('help')
    router.push('/')
  } else {
    router.push('/')
  }
}
</script>

<template>
  <aside class="app-sidebar" :class="{ collapsed }">
    <div class="sidebar-content">
      <!-- 会话列表 -->
      <div v-if="!collapsed" class="session-list">
        <div class="session-list-header">
          <span class="header-title">会话列表</span>
          <n-button quaternary size="tiny" class="new-btn" @click="handleNewSession">
            <template #icon>
              <n-icon size="16"><AddOutline /></n-icon>
            </template>
          </n-button>
        </div>
        
        <div class="session-items">
          <template v-if="chatStore.sessions.length > 0">
            <n-dropdown
              v-for="session in chatStore.sessions"
              :key="session.id"
              trigger="click"
              :options="getSessionDropdownOptions()"
              @select="(key: string) => handleSessionDropdown(key, session.id)"
            >
              <div
                class="session-item"
                :class="{ active: session.id === chatStore.currentSessionId }"
                @click="chatStore.switchSession(session.id)"
              >
                <div class="session-avatar">
                  <n-avatar
                    :size="32"
                    round
                    :src="getRoleInfo(session.roleId)?.avatar"
                  />
                </div>
                <div class="session-info">
                  <div class="session-name">{{ session.name }}</div>
                  <div class="session-meta">
                    <span class="session-role">{{ getRoleInfo(session.roleId)?.nickname }}</span>
                    <span class="session-time">{{ formatTime(session.updatedAt) }}</span>
                  </div>
                </div>
              </div>
            </n-dropdown>
          </template>
          <n-empty v-else description="暂无会话" size="small" />
        </div>
      </div>
      
      <!-- 折叠状态下的会话按钮 -->
      <div v-else class="session-collapsed">
        <n-button
          circle
          secondary
          class="session-btn"
          @click="handleNewSession"
        >
          <template #icon>
            <n-icon><AddOutline /></n-icon>
          </template>
        </n-button>
      </div>
      
      <!-- 快捷操作 -->
      <QuickActions v-if="!collapsed" />
      
      <!-- 底部菜单 -->
      <div class="bottom-menu">
        <n-menu
          :collapsed="collapsed"
          :collapsed-width="64"
          :collapsed-icon-size="22"
          :options="menuOptions"
          :value="activeKey"
          @update:value="handleMenuSelect"
        />
      </div>
    </div>
    
    <div class="sidebar-footer">
      <n-button 
        v-if="!collapsed"
        block 
        class="new-session-btn"
        @click="handleNewSession"
      >
        <template #icon>
          <n-icon><AddOutline /></n-icon>
        </template>
        新建会话
      </n-button>
      
      <button class="collapse-btn" @click="collapsed = !collapsed">
        <span v-if="collapsed">»</span>
        <span v-else>«</span>
      </button>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.app-sidebar {
  width: 240px;
  height: 100%;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
  
  &.collapsed {
    width: 72px;
    
    .sidebar-footer {
      padding: 12px 8px;
    }
  }
}

.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.session-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  .session-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 12px 8px;
    
    .header-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .new-btn {
      color: var(--text-tertiary);
      
      &:hover {
        color: var(--brand-primary);
      }
    }
  }
  
  .session-items {
    flex: 1;
    overflow-y: auto;
    padding: 0 8px;
    
    &::-webkit-scrollbar {
      width: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: var(--border-secondary);
      border-radius: 2px;
    }
  }
}

.session-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
  
  &:hover {
    background: var(--bg-tertiary);
  }
  
  &.active {
    background: linear-gradient(135deg, rgba(255, 107, 53, 0.12), rgba(156, 39, 176, 0.12));
    border-color: var(--border-accent);
    
    .session-name {
      color: var(--brand-primary);
      font-weight: 600;
    }
  }
  
  .session-info {
    flex: 1;
    min-width: 0;
  }
  
  .session-name {
    font-size: 13px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .session-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
    
    .session-role {
      font-size: 11px;
      color: var(--text-tertiary);
    }
    
    .session-time {
      font-size: 11px;
      color: var(--text-tertiary);
      margin-left: auto;
    }
  }
}

.session-collapsed {
  padding: 12px 8px;
  display: flex;
  justify-content: center;
  
  .session-btn {
    background: var(--brand-gradient);
    color: white;
    border: none;
  }
}

.bottom-menu {
  border-top: 1px solid var(--border-primary);
  
  :deep(.n-menu) {
    background: transparent;
    
    .n-menu-item {
      margin: 4px;
      
      .n-menu-item-content {
        padding: 10px 12px;
        border-radius: var(--radius-md);
        
        &:hover {
          background: var(--bg-tertiary);
        }
      }
    }
  }
}

.sidebar-footer {
  padding: 12px 12px;
  border-top: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  .new-session-btn {
    background: var(--brand-gradient);
    border: none;
    color: white;
    font-weight: 600;
    height: 40px;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-glow);
    }
  }
  
  .collapse-btn {
    width: 100%;
    height: 32px;
    background: transparent;
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: 12px;
    
    &:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }
  }
}
</style>
