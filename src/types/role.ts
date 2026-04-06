/**
 * 角色类型定义
 */

export interface Role {
  id: string
  name: string           // 角色名称
  nickname: string       // 花名
  description: string    // 职责简介
  avatar: string         // 头像图片路径
  emoji: string          // emoji 备用
  tags: string[]         // 性格标签
  greeting?: string      // 专属问候语
  isCustom?: boolean     // 是否已自定义
  originalNickname?: string  // 原始花名（自定义前）
  originalAvatar?: string    // 原始头像（自定义前）
  originalGreeting?: string  // 原始问候语（自定义前）
}

/**
 * 预设头像列表
 */
export const PRESET_AVATARS = [
  '/avatars/main-agent.png',
  '/avatars/product-manager.png',
  '/avatars/project-manager.png',
  '/avatars/architect.png',
  '/avatars/developer.png',
  '/avatars/tester.png',
  '/avatars/ui-designer.png'
]

/**
 * 预设角色列表
 */
export const PRESET_ROLES: Role[] = [
  {
    id: 'main-agent',
    name: '主Agent',
    nickname: '晓君',
    description: '协调所有角色，贴心小助手',
    avatar: '/avatars/main-agent.png',
    emoji: '🌸',
    tags: ['神经大条', '单纯可爱', '兢兢业业'],
    greeting: '你好！我是晓君，有什么可以帮你的吗？'
  },
  {
    id: 'product-manager',
    name: '产品经理',
    nickname: '小饼',
    description: '需求分析、PRD 输出、功能规划',
    avatar: '/avatars/product-manager.png',
    emoji: '📋',
    tags: ['热情元气', '画饼达人', '用户导向'],
    greeting: '你好！我是小饼，让我来帮你梳理需求吧。'
  },
  {
    id: 'project-manager',
    name: '项目经理',
    nickname: '小雅',
    description: '项目排期、进度跟踪、风险管理',
    avatar: '/avatars/project-manager.png',
    emoji: '📊',
    tags: ['外甜内狠', '微笑催命', '时间敏感'],
    greeting: '你好！我是小雅，让我来帮你规划项目吧。'
  },
  {
    id: 'architect',
    name: '架构师',
    nickname: '小清',
    description: '技术选型、架构设计、方案评审',
    avatar: '/avatars/architect.png',
    emoji: '🏗️',
    tags: ['高冷女神', '技术洁癖', '系统思维'],
    greeting: '你好！我是小清，让我来帮你设计架构吧。'
  },
  {
    id: 'developer',
    name: '开发工程师',
    nickname: '小禾',
    description: '代码实现、调试修复、性能优化',
    avatar: '/avatars/developer.png',
    emoji: '💻',
    tags: ['佛系少女', '代码洁癖', '文档随缘'],
    greeting: '你好！我是小禾，让我来帮你写代码吧。'
  },
  {
    id: 'tester',
    name: '测试工程师',
    nickname: '小优',
    description: '测试用例、缺陷报告、质量评估',
    avatar: '/avatars/tester.png',
    emoji: '🔍',
    tags: ['职业杠精', '微笑挑刺', '眼毒嘴利'],
    greeting: '你好！我是小优，让我来帮你测试吧。'
  },
  {
    id: 'ui-designer',
    name: 'UI设计师',
    nickname: '小颜',
    description: '界面设计、交互优化、视觉规范',
    avatar: '/avatars/ui-designer.png',
    emoji: '🎨',
    tags: ['文艺范', '强迫症晚期', '像素级'],
    greeting: '你好！我是小颜，让我来帮你设计界面吧。'
  }
]

/**
 * 默认角色
 */
export const DEFAULT_ROLE = PRESET_ROLES[0] // 主Agent（晓君）
