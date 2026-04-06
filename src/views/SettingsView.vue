<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { NCard, NForm, NFormItem, NInput, NSelect, NSwitch, NButton, NSpace, NAvatar, NGrid, NGi, useMessage, useDialog } from 'naive-ui'
import { isEnabled, enable, disable } from '@tauri-apps/plugin-autostart'
import { useRoleStore } from '@/stores/role'
import { PRESET_AVATARS } from '@/types/role'
import type { Role } from '@/types/role'

const message = useMessage()
const dialog = useDialog()
const roleStore = useRoleStore()

// 设置表单
const formValue = ref({
  general: {
    language: localStorage.getItem('clawdesk-language') || 'zh-CN',
    theme: (localStorage.getItem('clawdesk-theme') || 'dark') as 'dark' | 'light',
    fontSize: localStorage.getItem('clawdesk-fontSize') || '14',
    autoStart: false,
    minimizeToTray: localStorage.getItem('clawdesk-minimizeToTray') !== 'false',
    autoStartGateway: localStorage.getItem('clawdesk-autoStartGateway') === 'true'
  },
  gateway: {
    defaultPort: localStorage.getItem('clawdesk-port') || '18789',
    autoConnect: localStorage.getItem('clawdesk-autoConnect') === 'true'
  },
  task: {
    autoSaveCheckpoint: true,
    checkpointInterval: '5'
  }
})

// 角色配置
const selectedRoleId = ref(roleStore.currentRole.id)
const selectedRole = computed(() => {
  return roleStore.availableRoles.find(r => r.id === selectedRoleId.value)
})

const roleConfig = ref({
  nickname: '',
  avatar: '',
  greeting: ''
})

// 监听选中角色变化
watch(selectedRoleId, (roleId) => {
  const role = roleStore.availableRoles.find(r => r.id === roleId)
  if (role) {
    roleConfig.value = {
      nickname: role.nickname,
      avatar: role.avatar,
      greeting: role.greeting || ''
    }
  }
}, { immediate: true })

// 角色选项
const roleOptions = computed(() => {
  return roleStore.availableRoles.map(role => ({
    label: `${role.nickname} (${role.name})`,
    value: role.id
  }))
})

const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
]

const themeOptions = [
  { label: '深色主题', value: 'dark' },
  { label: '浅色主题', value: 'light' }
]

// 初始化时检查自启状态
onMounted(async () => {
  try {
    const enabled = await isEnabled()
    formValue.value.general.autoStart = enabled
  } catch (e) {
    console.error('检查自启状态失败:', e)
  }
})

// 监听主题变化立即生效
watch(() => formValue.value.general.theme, (newTheme) => {
  localStorage.setItem('clawdesk-theme', newTheme)
  document.documentElement.setAttribute('data-theme', newTheme)
  if (window.__clawdesk_theme__) {
    window.__clawdesk_theme__.value = newTheme
  }
})

// 切换开机自启
watch(() => formValue.value.general.autoStart, async (enabled) => {
  try {
    if (enabled) {
      await enable()
      message.success('已开启开机自启')
    } else {
      await disable()
      message.success('已关闭开机自启')
    }
    localStorage.setItem('clawdesk-autoStart', String(enabled))
  } catch (e) {
    console.error('设置自启失败:', e)
    message.error('设置失败: ' + String(e))
    formValue.value.general.autoStart = !enabled
  }
})

// 保存角色配置
const handleSaveRoleConfig = () => {
  if (!selectedRoleId.value) return
  
  roleStore.updateRoleConfig(selectedRoleId.value, {
    nickname: roleConfig.value.nickname,
    avatar: roleConfig.value.avatar,
    greeting: roleConfig.value.greeting
  })
  
  message.success('角色配置已保存')
}

// 重置角色配置
const handleResetRoleConfig = () => {
  dialog.warning({
    title: '重置角色配置',
    content: '确定要重置该角色的配置吗？将恢复为默认设置。',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      if (!selectedRoleId.value) return
      
      roleStore.resetRoleConfig(selectedRoleId.value)
      
      // 更新表单
      const role = roleStore.availableRoles.find(r => r.id === selectedRoleId.value)
      if (role) {
        roleConfig.value = {
          nickname: role.nickname,
          avatar: role.avatar,
          greeting: role.greeting || ''
        }
      }
      
      message.success('已重置为默认配置')
    }
  })
}

// 保存设置
const handleSave = () => {
  // 保存到 localStorage
  localStorage.setItem('clawdesk-language', formValue.value.general.language)
  localStorage.setItem('clawdesk-theme', formValue.value.general.theme)
  localStorage.setItem('clawdesk-fontSize', formValue.value.general.fontSize)
  localStorage.setItem('clawdesk-minimizeToTray', String(formValue.value.general.minimizeToTray))
  localStorage.setItem('clawdesk-autoStartGateway', String(formValue.value.general.autoStartGateway))
  localStorage.setItem('clawdesk-port', formValue.value.gateway.defaultPort)
  localStorage.setItem('clawdesk-autoConnect', String(formValue.value.gateway.autoConnect))
  
  message.success('设置已保存')
}

// 取消
const handleCancel = () => {
  window.history.back()
}
</script>

