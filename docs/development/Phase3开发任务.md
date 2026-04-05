# ClawDesk 开发任务 - Phase 3 完善功能

**创建日期：** 2026-04-05  
**创建人：** 产品经理小饼  
**指派给：** 开发小禾

---

## 任务概述

本次开发任务包含5个功能模块，按优先级排序：

| 序号 | 需求编号 | 功能名称 | 优先级 | 预估工时 |
|------|----------|----------|--------|----------|
| 1 | REQ-007 | 开机自启 | P2 | 0.5天 |
| 2 | REQ-012 | 角色个性化配置 | P2 | 1天 |
| 3 | REQ-020 | 会话历史 | P2 | 1天 |
| 4 | - | UI 美化 | P2 | 2天 |
| 5 | - | 主题切换 | P2 | 1天 |

**总预估工时：** 5.5天

---

## 任务一：REQ-007 开机自启

### 需求描述

用户希望 ClawDesk 开机自动启动，不需要手动启动。

### 功能要求

1. **配置入口位置**：设置页面或服务面板

2. **配置项**：
   - 开机自启开关
   - 自动启动 Gateway 服务开关（子选项）

3. **交互逻辑**：
   ```
   ┌─────────────────────────────┐
   │ ⚙️ 启动设置                  │
   │                             │
   │ ☑️ 开机自动启动 ClawDesk     │
   │   └─ ☑️ 同时启动 Gateway    │
   │                             │
   │ 💡 启用后系统启动时自动运行   │
   └─────────────────────────────┘
   ```

4. **功能行为**：
   - 启用开机自启：注册系统启动项
   - 禁用开机自启：移除系统启动项
   - 自动启动 Gateway：应用启动后自动启动服务

5. **状态同步**：
   - 配置保存到本地
   - 应用重启后保持设置

### 技术方案

1. **使用 Tauri API**：
   ```typescript
   import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart'
   
   // 启用开机自启
   await enable()
   
   // 禁用开机自启
   await disable()
   
   // 检查是否已启用
   const enabled = await isEnabled()
   ```

2. **扩展 SettingsStore**：
   ```typescript
   interface SettingsState {
     autoStart: boolean
     autoStartGateway: boolean
   }
   
   // 方法
   async setAutoStart(enabled: boolean): Promise<void>
   async checkAutoStartStatus(): Promise<boolean>
   ```

3. **应用启动逻辑**：
   - 在 `App.vue` 的 `onMounted` 中检查 `autoStartGateway`
   - 如果为 true，自动调用 `startService()`

4. **Tauri 插件配置**：
   - 在 `src-tauri/Cargo.toml` 添加 `tauri-plugin-autostart`
   - 在 `src-tauri/src/lib.rs` 注册插件
   - 在 `src-tauri/tauri.conf.json` 启用权限

### 验收标准

- [ ] 开机自启开关正确显示
- [ ] 启用后系统启动时自动启动 ClawDesk
- [ ] 可以配置是否同时启动 Gateway
- [ ] 禁用后不再自动启动
- [ ] 设置保存后应用重启保持

### 参考文件

- `src/stores/settings.ts` - 设置状态管理（新建或扩展）
- `src/App.vue` - 应用入口
- `src-tauri/Cargo.toml` - Tauri 依赖
- `src-tauri/src/lib.rs` - Tauri 插件注册

---

## 任务二：REQ-012 角色个性化配置

### 需求描述

用户希望自定义角色的外观和性格，打造个性化的助手。

### 功能要求

1. **配置入口位置**：角色选择面板的"编辑"按钮，或设置页面

2. **可配置项**：

   | 配置项 | 说明 | 限制 |
   |--------|------|------|
   | 花名 | 自定义角色称呼 | 最多10个字符 |
   | 头像 | 预设头像库或自定义上传 | 支持jpg/png，最大2MB |
   | 性格标签 | 选择性格特点 | 最多选择3个 |
   | 专属问候语 | 角色切换时显示 | 最多100个字符 |

3. **预设性格标签**：
   - 严谨 🎯
   - 活泼 🌟
   - 幽默 😄
   - 专业 💼
   - 温暖 ❤️
   - 直接 🎯
   - 细致 📝
   - 高效 ⚡

4. **预设头像库**：
   - 提供 8-12 个预设头像
   - 支持上传自定义头像
   - 自定义头像存储在本地

