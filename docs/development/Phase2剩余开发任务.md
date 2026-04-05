# ClawDesk 开发任务 - Phase 2 剩余功能

**创建日期：** 2026-04-05  
**创建人：** 产品经理小饼  
**指派给：** 开发小禾

---

## 任务概述

本次开发任务包含4个功能模块，按优先级排序：

| 序号 | 需求编号 | 功能名称 | 优先级 | 预估工时 |
|------|----------|----------|--------|----------|
| 1 | REQ-003 | Gateway 服务重启 | P1 | 0.5天 |
| 2 | REQ-005 | 端口配置 | P1 | 0.5天 |
| 3 | REQ-006 | 日志面板 | P1 | 1天 |
| 4 | REQ-017 | 任务列表管理 | P1 | 1天 |

**总预估工时：** 3天

---

## 任务一：REQ-003 Gateway 服务重启

### 需求描述

用户希望一键重启 Gateway 服务，在修改配置后可以快速重启。

### 功能要求

1. **重启按钮位置**：在 `ServicePanel.vue` 中，与启动/停止按钮并列

2. **按钮状态**：
   - 服务运行中：可点击
   - 服务已停止：禁用状态（灰色）
   - 服务启动中/停止中：禁用状态

3. **重启流程**：
   ```
   点击重启 → 确认弹窗 → 执行停止 → 等待停止完成 → 执行启动 → 显示重启结果
   ```

4. **确认弹窗**：
   ```
   ┌─────────────────────────────┐
   │ 🔄 重启服务                  │
   │                             │
   │ 重启服务会中断当前任务，      │
   │ 是否继续？                   │
   │                             │
   │ [取消] [确认重启]            │
   └─────────────────────────────┘
   ```

5. **进度显示**：
   - 显示"正在停止服务..."
   - 显示"正在启动服务..."
   - 显示"重启成功"或"重启失败"

### 技术方案

1. **扩展 ServiceStore**：
   ```typescript
   // 新增方法
   async restartService(): Promise<boolean> {
     // 1. 调用停止
     // 2. 等待停止完成
     // 3. 调用启动
     // 4. 返回结果
   }
   ```

2. **API 调用**：
   - 调用现有的 `stopService()` 方法
   - 调用现有的 `startService()` 方法

3. **UI 组件**：
   - 使用 Naive UI 的 `n-button` 
   - 使用 `useDialog` 显示确认弹窗
   - 使用 `useMessage` 显示操作结果

### 验收标准

- [ ] 重启按钮正确显示在服务面板中
- [ ] 服务已停止时，按钮为禁用状态
- [ ] 点击重启显示确认弹窗
- [ ] 重启过程显示进度提示
- [ ] 重启成功后状态正确更新

### 参考文件

- `src/stores/service.ts` - 服务状态管理
- `src/components/panels/ServicePanel.vue` - 服务面板
- `src/utils/api.ts` - API 调用

---

## 任务二：REQ-005 端口配置

### 需求描述

用户希望可以自定义 Gateway 端口，避免端口冲突。

### 功能要求

1. **配置入口位置**：在 `ServicePanel.vue` 的服务设置区域

2. **配置项**：
   - 端口号输入框
   - 默认值：18789
   - 有效范围：1024-65535
   - 输入验证：实时校验

3. **输入验证**：
   - 非数字：显示"请输入数字"
   - 范围外：显示"端口范围：1024-65535"
   - 已被占用：显示"端口已被占用"（可选，需要检测）

4. **配置保存**：
   - 保存到本地配置文件
   - 应用重启后自动加载
   - 修改后提示"下次启动生效"

5. **UI 布局**：
   ```
   ┌─────────────────────────────┐
   │ ⚙️ 服务设置                  │
   │                             │
   │ 端口号：[____18789____]     │
   │         范围：1024-65535     │
   │                             │
   │ 💾 修改后下次启动生效        │
   └─────────────────────────────┘
   ```

### 技术方案

