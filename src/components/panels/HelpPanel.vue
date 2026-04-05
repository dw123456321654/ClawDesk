<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NCard, NModal, NDescriptions, NDescriptionsItem, NTag, NCollapse, NCollapseItem } from 'naive-ui'

const searchQuery = ref('')
const selectedFeature = ref<typeof features[0] | null>(null)
const showDetail = ref(false)

// 功能列表（符合需求文档 REQ-009）
const features = [
  {
    id: 'service',
    icon: '🖥️',
    name: '服务管理',
    description: '一键启动/停止 Gateway 服务，监控运行状态',
    detail: '服务管理功能让你无需使用终端命令，即可轻松管理 OpenClaw Gateway 服务。支持启动、停止、重启操作，实时查看服务状态和日志。',
    usage: [
      '点击"启动服务"按钮启动 Gateway',
      '启动后状态栏显示"运行中"',
      '点击"停止服务"按钮停止 Gateway',
      '点击"重启服务"按钮重启 Gateway'
    ],
    faq: [
      { q: '端口被占用怎么办？', a: '系统会提示是否强制启动，选择强制启动会先停止占用端口的进程。' },
      { q: '服务启动失败？', a: '检查日志面板查看错误信息，常见原因：端口被占用、权限不足、配置错误。' }
    ]
  },
  {
    id: 'role',
    icon: '🤖',
    name: '角色系统',
    description: '切换不同的 AI 助手角色，个性化配置',
    detail: '角色系统支持在不同场景下切换专业的 AI 助手，如产品经理、开发工程师、测试工程师等。每个角色有不同的专业背景和回复风格。',
    usage: [
      '点击顶部角色区域展开角色面板',
      '选择需要的角色点击"切换"',
      '切换后新消息将由新角色回复',
      '历史消息保持不变'
    ],
    faq: [
      { q: '切换角色后历史消息会丢失吗？', a: '不会。每个角色的对话历史独立保存，切换角色只是切换当前对话对象。' },
      { q: '可以自定义角色吗？', a: '支持在设置中自定义角色花名、头像和性格标签。' }
    ]
  },
  {
    id: 'context',
    icon: '📊',
    name: '上下文监控',
    description: '实时监控上下文使用率，防止溢出中断',
    detail: '上下文监控显示当前对话的上下文使用情况，帮助你了解 AI 还能"记住"多少内容。使用率过高时系统会提醒。',
    usage: [
      '底部状态栏显示上下文使用率',
      '绿色表示正常（<60%）',
      '黄色表示偏高（60-80%）',
      '红色表示警告（>80%）'
    ],
    faq: [
      { q: '上下文满了怎么办？', a: '点击上下文显示区域，选择"新开会话"或"压缩上下文"。' },
      { q: '为什么会突然中断？', a: '上下文满了会导致 AI 无法继续处理，建议保持使用率在 80% 以下。' }
    ]
  },
  {
    id: 'node',
    icon: '🔌',
    name: '节点管理',
    description: '管理和监控已配对的设备节点',
    detail: '节点管理功能用于查看和管理已配对的设备，包括手机、平板等。可以查看节点状态、发送通知、远程控制等。',
    usage: [
      '在设置中扫描二维码配对设备',
      '配对后设备会出现在节点列表',
      '可以查看设备在线状态',
      '支持向设备发送通知和命令'
    ],
    faq: [
      { q: '支持哪些设备？', a: '支持 Android、iOS、macOS 等运行 OpenClaw Node 的设备。' },
      { q: '如何配对设备？', a: '在移动端 OpenClaw 应用中扫描桌面端显示的二维码即可配对。' }
    ]
  },
  {
    id: 'skill',
    icon: '🎯',
    name: '技能管理',
    description: '安装和管理 AI 技能模块',
    detail: '技能是扩展 AI 能力的模块，通过技能管理可以安装、配置、更新各种技能，让 AI 拥有更多能力。',
    usage: [
      '访问技能市场浏览可用技能',
      '点击安装添加技能',
      '在对话中使用技能提供的命令',
      '可以在设置中管理已安装技能'
    ],
    faq: [
      { q: '技能是什么？', a: '技能是预定义的能力包，例如天气查询、网页抓取、图像生成等。' },
      { q: '技能从哪里获取？', a: '访问 ClawHub (clawhub.ai) 浏览和安装技能。' }
    ]
  },
  {
    id: 'automation',
    icon: '⏰',
    name: '自动化',
    description: '创建定时任务和自动化流程',
    detail: '自动化功能支持创建定时任务，如定时提醒、定时执行命令等。可以设置触发条件和执行动作。',
    usage: [
      '创建新任务，设置触发条件',
      '选择执行动作（发送消息、执行命令等）',
      '设置时间或事件触发',
      '启用后任务自动执行'
    ],
    faq: [
      { q: '支持哪些触发条件？', a: '支持定时触发（如每天 9:00）、事件触发（如收到特定消息）。' },
      { q: '可以创建多少个任务？', a: '没有数量限制，但建议只保留必要的任务以避免资源占用。' }
    ]
  },
  {
    id: 'task',
    icon: '📋',
    name: '任务持久化',
    description: '任务进度保存，中断后可恢复',
    detail: '任务持久化功能自动保存任务进度，即使服务重启或中断，也能从上次的位置继续执行。避免重复工作。',
    usage: [
      'AI 执行任务时进度自动保存',
      '任务面板显示当前进度',
      '中断后可查看未完成任务',
      '选择恢复继续执行'
    ],
    faq: [
      { q: '什么情况下任务会中断？', a: '服务重启、电脑关机、网络断开等情况可能导致任务中断。' },
      { q: '如何恢复中断的任务？', a: '打开任务面板，找到未完成的任务，点击"恢复"继续执行。' }
    ]
  }
]