5. **配置面板布局**：
   ```
   ┌─────────────────────────────┐
   │ 🎭 角色个性化配置            │
   ├─────────────────────────────┤
   │                             │
   │ 花名：[___君君___]          │
   │                             │
   │ 头像：                      │
   │ [预设头像网格...]           │
   │ [📤 上传自定义头像]         │
   │                             │
   │ 性格标签：                  │
   │ ☑️ 严谨  ☐ 活泼  ☑️ 专业   │
   │ ☐ 幽默  ☐ 温暖  ☐ 直接     │
   │                             │
   │ 专属问候语：                │
   │ [___________________]       │
   │ "你好呀，有什么可以帮你的？" │
   │                             │
   │ [取消] [保存]               │
   └─────────────────────────────┘
   ```

6. **问候语显示时机**：
   - 切换到该角色时，在聊天区域顶部显示问候语
   - 3秒后自动消失

### 技术方案

1. **扩展 RoleStore**：
   ```typescript
   interface RoleCustomization {
     nickname: string
     avatar: string  // URL 或 base64
     personalityTags: string[]
     greeting: string
   }
   
   interface RoleState {
     // 现有状态...
     customizations: Record<string, RoleCustomization>  // roleId -> customization
   }
   
   // 方法
   updateCustomization(roleId: string, config: Partial<RoleCustomization>): void
   getCustomization(roleId: string): RoleCustomization
   resetCustomization(roleId: string): void
   ```

2. **头像处理**：
   - 预设头像放在 `public/avatars/` 目录
   - 自定义头像使用 Tauri fs API 保存到用户目录
   - 使用 `@tauri-apps/plugin-dialog` 选择文件
   - 使用 `@tauri-apps/plugin-fs` 保存文件

3. **本地持久化**：
   - 配置保存到 localStorage
   - 或使用 Tauri store 插件

4. **UI 组件**：
   - 使用 Naive UI 的 `n-modal` 显示配置弹窗
   - 使用 `n-input` 输入花名和问候语
   - 使用 `n-checkbox-group` 选择性格标签
   - 自定义头像网格组件

### 验收标准

- [ ] 可以修改角色花名
- [ ] 可以选择预设头像
- [ ] 可以上传自定义头像
- [ ] 可以选择性格标签（最多3个）
- [ ] 可以设置专属问候语
- [ ] 切换角色时显示问候语
- [ ] 配置保存后应用重启保持

### 参考文件

- `src/stores/role.ts` - 角色状态管理
- `src/components/RoleSelector.vue` - 角色选择组件
- `src/components/RoleCustomizer.vue` - 新建，角色配置组件

---

## 任务三：REQ-020 会话历史

### 需求描述

用户希望查看会话的历史消息，回顾之前的对话。

### 功能要求

1. **历史入口位置**：会话列表中每个会话的右键菜单或详情按钮

2. **功能列表**：

   | 功能 | 说明 |
   |------|------|
   | 加载历史 | 点击会话加载历史消息 |
   | 搜索历史 | 按关键词搜索历史消息 |
   | 导出记录 | 导出会话为文本文件 |

3. **搜索功能**：
   ```
   ┌─────────────────────────────┐
   │ 🔍 搜索历史消息              │
   │ [___________________] [搜索] │
   │                             │
   │ 找到 3 条结果：              │
   │ 1. "...任务进度..."         │
   │    2026-04-05 14:30         │
   │ 2. "...上下文监控..."       │
   │    2026-04-05 12:15         │
   └─────────────────────────────┘
   ```

4. **导出格式**：
   ```
   ClawDesk 会话记录
   导出时间：2026-04-05 22:00
   会话名称：开发 ClawDesk 桌面应用
   
   ─────────────────────────────
   [2026-04-05 10:00] 用户：
   开始开发 ClawDesk 桌面应用
   
   [2026-04-05 10:01] 晓君：
   好的，开始搭建项目框架...
   
   [2026-04-05 10:30] 用户：
   服务管理模块完成了吗？
   
   [2026-04-05 10:31] 晓君：
   已完成，现在开始角色系统...
   ─────────────────────────────
   ```

5. **搜索限制**：
   - 支持模糊搜索
   - 搜索范围：消息内容
   - 默认搜索当前会话
   - 可选搜索所有会话

6. **性能优化**：
   - 大量消息时支持分页加载
   - 搜索时限制返回数量（最多50条）

### 技术方案

1. **扩展 SessionStore**：
   ```typescript
   interface SessionState {
     // 现有状态...
     searchQuery: string
     searchResults: SearchResult[]
     searchScope: 'current' | 'all'
   }
   
   // 方法
   searchMessages(query: string, scope: 'current' | 'all'): SearchResult[]
   exportSession(sessionId: string): string  // 返回导出内容
   ```

