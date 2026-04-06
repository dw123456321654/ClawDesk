<template>
  <div class="install-guide">
    <div class="guide-container">
      <!-- 进度指示器 -->
      <div class="progress-bar">
        <div 
          v-for="(step, index) in steps" 
          :key="index"
          class="progress-step"
          :class="{ active: currentStep === index, completed: currentStep > index }"
        >
          <div class="step-number">{{ index + 1 }}</div>
          <div class="step-label">{{ step.title }}</div>
        </div>
      </div>

      <!-- 步骤内容 -->
      <div class="guide-content">
        <!-- 步骤 0: 欢迎 -->
        <div v-if="currentStep === 0" class="step-panel">
          <div class="welcome-icon">
            <n-icon size="64" color="#ff6b35"><RocketOutline /></n-icon>
          </div>
          <h1>欢迎使用 ClawDesk</h1>
          <p class="subtitle">ClawDesk 是 OpenClaw 的桌面伴侣应用</p>
          
          <div class="requirements">
            <h3>安装前准备</h3>
            <div class="requirement-list">
              <div class="requirement-item" :class="requirements.nodejs ? 'ok' : 'missing'">
                <n-icon size="20">
                  <CheckmarkCircleOutline v-if="requirements.nodejs" />
                  <CloseCircleOutline v-else />
                </n-icon>
                <span>Node.js 22+ {{ requirements.nodejs ? `(已安装 v${nodeVersion})` : '(未安装)' }}</span>
              </div>
              <div class="requirement-item" :class="requirements.openclaw ? 'ok' : 'missing'">
                <n-icon size="20">
                  <CheckmarkCircleOutline v-if="requirements.openclaw" />
                  <CloseCircleOutline v-else />
                </n-icon>
                <span>OpenClaw {{ requirements.openclaw ? `(已安装)` : '(未安装)' }}</span>
              </div>
              <div class="requirement-item" :class="requirements.apiKey ? 'ok' : 'warn'">
                <n-icon size="20">
                  <CheckmarkCircleOutline v-if="requirements.apiKey" />
                  <AlertCircleOutline v-else />
                </n-icon>
                <span>API Key {{ requirements.apiKey ? '(已配置)' : '(稍后配置)' }}</span>
              </div>
            </div>
          </div>

          <div class="action-buttons">
            <n-button type="primary" size="large" @click="nextStep">
              开始安装
              <template #icon><n-icon><ArrowForwardOutline /></n-icon></template>
            </n-button>
          </div>
        </div>

        <!-- 步骤 1: 安装 Node.js -->
        <div v-if="currentStep === 1" class="step-panel">
          <h2>安装 Node.js</h2>
          <p class="subtitle">OpenClaw 需要 Node.js 22 或更高版本</p>
          
          <div class="nodejs-status" :class="requirements.nodejs ? 'installed' : 'not-installed'">
            <n-icon size="24">
              <CheckmarkCircleOutline v-if="requirements.nodejs" />
              <CloseCircleOutline v-else />
            </n-icon>
            <span v-if="requirements.nodejs">已安装 Node.js v{{ nodeVersion }}</span>
            <span v-else>未安装 Node.js</span>
          </div>

          <div v-if="!requirements.nodejs" class="install-guide-content">
            <h3>方式一：官网下载（推荐用迅雷加速）</h3>
            <ol class="detail-steps">
              <li>
                <strong>打开 Node.js 中文网下载页：</strong>
                <n-button size="small" type="primary" text @click="openNodejsDownload">
                  https://nodejs.cn/download/
                </n-button>
              </li>
              <li>
                <strong>选择版本：</strong>下载 <code>LTS</code> 版本（长期支持版），选择 <code>.msi</code> 安装包（64位）
              </li>
              <li>
                <div class="tip-box success">
                  <strong>💡 网速慢？用迅雷下载！</strong>
                  <p>官网直接下载可能很慢（几 KB/s），<strong>复制下载链接到迅雷</strong>可以满速下载（几 MB/s）</p>
                </div>
              </li>
              <li><strong>双击运行安装包</strong>，按提示安装</li>
            </ol>

            <div class="install-options">
              <h4>安装时选项说明：</h4>
              <div class="option-list">
                <div class="option-item must">
                  <n-icon size="16" color="#52c41a"><CheckmarkCircleOutline /></n-icon>
                  <span><strong>Node.js runtime</strong> - 必须勾选</span>
                </div>
                <div class="option-item must">
                  <n-icon size="16" color="#52c41a"><CheckmarkCircleOutline /></n-icon>
                  <span><strong>npm package manager</strong> - 必须勾选</span>
                </div>
                <div class="option-item skip">
                  <n-icon size="16" color="#ff4d4f"><CloseCircleOutline /></n-icon>
                  <span><strong>Automatically install necessary tools</strong> - ❌ 不要勾选（会下载几 GB，很慢）</span>
                </div>
              </div>
            </div>

            <h3 style="margin-top: 24px;">方式二：使用 winget 安装（Windows 10/11）</h3>
            <div class="code-block">
              <code>winget install OpenJS.NodeJS.LTS</code>
              <n-button text @click="copyCommand('winget install OpenJS.NodeJS.LTS')">
                <template #icon><n-icon><CopyOutline /></n-icon></template>
              </n-button>
            </div>
          </div>

          <div v-else class="already-installed">
            <n-icon size="48" color="#52c41a"><CheckmarkCircleOutline /></n-icon>
            <p>Node.js 已安装，可以继续下一步</p>
          </div>

          <div class="action-buttons">
            <n-button @click="prevStep">上一步</n-button>
            <n-button type="primary" @click="checkNodeAndNext" :loading="checking">
              {{ requirements.nodejs ? '下一步' : '检测安装' }}
            </n-button>
          </div>
        </div>

        <!-- 步骤 2: 安装 OpenClaw -->
        <div v-if="currentStep === 2" class="step-panel">
          <h2>安装 OpenClaw</h2>
          
          <!-- 如何打开终端 -->
          <div class="terminal-guide">
            <h3>第一步：打开终端（PowerShell）</h3>
            <div class="terminal-methods">
              <div class="terminal-method">
                <h4>方式一：快捷键（推荐）</h4>
                <div class="shortcut-guide">
                  <p>1. 按 <kbd>Win</kbd> + <kbd>X</kbd></p>
                  <p>2. 选择 <kbd class="menu-item">终端 (管理员)</kbd> 或 <kbd class="menu-item">Windows PowerShell (管理员)</kbd></p>
                </div>
              </div>
              <div class="terminal-method">
                <h4>方式二：搜索打开</h4>
                <ol>
                  <li>按 <kbd>Win</kbd> 键打开开始菜单</li>
                  <li>输入 <code>powershell</code></li>
                  <li>右键点击「Windows PowerShell」</li>
                  <li>选择「以管理员身份运行」</li>
                </ol>
              </div>
            </div>
          </div>

          <div class="install-method-tabs">
            <div class="method-tab" :class="{ active: installMethod === 'manual' }" @click="installMethod = 'manual'">
              <n-icon size="24"><CodeSlashOutline /></n-icon>
              <span>手动安装（国内加速）</span>
            </div>
            <div class="method-tab" :class="{ active: installMethod === 'auto' }" @click="installMethod = 'auto'">
              <n-icon size="24"><FlashOutline /></n-icon>
              <span>自动安装</span>
            </div>
          </div>

          <!-- 手动安装 -->
          <div v-if="installMethod === 'manual'" class="method-content">
            <div class="china-tip">
              <n-icon size="16" color="#faad14"><AlertCircleOutline /></n-icon>
              <span>国内用户推荐使用此方式，配置镜像后下载速度快很多</span>
            </div>
            
            <div class="code-group">
              <div class="code-label">步骤 1: 配置 npm 淘宝镜像（加速下载）</div>
              <div class="code-block">
                <code>npm config set registry https://registry.npmmirror.com</code>
                <n-button text @click="copyCommand('npm config set registry https://registry.npmmirror.com')">
                  <template #icon><n-icon><CopyOutline /></n-icon></template>
                </n-button>
              </div>
              <p class="code-hint">💡 复制后，在 PowerShell 中点击<strong>右键</strong>即可粘贴</p>
            </div>

            <div class="code-group">
              <div class="code-label">步骤 2: 安装 OpenClaw</div>
              <div class="code-block">
                <code>npm install -g openclaw@latest</code>
                <n-button text @click="copyCommand('npm install -g openclaw@latest')">
                  <template #icon><n-icon><CopyOutline /></n-icon></template>
                </n-button>
              </div>
              <p class="code-hint">等待安装完成，可能需要几分钟</p>
            </div>

            <div class="code-group">
              <div class="code-label">步骤 3: 运行配置向导</div>
              <div class="code-block">
                <code>openclaw onboard --install-daemon</code>
                <n-button text @click="copyCommand('openclaw onboard --install-daemon')">
                  <template #icon><n-icon><CopyOutline /></n-icon></template>
                </n-button>
              </div>
              <p class="code-hint">按提示配置 API Key 等信息</p>
            </div>

            <div class="paste-tip">
              <h4>💡 如何在 PowerShell 中粘贴命令？</h4>
              <ul>
                <li>点击鼠标<strong>右键</strong>即可粘贴</li>
                <li>或者按 <kbd>Ctrl</kbd> + <kbd>V</kbd></li>
              </ul>
            </div>
          </div>

          <!-- 自动安装 -->
          <div v-if="installMethod === 'auto'" class="method-content">
            <p class="method-desc">在 PowerShell 中粘贴并运行以下命令：</p>
            <div class="code-block">
              <code>iwr -useb https://openclaw.ai/install.ps1 | iex</code>
              <n-button text @click="copyCommand('iwr -useb https://openclaw.ai/install.ps1 | iex')">
                <template #icon><n-icon><CopyOutline /></n-icon></template>
              </n-button>
            </div>
            <div class="info-box">
              <n-icon size="16" color="#1890ff"><InformationCircleOutline /></n-icon>
              <span>这个命令会自动安装 OpenClaw 并启动配置向导</span>
            </div>
          </div>

          <div class="action-buttons">
            <n-button @click="prevStep">上一步</n-button>
            <n-button type="primary" @click="checkAndNext" :loading="checking">
              检测安装
              <template #icon><n-icon><RefreshOutline /></n-icon></template>
            </n-button>
          </div>
        </div>

        <!-- 步骤 3: 配置向导说明 -->
        <div v-if="currentStep === 3" class="step-panel">
          <h2>配置向导说明</h2>
          <p class="subtitle">安装完成后，终端会启动配置向导，按以下步骤操作：</p>
          
          <div class="wizard-steps">
            <div class="wizard-step">
              <div class="wizard-step-num">1</div>
              <div class="wizard-step-content">
                <h4>选择模型提供商</h4>
                <p>选择你要使用的 AI 模型（如 OpenAI、Anthropic、Google）</p>
              </div>
            </div>
            <div class="wizard-step">
              <div class="wizard-step-num">2</div>
              <div class="wizard-step-content">
                <h4>输入 API Key</h4>
                <p>粘贴你的 API Key（从模型提供商官网获取）</p>
                <div class="api-links">
                  <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI</a>
                  <a href="https://console.anthropic.com/" target="_blank">Anthropic</a>
                  <a href="https://aistudio.google.com/apikey" target="_blank">Google</a>
                </div>
              </div>
            </div>
            <div class="wizard-step">
              <div class="wizard-step-num">3</div>
              <div class="wizard-step-content">
                <h4>配置工作空间</h4>
                <p>默认路径即可，按回车继续</p>
              </div>
            </div>
            <div class="wizard-step">
              <div class="wizard-step-num">4</div>
              <div class="wizard-step-content">
                <h4>Gateway 配置</h4>
                <p>默认端口 18789，按回车继续</p>
              </div>
            </div>
            <div class="wizard-step">
              <div class="wizard-step-num">5</div>
              <div class="wizard-step-content">
                <h4>可选：配置渠道</h4>
                <p>可配置 Telegram、WhatsApp 等，也可以稍后在 ClawDesk 中配置</p>
              </div>
            </div>
          </div>

          <div class="action-buttons">
            <n-button @click="prevStep">上一步</n-button>
            <n-button type="primary" size="large" @click="checkAgain" :loading="checking">
              我已完成配置
              <template #icon><n-icon><CheckmarkOutline /></n-icon></template>
            </n-button>
          </div>
        </div>

        <!-- 步骤 4: 完成 -->
        <div v-if="currentStep === 4" class="step-panel success-panel">
          <div class="success-icon">
            <n-icon size="64" color="#52c41a"><CheckmarkCircleOutline /></n-icon>
          </div>
          <h1>安装完成！</h1>
          <p class="subtitle">OpenClaw 已就绪</p>
          
          <div class="next-steps">
            <h4>接下来你可以：</h4>
            <ul>
              <li>在「服务管理」中启动 Gateway</li>
              <li>在「渠道配置」中连接 Telegram / WhatsApp</li>
              <li>在「聊天」中与 AI 对话</li>
            </ul>
          </div>

          <div class="action-buttons">
            <n-button type="primary" size="large" @click="emit('installed')">
              开始使用
              <template #icon><n-icon><ArrowForwardOutline /></n-icon></template>
            </n-button>
          </div>
        </div>
      </div>

      <!-- 常见问题 -->
      <n-collapse v-if="currentStep < 4" class="faq-panel">
        <n-collapse-item title="常见问题" name="faq">
          <div class="faq-content">
            <n-collapse>
              <n-collapse-item title="Q: Node.js 官网下载太慢怎么办？" name="q1">
                <p>推荐使用迅雷下载：</p>
                <ol>
                  <li>打开 Node.js 中文网：<a href="https://nodejs.cn/download/" target="_blank">https://nodejs.cn/download/</a></li>
                  <li>右键复制下载链接</li>
                  <li>打开迅雷，新建任务，粘贴链接</li>
                </ol>
              </n-collapse-item>
              
              <n-collapse-item title="Q: npm install 很慢怎么办？" name="q2">
                <p>配置国内镜像：</p>
                <div class="inline-code">npm config set registry https://registry.npmmirror.com</div>
              </n-collapse-item>
              
              <n-collapse-item title="Q: 如何打开 PowerShell？" name="q3">
                <p>按 <kbd>Win</kbd> + <kbd>X</kbd>，然后选择「终端 (管理员)」</p>
              </n-collapse-item>
              
              <n-collapse-item title="Q: 如何在 PowerShell 中粘贴？" name="q4">
                <p>直接点击鼠标<strong>右键</strong>即可粘贴</p>
              </n-collapse-item>

              <n-collapse-item title="Q: 如何获取 API Key？" name="q5">
                <ul>
                  <li><strong>OpenAI</strong>: <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com/api-keys</a></li>
                  <li><strong>Anthropic</strong>: <a href="https://console.anthropic.com/" target="_blank">console.anthropic.com</a></li>
                  <li><strong>Google</strong>: <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a></li>
                </ul>
              </n-collapse-item>
            </n-collapse>
          </div>
        </n-collapse-item>
      </n-collapse>

      <!-- 帮助链接 -->
      <div class="help-links">
        <n-button text @click="openDocs"><template #icon><n-icon><BookOutline /></n-icon></template>文档</n-button>
        <n-button text @click="openGithub"><template #icon><n-icon><LogoGithub /></n-icon></template>GitHub</n-button>
        <n-button text @click="openDiscord"><template #icon><n-icon><ChatbubbleEllipsesOutline /></n-icon></template>社区</n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NIcon, NCollapse, NCollapseItem, useMessage } from 'naive-ui'
