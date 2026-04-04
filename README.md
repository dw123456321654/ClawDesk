# ClawDesk - OpenClaw 桌面伴侣

**版本：** v0.1.0  
**状态：** 需求阶段  

---

## 项目简介

ClawDesk 是 OpenClaw 的桌面客户端，旨在降低 OpenClaw 的使用门槛，提供直观的服务管理和任务监控功能。

## 核心功能

- 🖥️ **服务管理**：一键启动/停止/重启 Gateway 服务
- 🌐 **全面中文化**：界面全中文，内置功能说明
- 🤖 **角色系统**：角色显示、手动切换、个性化配置
- 📊 **任务监控**：上下文监控、进度可视化、异常提示
- 💾 **任务持久化**：检查点机制、中断恢复、任务列表
- 💬 **会话管理**：多会话、历史记录、会话切换

## 技术栈

| 层级 | 技术选型 |
|------|---------|
| 桌面框架 | Tauri 2.x + Rust |
| 前端框架 | Vue 3 + TypeScript |
| UI 组件库 | Naive UI |
| 构建工具 | Vite |
| 状态管理 | Pinia |

## 文件结构

```
ClawDesk/
├── docs/                   # 项目文档
│   ├── prd/               # 产品需求文档
│   ├── design/            # 设计文档
│   ├── project/           # 项目管理文档
│   └── development/       # 开发相关文档
├── src/                    # 前端源代码
│   ├── main.ts            # 入口文件
│   ├── App.vue            # 根组件
│   ├── router/            # 路由配置
│   ├── stores/            # 状态管理
│   ├── views/             # 页面组件
│   ├── components/        # 通用组件
│   ├── layouts/           # 布局组件
│   └── styles/            # 样式文件
├── src-tauri/              # Tauri Rust 代码
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs
│   ├── tauri.conf.json
│   └── Cargo.toml
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 开发进度

- [x] 需求阶段：100% ✅
- [x] 规划阶段：100% ✅
- [x] 设计阶段：100% ✅
- [x] 开发阶段：35% 🔄 框架+服务管理+检查点系统完成
- [ ] 测试阶段：0% ⏸️
- [ ] 交付阶段：0% ⏸️

## 文档索引

- [需求文档](docs/prd/需求文档.md)
- [项目计划](docs/project/项目计划.md)
- [风险评估报告](docs/project/风险评估报告.md)
- [技术选型报告](docs/design/技术选型报告.md)
- [架构设计文档](docs/design/架构设计文档.md)
- [UI设计文档](docs/design/UI设计文档.md)

---

**创建时间：** 2026-04-04  
**创建人：** 产品经理