<template>
  <div class="settings-view">
    <h2 class="settings-title">⚙️ 设置</h2>
    
    <!-- 角色配置 -->
    <n-card title="角色配置" size="small" class="settings-card">
      <n-form label-placement="left" label-width="80">
        <n-form-item label="选择角色">
          <n-select
            v-model:value="selectedRoleId"
            :options="roleOptions"
            style="width: 220px;"
          />
        </n-form-item>
        
        <n-form-item label="花名">
          <n-input
            v-model:value="roleConfig.nickname"
            placeholder="输入自定义花名"
            style="width: 200px;"
          />
          <span v-if="selectedRole?.isCustom" class="custom-badge">已自定义</span>
        </n-form-item>
        
        <n-form-item label="头像">
          <div class="avatar-selector">
            <div class="current-avatar">
              <n-avatar :size="48" :src="roleConfig.avatar" />
            </div>
            <div class="avatar-list">
              <div 
                v-for="avatar in PRESET_AVATARS" 
                :key="avatar"
                class="avatar-option"
                :class="{ active: roleConfig.avatar === avatar }"
                @click="roleConfig.avatar = avatar"
              >
                <n-avatar :size="32" :src="avatar" />
              </div>
            </div>
          </div>
        </n-form-item>
        
        <n-form-item label="问候语">
          <n-input
            v-model:value="roleConfig.greeting"
            type="textarea"
            placeholder="输入专属问候语"
            :autosize="{ minRows: 2, maxRows: 4 }"
            style="width: 100%;"
          />
        </n-form-item>
        
        <n-form-item label="">
          <n-space>
            <n-button type="primary" @click="handleSaveRoleConfig">保存配置</n-button>
            <n-button 
              @click="handleResetRoleConfig" 
              :disabled="!selectedRole?.isCustom"
            >
              重置为默认
            </n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-card>
    
    <!-- 通用设置 -->
    <n-card title="通用设置" size="small" class="settings-card">
      <n-form label-placement="left" label-width="100">
        <n-form-item label="语言">
          <n-select
            v-model:value="formValue.general.language"
            :options="languageOptions"
            style="width: 180px;"
          />
        </n-form-item>
        
        <n-form-item label="主题">
          <n-select
            v-model:value="formValue.general.theme"
            :options="themeOptions"
            style="width: 180px;"
          />
        </n-form-item>
        
        <n-form-item label="字体大小">
          <n-input
            v-model:value="formValue.general.fontSize"
            style="width: 80px;"
          />
          <span class="form-hint">px</span>
        </n-form-item>
        
        <n-form-item label="开机自启">
          <n-switch v-model:value="formValue.general.autoStart" />
        </n-form-item>
        
        <n-form-item label="自启时启动Gateway">
          <n-switch 
            v-model:value="formValue.general.autoStartGateway" 
            :disabled="!formValue.general.autoStart"
          />
        </n-form-item>
        
        <n-form-item label="最小化到托盘">
          <n-switch v-model:value="formValue.general.minimizeToTray" />
        </n-form-item>
      </n-form>
    </n-card>
    
    <!-- Gateway 设置 -->
    <n-card title="Gateway 设置" size="small" class="settings-card">
      <n-form label-placement="left" label-width="100">
        <n-form-item label="默认端口">
          <n-input
            v-model:value="formValue.gateway.defaultPort"
            style="width: 100px;"
          />
        </n-form-item>
        
        <n-form-item label="自动连接">
          <n-switch v-model:value="formValue.gateway.autoConnect" />
        </n-form-item>
      </n-form>
    </n-card>
    
    <!-- 任务设置 -->
    <n-card title="任务设置" size="small" class="settings-card">
      <n-form label-placement="left" label-width="100">
        <n-form-item label="自动保存检查点">
          <n-switch v-model:value="formValue.task.autoSaveCheckpoint" />
        </n-form-item>
        
        <n-form-item label="保存间隔">
          <n-input
            v-model:value="formValue.task.checkpointInterval"
            style="width: 80px;"
          />
          <span class="form-hint">分钟</span>
        </n-form-item>
      </n-form>
    </n-card>
    
    <!-- 保存按钮 -->
    <n-space justify="end" style="margin-top: 16px;">
      <n-button @click="handleCancel">取消</n-button>
      <n-button type="primary" @click="handleSave">保存设置</n-button>
    </n-space>
  </div>
</template>

<style scoped lang="scss">
.settings-view {
  padding: 24px;
  max-width: 600px;
}

.settings-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.settings-card {
  margin-bottom: 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  
  :deep(.n-card-header) {
    padding: 12px 16px;
    font-weight: 600;
  }
  
  :deep(.n-card__content) {
    padding: 16px;
  }
}

.form-hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.custom-badge {
  margin-left: 8px;
  padding: 2px 8px;
  background: rgba(255, 107, 53, 0.2);
  border-radius: 4px;
  font-size: 11px;
  color: #ff6b35;
}

.avatar-selector {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  
  .current-avatar {
    padding: 8px;
    background: var(--bg-secondary);
    border-radius: 8px;
  }
  
  .avatar-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .avatar-option {
    padding: 4px;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      border-color: var(--border-secondary);
    }
    
    &.active {
      border-color: #ff6b35;
      background: rgba(255, 107, 53, 0.1);
    }
  }
}
</style>