import { 
  RocketOutline, CheckmarkCircleOutline, CloseCircleOutline, AlertCircleOutline,
  ArrowForwardOutline, FlashOutline, CodeSlashOutline, CopyOutline, RefreshOutline,
  InformationCircleOutline, CheckmarkOutline, BookOutline, LogoGithub, ChatbubbleEllipsesOutline
} from '@vicons/ionicons5'
import { checkOpenClawInstalled } from '@/utils/api'

const emit = defineEmits<{ (e: 'installed'): void }>()
const message = useMessage()

const steps = [
  { title: '检查环境' },
  { title: '安装 Node.js' },
  { title: '安装 OpenClaw' },
  { title: '配置向导' },
  { title: '完成' }
]

const currentStep = ref(0)
const installMethod = ref<'auto' | 'manual'>('manual')
const checking = ref(false)

const requirements = ref({ nodejs: false, openclaw: false, apiKey: false })
const nodeVersion = ref('')
const openclawVersion = ref('')

function copyCommand(cmd: string) {
  navigator.clipboard.writeText(cmd)
  message.success('已复制到剪贴板')
}

function nextStep() { if (currentStep.value < steps.length - 1) currentStep.value++ }
function prevStep() { if (currentStep.value > 0) currentStep.value-- }

async function checkNodeAndNext() {
  checking.value = true
  requirements.value.nodejs = true
  nodeVersion.value = '22'
  checking.value = false
  currentStep.value = 2
}