// 过滤功能列表
const filteredFeatures = computed(() => {
  if (!searchQuery.value) return features
  const query = searchQuery.value.toLowerCase()
  return features.filter(f => 
    f.name.toLowerCase().includes(query) || 
    f.description.toLowerCase().includes(query)
  )
})

// 查看详情
const viewDetail = (feature: typeof features[0]) => {
  selectedFeature.value = feature
  showDetail.value = true
}
</script>

<template>
  <div class="help-panel">
    <!-- 搜索框 -->
    <n-input
      v-model:value="searchQuery"
      placeholder="搜索功能..."
      clearable
      style="margin-bottom: 16px;"
    />
    
    <!-- 功能列表 -->
    <div class="feature-list">
      <n-card
        v-for="feature in filteredFeatures"
        :key="feature.id"
        size="small"
        hoverable
        style="margin-bottom: 12px; cursor: pointer;"
        @click="viewDetail(feature)"
      >
        <div class="feature-card">
          <div class="feature-header">
            <span class="feature-icon">{{ feature.icon }}</span>
            <span class="feature-name">{{ feature.name }}</span>
          </div>
          <p class="feature-desc">{{ feature.description }}</p>
          <span class="feature-link">查看详情 →</span>
        </div>
      </n-card>
    </div>
    
    <!-- 无结果 -->
    <n-empty v-if="filteredFeatures.length === 0" description="未找到相关功能" />
    
    <!-- 详情弹窗 -->
    <n-modal
      v-model:show="showDetail"
      preset="card"
      :title="selectedFeature?.name"
      style="width: 600px; max-width: 90vw;"
      :bordered="false"
    >
      <template v-if="selectedFeature">
        <n-descriptions label-placement="left" :column="1" bordered>
          <n-descriptions-item label="功能说明">
            {{ selectedFeature.detail }}
          </n-descriptions-item>
        </n-descriptions>
        
        <n-collapse style="margin-top: 16px;">
          <n-collapse-item title="📖 使用方法" name="usage">
            <ul class="usage-list">
              <li v-for="(step, index) in selectedFeature.usage" :key="index">
                {{ step }}
              </li>
            </ul>
          </n-collapse-item>
          
          <n-collapse-item title="❓ 常见问题" name="faq">
            <div v-for="(item, index) in selectedFeature.faq" :key="index" class="faq-item">
              <p class="faq-question"><n-tag type="info" size="small">问</n-tag> {{ item.q }}</p>
              <p class="faq-answer"><n-tag type="success" size="small">答</n-tag> {{ item.a }}</p>
            </div>
          </n-collapse-item>
        </n-collapse>
      </template>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.help-panel {
  font-size: 13px;
}

.feature-card {
  .feature-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .feature-icon {
    font-size: 18px;
  }
  
  .feature-name {
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .feature-desc {
    margin: 0 0 8px 0;
    font-size: 12px;
    color: var(--text-secondary);
  }
  
  .feature-link {
    font-size: 12px;
    color: #2080f0;
  }
}

.usage-list {
  margin: 0;
  padding-left: 20px;
  
  li {
    margin: 8px 0;
    line-height: 1.6;
  }
}

.faq-item {
  margin-bottom: 12px;
  
  .faq-question, .faq-answer {
    margin: 4px 0;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