2. **搜索实现**：
   ```typescript
   interface SearchResult {
     sessionId: string
     messageId: string
     content: string  // 高亮后的内容
     timestamp: number
   }
   
   // 搜索逻辑
   function searchMessages(query: string, sessions: Session[]): SearchResult[] {
     const results: SearchResult[] = []
     const lowerQuery = query.toLowerCase()
     
     for (const session of sessions) {
       for (const message of session.messages) {
         if (message.content.toLowerCase().includes(lowerQuery)) {
           results.push({
             sessionId: session.id,
             messageId: message.id,
             content: highlightText(message.content, query),
             timestamp: message.timestamp
           })
         }
       }
     }
     
     return results.slice(0, 50)  // 限制50条
   }
   ```

3. **导出实现**：
   - 使用 Tauri 的 `save` API 选择保存路径
   - 使用 `@tauri-apps/plugin-fs` 写入文件
   - 格式化为纯文本

4. **UI 组件**：
   - 使用 Naive UI 的 `n-input` 搜索框
   - 使用 `n-list` 显示搜索结果
   - 使用 `n-button` 导出按钮

### 验收标准

- [ ] 点击会话加载历史消息
- [ ] 可以搜索历史消息
- [ ] 搜索结果高亮显示关键词
- [ ] 可以导出会话记录
- [ ] 导出的文件格式正确
- [ ] 大量消息时分页加载

### 参考文件

- `src/stores/session.ts` - 会话状态管理
- `src/components/panels/ChatPanel.vue` - 聊天面板
- `src/components/SessionHistory.vue` - 新建，历史搜索组件

---

## 任务四：UI 美化

### 需求描述

提升整体界面美观度，优化用户体验。

### 功能要求

1. **整体风格**：
   - 简洁现代的设计风格
   - 统一的圆角和阴影
   - 协调的配色方案

2. **具体优化项**：

   | 区域 | 优化内容 |
   |------|----------|
   | 顶部栏 | Logo 优化、状态指示器动画、角色头像边框 |
   | 左侧栏 | 图标优化、悬停效果、选中状态高亮 |
   | 右侧面板 | 标签页样式、卡片阴影、按钮样式 |
   | 聊天区域 | 消息气泡、时间戳样式、代码块样式 |
   | 底部状态栏 | 图标优化、状态指示器样式 |

3. **动画效果**：
   - 页面切换淡入淡出
   - 按钮悬停缩放
   - 消息发送动画
   - 加载状态动画

4. **图标系统**：
   - 使用统一的图标库（推荐 `@iconify/vue`）
   - 图标大小一致
   - 颜色与主题协调

5. **响应式适配**：
   - 窗口缩小时自适应布局
   - 最小窗口宽度限制

6. **细节打磨**：
   - 滚动条样式美化
   - 输入框聚焦效果
   - 按钮禁用状态
   - 加载骨架屏

### 技术方案

1. **引入图标库**：
   ```bash
   npm install @iconify/vue
   ```

2. **全局样式优化**：
   - 在 `src/style/global.scss` 定义通用样式
   - 统一圆角、阴影、过渡动画变量

3. **组件样式优化**：
   - 为每个组件添加悬停效果
   - 统一按钮样式
   - 统一输入框样式

4. **动画实现**：
   - 使用 CSS `transition` 和 `animation`
   - 使用 Vue 的 `<Transition>` 组件

5. **配色方案**：
   ```scss
   // 主色调
   $primary-color: #18a058;
   $primary-hover: #36ad6a;
   
   // 中性色
   $text-color: #333;
   $text-secondary: #666;
   $border-color: #e0e0e0;
   $bg-color: #f5f5f5;
   
   // 圆角
   $border-radius-sm: 4px;
   $border-radius-md: 8px;
   $border-radius-lg: 12px;
   
   // 阴影
   $shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
   $shadow-md: 0 4px 6px rgba(0,0,0,0.1);
   $shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
   ```

### 验收标准

- [ ] 整体界面风格统一协调
- [ ] 按钮、输入框样式一致
- [ ] 悬停效果流畅
- [ ] 页面切换动画自然
- [ ] 图标风格统一
- [ ] 滚动条样式美观
- [ ] 窗口缩放时布局正常

### 参考文件

- `src/style/global.scss` - 全局样式
- `src/App.vue` - 根组件样式
- 所有 `.vue` 组件文件的 `<style>` 部分