async function checkAndNext() {
  checking.value = true
  try {
    const result = await checkOpenClawInstalled()
    if (result.installed) {
      openclawVersion.value = result.version || ''
      requirements.value.openclaw = true
      message.success(`检测到 OpenClaw ${result.version || ''}`)
      currentStep.value = 3
    } else {
      message.warning('未检测到 OpenClaw，请先完成安装')
    }
  } catch (error) {
    message.error('检测失败: ' + String(error))
  } finally {
    checking.value = false
  }
}

async function checkAgain() {
  checking.value = true
  try {
    const result = await checkOpenClawInstalled()
    if (result.installed) {
      openclawVersion.value = result.version || ''
      requirements.value.openclaw = true
      currentStep.value = 4
    } else {
      message.warning('未检测到 OpenClaw，请返回上一步')
      currentStep.value = 2
    }
  } catch (error) {
    message.error('检测失败: ' + String(error))
  } finally {
    checking.value = false
  }
}

function openNodejsDownload() { window.open('https://nodejs.cn/download/', '_blank') }
function openDocs() { window.open('https://docs.openclaw.ai', '_blank') }
function openGithub() { window.open('https://github.com/openclaw/openclaw', '_blank') }
function openDiscord() { window.open('https://discord.com/invite/clawd', '_blank') }