1. **扩展 ServiceStore**：
   ```typescript
   interface ServiceState {
     // 新增
     port: number
     tempPort: string  // 输入框临时值
     portError: string | null
   }
   
   // 新增方法
   setPort(port: number): void
   validatePort(port: string): boolean
   savePortConfig(): void
   loadPortConfig(): void
   ```

2. **本地持久化**：
   - 使用 Tauri 的 `store` 插件保存配置
   - 或使用 `localStorage` 作为备选

3. **端口检测**（可选）：
   - 使用 Tauri 的 `tcp` API 检测端口是否被占用

### 验收标准

- [ ] 端口输入框正确显示
- [ ] 默认值为 18789
- [ ] 输入无效端口时显示错误提示
- [ ] 配置保存后应用重启自动加载
- [ ] 修改后显示提示"下次启动生效"

### 参考文件

- `src/stores/service.ts` - 服务状态管理
- `src/components/panels/ServicePanel.vue` - 服务面板
- `src-tauri/src/lib.rs` - Tauri 配置（如使用 store 插件）

---

## 任务三：REQ-006 日志面板

### 需求描述

用户希望查看 Gateway 日志，便于排查问题。

### 功能要求

1. **日志面板位置**：右侧面板的新标签页 "日志"

2. **显示内容**：
   - 实时日志流
   - 每条日志包含：时间戳、级别、消息
   - 最新日志自动滚动到底部

3. **日志级别筛选**：
   - 下拉选择：ALL / INFO / WARN / ERROR / DEBUG
   - 默认显示 ALL

4. **日志格式**：
   ```
   [2026-04-05 12:30:45] [INFO] Gateway started on port 18789
   [2026-04-05 12:30:46] [INFO] WebSocket connection established
   [2026-04-05 12:31:00] [WARN] High memory usage detected
   [2026-04-05 12:31:15] [ERROR] Connection timeout
   ```

5. **操作功能**：
   - 清空日志：清除当前显示的日志
   - 导出日志：保存为 .log 文件
   - 暂停滚动：暂停自动滚动，方便查看

6. **日志颜色**：
   - INFO：默认色（白色/黑色）
   - WARN：黄色
   - ERROR：红色
   - DEBUG：灰色

7. **性能限制**：
   - 最多保留 1000 条日志
   - 超过后自动删除最旧的日志

### 技术方案

1. **创建 LogStore**：
   ```typescript
   interface LogEntry {
     timestamp: string
     level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
     message: string
   }
   
   interface LogState {
     logs: LogEntry[]
     maxLogs: number  // 默认 1000
     filter: 'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
     autoScroll: boolean
   }
   
   // 方法
   addLog(entry: LogEntry): void
   clearLogs(): void
   exportLogs(): void
   ```

2. **日志获取方式**：
   - 方案A：通过 WebSocket 接收 Gateway 日志消息
   - 方案B：读取 Gateway 日志文件（使用 Tauri fs API）

3. **UI 组件**：
   - 使用 Naive UI 的 `n-log` 组件（推荐）
   - 或自定义日志列表组件

4. **文件导出**：
   - 使用 Tauri 的 `save` API 选择保存路径
   - 使用 Tauri 的 `fs` API 写入文件

### 验收标准

- [ ] 日志面板正确显示日志列表
- [ ] 日志实时更新
- [ ] 可以按级别筛选日志
- [ ] 不同级别日志显示不同颜色
- [ ] 可以清空日志
- [ ] 可以导出日志文件
- [ ] 日志超过 1000 条自动清理

### 参考文件

- `src/components/panels/` - 创建 `LogPanel.vue`
- `src/stores/` - 创建 `log.ts`
- `src/utils/api.ts` - WebSocket 消息处理
- `src-tauri/tauri.conf.json` - 启用 dialog 和 fs 插件

---

## 任务四：REQ-017 任务列表管理

### 需求描述

用户希望看到所有任务的状态，可以管理自己的任务。