---

## 任务五：主题切换

### 需求描述

用户希望可以切换深色/浅色主题，保护眼睛或适应环境。

### 功能要求

1. **主题入口位置**：设置页面或顶部栏快捷按钮

2. **支持主题**：
   - 浅色主题（默认）
   - 深色主题
   - 跟随系统（可选）

3. **主题切换效果**：
   - 平滑过渡动画
   - 所有组件颜色同步变化
   - 图标颜色适配

4. **主题配置**：
   ```
   ┌─────────────────────────────┐
   │ 🎨 主题设置                  │
   │                             │
   │ ⚪ 浅色主题（默认）          │
   │ ⚫ 深色主题                  │
   │ 🔄 跟随系统                  │
   │                             │
   │ 当前：浅色主题               │
   └─────────────────────────────┘
   ```

5. **配色方案**：

   | 元素 | 浅色主题 | 深色主题 |
   |------|----------|----------|
   | 背景 | #ffffff | #1a1a1a |
   | 文字 | #333333 | #e0e0e0 |
   | 次要文字 | #666666 | #a0a0a0 |
   | 边框 | #e0e0e0 | #333333 |
   | 卡片背景 | #f5f5f5 | #2a2a2a |
   | 悬停背景 | #f0f0f0 | #333333 |

6. **状态持久化**：
   - 主题选择保存到本地
   - 应用重启后保持设置

### 技术方案

1. **Naive UI 主题切换**：
   ```typescript
   import { darkTheme } from 'naive-ui'
   
   // 在 App.vue 中
   const theme = computed(() => {
     return settingsStore.theme === 'dark' ? darkTheme : null
   })
   ```

2. **创建 ThemeStore**：
   ```typescript
   type ThemeMode = 'light' | 'dark' | 'system'
   
   interface ThemeState {
     mode: ThemeMode
     currentTheme: 'light' | 'dark'  // 实际应用的主题
   }
   
   // 方法
   setTheme(mode: ThemeMode): void
   getSystemTheme(): 'light' | 'dark'
   ```

3. **CSS 变量方案**：
   ```scss
   :root {
     --bg-color: #ffffff;
     --text-color: #333333;
     --border-color: #e0e0e0;
   }
   
   [data-theme="dark"] {
     --bg-color: #1a1a1a;
     --text-color: #e0e0e0;
     --border-color: #333333;
   }
   
   // 使用
   .card {
     background: var(--bg-color);
     color: var(--text-color);
   }
   ```

4. **监听系统主题**：
   ```typescript
   // 使用 matchMedia 监听系统主题
   const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
   
   darkModeQuery.addEventListener('change', (e) => {
     if (themeStore.mode === 'system') {
       themeStore.currentTheme = e.matches ? 'dark' : 'light'
     }
   })
   ```

5. **过渡动画**：
   ```scss
   * {
     transition: background-color 0.3s, color 0.3s, border-color 0.3s;
   }
   ```

### 验收标准

- [ ] 可以切换浅色/深色主题
- [ ] 所有组件颜色正确变化
- [ ] 主题切换有过渡动画
- [ ] 可以跟随系统主题
- [ ] 主题选择保存后应用重启保持
- [ ] 图标颜色适配主题

### 参考文件

- `src/App.vue` - 根组件主题配置
- `src/stores/theme.ts` - 主题状态管理（新建）
- `src/style/themes/` - 主题样式文件（新建）

---

## 开发注意事项

1. **遵循现有代码风格**：
   - 使用 Vue 3 Composition API
   - 使用 TypeScript
   - 使用 Naive UI 组件库
   - 使用 SCSS 编写样式

2. **状态管理**：
   - 扩展现有 Store 文件
   - 新增 Store 文件放在 `src/stores/` 目录

3. **类型定义**：
   - 新增类型定义放在 `src/types/` 目录

4. **Git 提交规范**：
   - `feat(req-007): 实现开机自启功能`
   - `feat(req-012): 实现角色个性化配置`
   - `feat(req-020): 实现会话历史功能`
   - `feat(ui): UI 美化优化`
   - `feat(theme): 实现主题切换功能`

5. **测试验证**：
   - 每完成一个功能先自测
   - 确保功能正常后再提交

---

## 完成后交付

- [ ] 代码已提交到 Git
- [ ] 功能已自测通过
- [ ] 更新 MEMORY.md 记录开发进度
- [ ] 通知产品经理验收

---

**祝开发顺利！有问题随时沟通~**