onMounted(async () => {
  try {
    const result = await checkOpenClawInstalled()
    requirements.value.openclaw = result.installed
    openclawVersion.value = result.version || ''
  } catch {
    requirements.value.openclaw = false
  }
  requirements.value.nodejs = true
  nodeVersion.value = '22'
  requirements.value.apiKey = false
})
</script>

<style scoped lang="scss">
.install-guide {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 9999;
  overflow-y: auto;
  padding: 24px;
}

.guide-container {
  width: 100%;
  max-width: 720px;
  margin: 24px auto;
}

.progress-bar {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 8px;
  opacity: 0.4;
  &.active { opacity: 1; }
  &.completed { opacity: 0.7; }
  
  .step-number {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 6px;
  }
  
  &.active .step-number { background: #ff6b35; border-color: #ff6b35; }
  &.completed .step-number { background: #52c41a; border-color: #52c41a; }
  
  .step-label { font-size: 11px; color: rgba(255, 255, 255, 0.7); }
}

.guide-content {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 12px;
}

.step-panel {
  h1 { font-size: 22px; font-weight: 600; color: #fff; margin: 0 0 8px; text-align: center; }
  h2 { font-size: 18px; font-weight: 600; color: #fff; margin: 0 0 12px; }
  h3 { font-size: 15px; font-weight: 600; color: rgba(255, 255, 255, 0.9); margin: 0 0 10px; }
  .subtitle { font-size: 13px; color: rgba(255, 255, 255, 0.6); margin: 0 0 20px; text-align: center; }
}

.welcome-icon, .success-icon { text-align: center; margin-bottom: 12px; }

.requirements {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  h3 { font-size: 13px; margin: 0 0 12px; }
}

.requirement-list { display: flex; flex-direction: column; gap: 10px; }
.requirement-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  &.ok { color: #52c41a; }
  &.missing { color: #ff4d4f; }
  &.warn { color: #faad14; }
}

.nodejs-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 14px;
  &.installed { background: rgba(82, 196, 26, 0.1); color: #52c41a; }
  &.not-installed { background: rgba(255, 77, 79, 0.1); color: #ff4d4f; }
}

.install-guide-content { text-align: left; }

.detail-steps {
  margin: 0;
  padding-left: 20px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 2;
  li { margin-bottom: 6px; strong { color: #fff; } }
  code {
    background: rgba(255, 107, 53, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    color: #ff6b35;
  }
}

.tip-box {
  background: rgba(82, 196, 26, 0.1);
  border-left: 3px solid #52c41a;
  padding: 10px 14px;
  margin: 10px 0;
  border-radius: 0 8px 8px 0;
  p { margin: 4px 0 0; font-size: 13px; }
}

.install-options {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 14px;
  margin: 12px 0;
  h4 { font-size: 13px; margin: 0 0 10px; }
}

.option-list { display: flex; flex-direction: column; gap: 6px; }
.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.terminal-guide {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.terminal-methods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
}

.terminal-method {
  h4 { font-size: 13px; margin: 0 0 10px; }
  ol {
    margin: 0;
    padding-left: 18px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.8;
    code {
      background: rgba(255, 107, 53, 0.2);
      padding: 2px 5px;
      border-radius: 3px;
      color: #ff6b35;
    }
  }
}

.shortcut-guide {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.8;
}

kbd {
  display: inline-block;
  padding: 3px 6px;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #fff;
  &.menu-item {
    background: rgba(255, 107, 53, 0.2);
    border-color: rgba(255, 107, 53, 0.3);
    color: #ff6b35;
  }
}

.install-method-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.method-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  &:hover { background: rgba(255, 255, 255, 0.08); }
  &.active {
    background: rgba(255, 107, 53, 0.1);
    border-color: #ff6b35;
    color: #ff6b35;
  }
}

.method-content { margin-bottom: 16px; }
.method-desc { font-size: 13px; color: rgba(255, 255, 255, 0.7); margin: 0 0 12px; }

.china-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(250, 173, 20, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 16px;
}

.code-group { margin-bottom: 16px; }
.code-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
}

.code-block {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 107, 53, 0.3);
  border-radius: 8px;
  padding: 12px 16px;
  code {
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 13px;
    color: #ff6b35;
    word-break: break-all;
  }
}

.code-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin: 6px 0 0;
}

.paste-tip {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  h4 { font-size: 13px; color: #fff; margin: 0 0 8px; }
  ul {
    margin: 0;
    padding-left: 18px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.8;
  }
}

.info-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(24, 144, 255, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 12px;
}

.wizard-steps { display: flex; flex-direction: column; gap: 12px; }
.wizard-step {
  display: flex;
  gap: 14px;
  padding: 14px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}
.wizard-step-num {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: #ff6b35;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}
.wizard-step-content {
  h4 { font-size: 14px; font-weight: 600; color: #fff; margin: 0 0 4px; }
  p { font-size: 12px; color: rgba(255, 255, 255, 0.6); margin: 0; }
}
.api-links {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  a {
    font-size: 12px;
    color: #ff6b35;
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }
}

.success-panel { text-align: center; }

.next-steps {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
  text-align: left;
  h4 { font-size: 14px; color: #fff; margin: 0 0 10px; }
  ul {
    margin: 0;
    padding-left: 18px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
    line-height: 1.8;
  }
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}

.faq-panel {
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  :deep(.n-collapse-item__header) {
    padding: 14px 16px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
  }
}

.faq-content {
  padding: 0 8px 8px;
  :deep(.n-collapse-item__header) { font-size: 12px; padding: 10px 12px; }
  p, ul, ol {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin: 6px 0;
    line-height: 1.6;
  }
  a {
    color: #ff6b35;
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }
}

.inline-code {
  display: inline-block;
  background: rgba(255, 107, 53, 0.1);
  padding: 6px 10px;
  border-radius: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: #ff6b35;
  margin: 6px 0;
}

.help-links {
  display: flex;
  justify-content: center;
  gap: 20px;
  :deep(.n-button) {
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    &:hover { color: #ff6b35; }
  }
}
</style>