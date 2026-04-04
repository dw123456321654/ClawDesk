<script setup lang="ts">
import { ref } from 'vue'
import { NMenu, NButton, NIcon } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import { useRouter } from 'vue-router'
import {
  ChatbubblesOutline,
  PersonCircleOutline,
  SettingsOutline,
  HardwareChipOutline,
  RocketOutline,
  TimerOutline,
  HelpCircleOutline,
  AddOutline
} from '@vicons/ionicons5'
import { h } from 'vue'

const router = useRouter()
const collapsed = ref(false)

const menuOptions: MenuOption[] = [
  {
    label: '会话列表',
    key: 'sessions',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(ChatbubblesOutline) })
  },
  {
    label: '角色管理',
    key: 'roles',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(PersonCircleOutline) })
  },
  {
    label: '节点管理',
    key: 'nodes',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(HardwareChipOutline) })
  },
  {
    label: '技能管理',
    key: 'skills',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(RocketOutline) })
  },
  {
    label: '自动化',
    key: 'automation',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(TimerOutline) })
  },
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
  } else {
    router.push('/')
  }
}
</script>

<template>
  <aside class="app-sidebar" :class="{ collapsed }">
    <div class="sidebar-content">
      <n-menu
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="activeKey"
        :render-label="collapsed ? undefined : (opt: any) => opt.label"
        @update:value="handleMenuSelect"
      />
    </div>
    
    <div class="sidebar-footer">
      <n-button 
        v-if="!collapsed"
        block 
        class="new-session-btn"
        @click="router.push('/')"
      >
        <template #icon>
          <n-icon><AddOutline /></n-icon>
        </template>
        新建会话
      </n-button>
      <n-button 
        v-else
        circle
        secondary
        class="new-session-btn-collapsed"
        @click="router.push('/')"
      >
        <template #icon>
          <n-icon><AddOutline /></n-icon>
        </template>
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
  width: 220px;
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
  padding: 8px;
  overflow-y: auto;
  
  :deep(.n-menu) {
    background: transparent;
    
    .n-menu-item {
      margin-bottom: 4px;
      
      .n-menu-item-content {
        padding: 10px 12px;
        border-radius: var(--radius-md);
        transition: all var(--transition-fast);
        
        &:hover {
          background: var(--bg-tertiary);
        }
      }
      
      &.n-menu-item--selected {
        .n-menu-item-content {
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.15), rgba(156, 39, 176, 0.15));
          border: 1px solid var(--border-accent);
          
          .n-menu-item-content-header {
            color: var(--brand-primary);
            font-weight: 600;
          }
          
          .n-menu-item-content__icon {
            color: var(--brand-primary);
          }
        }
      }
    }
    
    .n-menu-divider {
      margin: 12px 8px;
      background: var(--border-primary);
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
  
  .new-session-btn-collapsed {
    width: 40px;
    height: 40px;
    background: var(--brand-gradient);
    color: white;
    border: none;
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
