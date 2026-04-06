<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider, zhCN, dateZhCN, darkTheme, lightTheme } from 'naive-ui'
import MainLayout from './layouts/MainLayout.vue'
import InstallGuide from './components/InstallGuide.vue'
import ExceptionMonitor from './components/ExceptionMonitor.vue'
import { checkOpenClawInstalled } from './utils/api'

// OpenClaw 安装状态
const openclawInstalled = ref<boolean | null>(null) // null = 检测中

// 主题设置
const theme = ref<'dark' | 'light'>(
  (localStorage.getItem('clawdesk-theme') as 'dark' | 'light') || 'dark'
)

// 主题对象
const naiveTheme = computed(() => {
  return theme.value === 'dark' ? darkTheme : lightTheme
})

// 监听主题变化
watch(theme, (newTheme) => {
  localStorage.setItem('clawdesk-theme', newTheme)
  document.documentElement.setAttribute('data-theme', newTheme)
}, { immediate: true })

// 启动时检测 OpenClaw
onMounted(async () => {
  // 调试模式：通过 ?install=1 强制显示安装引导
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('install') === '1') {
    openclawInstalled.value = false
    return
  }
  
  const result = await checkOpenClawInstalled()
  openclawInstalled.value = result.installed
})

// 安装完成回调
function onInstalled() {
  openclawInstalled.value = true
}

// 暴露给全局使用
window.__clawdesk_theme__ = theme
</script>

<template>
  <n-config-provider 
    :locale="zhCN" 
    :date-locale="dateZhCN"
    :theme="naiveTheme"
  >
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <!-- 检测中 -->
        <div v-if="openclawInstalled === null" class="loading-screen">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <p>正在检测 OpenClaw...</p>
          </div>
        </div>
        
        <!-- 未安装 -->
        <InstallGuide v-else-if="openclawInstalled === false" @installed="onInstalled" />
        
          <!-- 已安装 -->
          <template v-else>
            <ExceptionMonitor />
            <MainLayout />
          </template>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s, color 0.3s;
}

.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-content {
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #ff6b35;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
