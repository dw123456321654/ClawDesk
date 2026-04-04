/**
 * 角色类型定义
 */

export interface Role {
  id: string
  name: string           // 角色名称
  nickname: string       // 花名
  description: string    // 职责简介
  avatar: string         // 头像（emoji 或图片路径）
  tags: string[]         // 性格标签
  greeting?: string      // 专属问候语
}

/**
 * 预设角色列表
 */
export const PRESET_ROLES: Role[] = [
  {
    id: 'product-manager',
    name: '产品经理',
    nickname: '产品小助手',
    description: '需求分析、PRD 输出、功能规划',
    avatar: '📋',
    tags: ['严谨', '用户导向', '数据驱动'],
    greeting: '你好！我是产品小助手，让我来帮你梳理需求吧。'
  },
  {
    id: 'project-manager',
    name: '项目经理',
    nickname: '进度管家',
    description: '项目排期、进度跟踪、风险管理',
    avatar: '📊',
    tags: ['条理清晰', '时间敏感', '风险意识'],
    greeting: '你好！我是进度管家，让我来帮你规划项目吧。'
  },
  {
    id: 'architect',
    name: '架构师',
    nickname: '技术顾问',
    description: '技术选型、架构设计、方案评审',
    avatar: '🏗️',
    tags: ['技术深度', '系统思维', '前瞻性'],
    greeting: '你好！我是技术顾问，让我来帮你设计架构吧。'
  },
  {
    id: 'developer',
    name: '开发工程师',
    nickname: '代码工匠',
    description: '代码实现、调试修复、性能优化',
    avatar: '💻',
    tags: ['实战派', '代码洁癖', '效率优先'],
    greeting: '你好！我是代码工匠，让我来帮你写代码吧。'
  },
  {
    id: 'tester',
    name: '测试工程师',
    nickname: '质量守门员',
    description: '测试用例、缺陷报告、质量评估',
    avatar: '🔍',
    tags: ['细心', '吹毛求疵', '用户视角'],
    greeting: '你好！我是质量守门员，让我来帮你测试吧。'
  },
  {
    id: 'ui-designer',
    name: 'UI设计师',
    nickname: '视觉艺术家',
    description: '界面设计、交互优化、视觉规范',
    avatar: '🎨',
    tags: ['审美在线', '用户同理心', '细节控'],
    greeting: '你好！我是视觉艺术家，让我来帮你设计界面吧。'
  }
]

/**
 * 默认角色
 */
export const DEFAULT_ROLE = PRESET_ROLES[3] // 开发工程师
