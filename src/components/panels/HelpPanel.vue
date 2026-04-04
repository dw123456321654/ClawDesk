<script setup lang="ts">
import { ref } from 'vue'
import { NInput, NCard } from 'naive-ui'

const searchQuery = ref('')

// 功能列表
const features = [
  {
    id: 'service',
    icon: '🖥️',
    name: '服务管理',
    description: '一键启动/停止 Gateway 服务，监控运行状态',
    detail: '服务管理功能让你无需使用终端命令，即可轻松管理 OpenClaw Gateway 服务。支持启动、停止、重启操作，实时查看服务状态和日志。'
  },
  {
    id: 'role',
    icon: '🤖',
    name: '角色系统',
    description: '切换不同的 AI 助手角色，个性化配置',
    detail: '角色系统支持在不同场景下切换专业的 AI 助手，如产品经理、开发工程师、测试工程师等。每个角色有不同的专业背景和回复风格。'
  },
  {
    id: 'node',
    icon: '🔌',
    name: '节点管理',
    description: '管理和监控已配对的设备节点',
    detail: '节点管理功能用于查看和管理已配对的设备，包括手机、平板等。可以查看节点状态、发送通知、远程控制等。'
  },
  {
    id: 'skill',
    icon: '🎯',
    name: '技能管理',
    description: '安装和管理 AI 技能模块',
    detail: '技能是扩展 AI 能力的模块，通过技能管理可以安装、配置、更新各种技能，让 AI 拥有更多能力。'
  },
  {
    id: 'automation',
    icon: '⏰',
    name: '自动化',
    description: '创建定时任务和自动化流程',
    detail: '自动化功能支持创建定时任务，如定时提醒、定时执行命令等。可以设置触发条件和执行动作。'
  },
  {
    id: 'task',
    icon: '📋',
    name: '任务持久化',
    description: '任务进度保存，中断后可恢复',
    detail: '任务持久化功能自动保存任务进度，即使服务重启或中断，也能从上次的位置继续执行。'
  }
]

// 过滤功能列表
const filteredFeatures = ref(features)

// 搜索处理
const handleSearch = (query: string) => {
  if (!query) {
    filteredFeatures.value = features
    return
  }
  
  filteredFeatures.value = features.filter(f => 
    f.name.includes(query) || f.description.includes(query)
  )
}
</script>

<template>
  <div class="help-panel">
    <!-- 搜索框 -->
    <n-input
      v-model:value="searchQuery"
      placeholder="搜索功能..."
      clearable
      @update:value="handleSearch"
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
    cursor: pointer;
    
    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
