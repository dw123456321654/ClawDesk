<script setup lang="ts">
import { ref, watch } from 'vue'
import { NCard, NForm, NFormItem, NInput, NSelect, NSwitch, NButton, NSpace, useMessage } from 'naive-ui'

const message = useMessage()

// 设置表单
const formValue = ref({
  general: {
    language: localStorage.getItem('clawdesk-language') || 'zh-CN',
    theme: (localStorage.getItem('clawdesk-theme') || 'dark') as 'dark' | 'light',
    fontSize: localStorage.getItem('clawdesk-fontSize') || '14',
    autoStart: localStorage.getItem('clawdesk-autoStart') === 'true',
    minimizeToTray: localStorage.getItem('clawdesk-minimizeToTray') !== 'false'
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

const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
]

const themeOptions = [
  { label: '深色主题', value: 'dark' },
  { label: '浅色主题', value: 'light' }
]

// 监听主题变化立即生效
watch(() => formValue.value.general.theme, (newTheme) => {
  localStorage.setItem('clawdesk-theme', newTheme)
  document.documentElement.setAttribute('data-theme', newTheme)
  if (window.__clawdesk_theme__) {
    window.__clawdesk_theme__.value = newTheme
  }
})

// 保存设置
const handleSave = () => {
  // 保存到 localStorage
  localStorage.setItem('clawdesk-language', formValue.value.general.language)
  localStorage.setItem('clawdesk-theme', formValue.value.general.theme)
  localStorage.setItem('clawdesk-fontSize', formValue.value.general.fontSize)
  localStorage.setItem('clawdesk-autoStart', String(formValue.value.general.autoStart))
  localStorage.setItem('clawdesk-minimizeToTray', String(formValue.value.general.minimizeToTray))
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
</style>