### 功能要求

1. **任务管理面板位置**：右侧面板的新标签页 "任务管理"

2. **任务分类**：
   - 进行中
   - 已完成
   - 已放弃

3. **任务显示内容**：
   - 任务名称
   - 任务描述（可选，悬停显示）
   - 状态
   - 进度（百分比或步骤数）
   - 创建时间
   - 最后更新时间

4. **任务列表布局**：
   ```
   ┌─────────────────────────────┐
   │ [进行中] [已完成] [已放弃]   │
   ├─────────────────────────────┤
   │ 📋 开发 ClawDesk 桌面应用    │
   │    进度：45% | 2小时前       │
   │    [继续] [详情] [放弃]      │
   ├─────────────────────────────┤
   │ 📋 优化 Excel 公式助手       │
   │    进度：80% | 1天前         │
   │    [继续] [详情] [放弃]      │
   └─────────────────────────────┘
   ```

5. **操作功能**：
   - 继续：切换到该任务的会话
   - 详情：展开任务详情面板
   - 放弃：将任务标记为"已放弃"

6. **任务详情面板**：
   ```
   ┌─────────────────────────────┐
   │ 📋 任务详情                  │
   │                             │
   │ 名称：开发 ClawDesk 桌面应用 │
   │ 状态：进行中                 │
   │ 进度：45%                    │
   │ 创建：2026-04-05 10:00       │
   │ 更新：2026-04-05 14:30       │
   │                             │
   │ 已完成步骤：                 │
   │ ✓ 搭建项目框架               │
   │ ✓ 实现服务管理模块           │
   │                             │
   │ 待完成步骤：                 │
   │ ○ 实现角色切换功能           │
   │ ○ 实现任务进度可视化         │
   │                             │
   │ 输出文件：                   │
   │ 📄 package.json             │
   │ 📄 src/App.vue              │
   │                             │
   │ [关闭]                      │
   └─────────────────────────────┘
   ```

7. **空状态提示**：
   - 进行中为空：显示"暂无进行中的任务"
   - 已完成为空：显示"暂无已完成的任务"

### 技术方案

1. **扩展 TaskStore**：
   ```typescript
   interface Task {
     id: string
     name: string
     description: string
     status: 'active' | 'completed' | 'abandoned'
     progress: number
     steps: TaskStep[]
     outputFiles: string[]
     createdAt: number
     updatedAt: number
   }
   
   interface TaskState {
     tasks: Task[]
     currentTaskId: string | null
     activeTab: 'active' | 'completed' | 'abandoned'
   }
   
   // 方法
   getTasksByStatus(status: string): Task[]
   continueTask(id: string): void
   abandonTask(id: string): void
   getTaskDetail(id: string): Task
   ```

2. **本地持久化**：
   - 任务列表保存到 localStorage
   - 或使用 Tauri fs API 保存到文件

3. **与检查点系统集成**：
   - 读取 `~/.openclaw/workspace/tasks/` 目录下的检查点文件
   - 解析并显示任务状态

4. **UI 组件**：
   - 使用 Naive UI 的 `n-tabs` 切换分类
   - 使用 `n-list` 显示任务列表
   - 使用 `n-modal` 显示任务详情

### 验收标准

- [ ] 任务管理面板正确显示任务列表
- [ ] 任务按状态分类显示
- [ ] 可以查看任务详情
- [ ] 可以放弃任务
- [ ] 点击"继续"可以切换到任务会话
- [ ] 空状态显示正确提示

### 参考文件

- `src/components/panels/` - 创建 `TaskManagerPanel.vue`
- `src/stores/task.ts` - 任务状态管理
- `src/components/panels/TaskPanel.vue` - 任务进度面板（参考）

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
   - `feat(req-003): 实现 Gateway 服务重启`
   - `feat(req-005): 实现端口配置功能`
   - `feat(req-006): 实现日志面板`
   - `feat(req-017): 实现任务列表管理`

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
