<template>
  <div class="install-guide">
    <div class="guide-card">
      <div class="guide-icon">
        <n-icon size="80" color="#ff6b35">
          <DownloadOutline />
        </n-icon>
      </div>
      
      <h1 class="guide-title">需要安装 OpenClaw</h1>
      
      <p class="guide-desc">
        ClawDesk 是 OpenClaw 的桌面伴侣应用，需要先安装 OpenClaw 才能使用。
      </p>
      
      <div class="install-steps">
        <h3>安装步骤</h3>
        <ol>
          <li>打开终端（PowerShell 或 CMD）</li>
          <li>运行以下命令：</li>
        </ol>
        
        <div class="code-block">
          <code>npm install -g openclaw</code>
          <n-button text @click="copyCommand" class="copy-btn">
            <template #icon>
              <n-icon><CopyOutline /></n-icon>
            </template>
          </n-button>
        </div>
        
        <p class="tip">💡 安装完成后，点击下方按钮重新检测</p>
      </div>
      
      <div class="guide-actions">
        <n-button type="primary" size="large" @click="checkAgain" :loading="checking">
          <template #icon>
            <n-icon><RefreshOutline /></n-icon>
          </template>
          重新检测
        </n-button>
        
        <n-button text @click="openDocs">
          <template #icon>
            <n-icon><BookOutline /></n-icon>
          </template>
          查看文档
        </n-button>
      </div>
      
      <n-collapse class="faq">
        <n-collapse-item title="常见问题" name="faq">
          <div class="faq-content">
            <h4>Q: 安装后仍提示未安装？</h4>
            <p>请确保已重启终端，或重新打开 ClawDesk。</p>
            
            <h4>Q: 没有 npm 怎么办？</h4>
            <p>请先安装 <a href="https://nodejs.org/" target="_blank">Node.js</a>。</p>
            
            <h4>Q: 其他安装方式？</h4>
            <p>访问 <a href="https://github.com/openclaw/openclaw" target="_blank">GitHub</a> 查看更多安装方式。</p>
          </div>
        </n-collapse-item>
      </n-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NIcon, NCollapse, NCollapseItem, useMessage } from 'naive-ui'
import { 
  DownloadOutline, 
  CopyOutline, 
  RefreshOutline, 
  BookOutline 
} from '@vicons/ionicons5'
import { checkOpenClawInstalled } from '@/utils/api'

const emit = defineEmits<{
  (e: 'installed'): void
}>()

const message = useMessage()
const checking = ref(false)

function copyCommand() {
  navigator.clipboard.writeText('npm install -g openclaw')
  message.success('已复制到剪贴板')
}

async function checkAgain() {
  checking.value = true
  
  try {
    const result = await checkOpenClawInstalled()
    
    if (result.installed) {
      message.success(`检测到 OpenClaw ${result.version || ''}`)
      emit('installed')
    } else {
      message.warning('未检测到 OpenClaw，请先安装')
    }
  } catch (error) {
    message.error('检测失败: ' + String(error))
  } finally {
    checking.value = false
  }
}

function openDocs() {
  window.open('https://docs.openclaw.ai', '_blank')
}
</script>

<style scoped lang="scss">
.install-guide {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.guide-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 48px;
  max-width: 520px;
  text-align: center;
}

.guide-icon {
  margin-bottom: 24px;
}

.guide-title {
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 16px;
}

.guide-desc {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 32px;
  line-height: 1.6;
}

.install-steps {
  text-align: left;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  
  h3 {
    font-size: 16px;
    color: #fff;
    margin: 0 0 16px;
  }
  
  ol {
    margin: 0;
    padding-left: 20px;
    color: rgba(255, 255, 255, 0.8);
    line-height: 2;
  }
  
  .tip {
    margin: 16px 0 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
  }
}

.code-block {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 107, 53, 0.3);
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 12px;
  
  code {
    font-family: 'Fira Code', monospace;
    font-size: 14px;
    color: #ff6b35;
  }
  
  .copy-btn {
    color: rgba(255, 255, 255, 0.6);
    
    &:hover {
      color: #ff6b35;
    }
  }
}

.guide-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.faq {
  margin-top: 24px;
  text-align: left;
  
  :deep(.n-collapse-item__header) {
    color: rgba(255, 255, 255, 0.7);
  }
  
  :deep(.n-collapse-item__content-inner) {
    padding-top: 0;
  }
}

.faq-content {
  h4 {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    margin: 16px 0 8px;
    
    &:first-child {
      margin-top: 0;
    }
  }
  
  p {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
    line-height: 1.6;
  }
  
  a {
    color: #ff6b35;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
