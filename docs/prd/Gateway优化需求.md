# Gateway 优化需求文档

**文档版本：** v1.0.0  
**创建日期：** 2026-04-08  
**创建人：** 开发团队  
**项目名称：** ClawDesk - OpenClaw 桌面伴侣  
**参考源码：** [OpenClaw UI](https://github.com/openclaw/openclaw/tree/main/ui/src/ui)

---

## 一、优化背景

通过学习 OpenClaw 官方 UI 源码（`gateway.ts`, `app-chat.ts` 等），发现 ClawDesk 当前的 Gateway 客户端实现存在以下可优化点：

1. 缺少自动重连机制
2. 缺少消息序列号跳跃检测
3. 缺少心跳监控
4. 消息队列机制不完善
5. Slash 命令支持不完整
6. 不支持文件附件
7. 请求 ID 生成方式简单
8. 缺少可信端点检查
9. 缺少错误恢复建议解析
10. hello-ok 解析不完整

---

## 二、优化需求总览

| # | 需求ID | 功能名称 | 优先级 | 状态 | 预估工时 | 完成日期 |
|---|--------|----------|--------|------|----------|----------|
| 1 | OPT-001 | 自动重连（Backoff） | P0 | ✅ 已完成 | 2h | 2026-04-08 |
| 2 | OPT-002 | Gap 检测 | P1 | ⏸️ 未开始 | 1.5h | - |
| 3 | OPT-003 | Tick Watch 心跳 | P1 | ⏸️ 未开始 | 1h | - |
| 4 | OPT-004 | 消息队列增强 | P2 | ⏸️ 未开始 | 2h | - |
| 5 | OPT-005 | Slash 命令增强 | P2 | ⏸️ 未开始 | 1.5h | - |
| 6 | OPT-006 | 聊天附件支持 | P3 | ⏸️ 未开始 | 3h | - |
| 7 | OPT-007 | UUID 请求 ID | P3 | ⏸️ 未开始 | 0.5h | - |
| 8 | OPT-008 | 可信端点检查 | P2 | ⏸️ 未开始 | 0.5h | - |
| 9 | OPT-009 | 错误恢复建议解析 | P2 | ⏸️ 未开始 | 1h | - |
| 10 | OPT-010 | hello-ok 完整解析 | P2 | ⏸️ 未开始 | 1h | - |

**状态说明：**
- ⏸️ 未开始
- 🔄 进行中
- ✅ 已完成
- ❌ 已取消

---

## 三、详细需求说明

---

### OPT-001 自动重连（Backoff）

**优先级：** P0  
**状态：** ✅ 已完成  
**预估工时：** 2h

#### 3.1.1 功能描述

当 WebSocket 连接断开时，自动尝试重连，使用指数退避算法避免频繁重连。

#### 3.1.2 官方实现（参考）

```typescript
// 官方 gateway.ts
private scheduleReconnect() {
  if (this.closed) {
    return;
  }
  const delay = this.backoffMs;
  this.backoffMs = Math.min(this.backoffMs * 1.7, 15_000);
  window.setTimeout(() => this.connect(), delay);
}
```

**退避策略：**
- 初始延迟：800ms
- 增长因子：1.7
- 最大延迟：15,000ms（15秒）
- 退避序列：800 → 1360 → 2312 → 3930 → 6681 → 11358 → 15000（封顶）

#### 3.1.3 技术方案

**修改文件：** `src/utils/gateway.ts`

**新增属性：**
```typescript
private closed = false              // 是否已主动关闭
private backoffMs = 800            // 当前退避延迟
private reconnectTimer: number | null = null  // 重连定时器
```

**新增方法：**
```typescript
/**
 * 自动重连（指数退避）
 */
private scheduleReconnect() {
  if (this.closed) return
  
  const delay = this.backoffMs
  this.backoffMs = Math.min(this.backoffMs * 1.7, 15000)
  
  console.log(`[Gateway] Reconnecting in ${delay}ms...`)
  this.reconnectTimer = window.setTimeout(() => {
    void this.connect()
  }, delay)
}

/**
 * 停止客户端（不再重连）
 */
stop() {
  this.closed = true
  if (this.reconnectTimer) {
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }
  this.ws?.close()
  this.ws = null
}
```

**修改 onclose 处理：**
```typescript
this.ws.onclose = (event) => {
  console.log('[Gateway] WebSocket closed:', event.code, event.reason)
  clearTimeout(connectTimeout)
  this.connected = false
  this.onStatusChange?.('disconnected')
  
  // 非主动关闭时自动重连
  if (!this.closed) {
    this.scheduleReconnect()
  }
}
```

**连接成功时重置退避：**
```typescript
if (!this.connected) {
  // ...连接成功逻辑
  this.backoffMs = 800  // 重置退避延迟
}
```

#### 3.1.4 验收标准

- [x] WebSocket 断开后自动重连
- [x] 重连延迟按指数退避（800ms → 15s）
- [x] 连接成功后重置退避延迟
- [x] 调用 stop() 后不再重连
- [x] 界面显示重连状态

#### 3.1.5 完成记录

| 日期 | 完成内容 | 备注 |
|------|----------|------|
| 2026-04-08 | 添加 closed, backoffMs, reconnectTimer 属性 | - |
| 2026-04-08 | 实现 scheduleReconnect() 指数退避重连 | 800ms → 15s |
| 2026-04-08 | 实现 stop() 方法停止重连 | - |
| 2026-04-08 | 修改 onclose 触发自动重连 | - |
| 2026-04-08 | 连接成功时重置 backoffMs | - |

---

### OPT-002 Gap 检测

**优先级：** P1  
**状态：** ⏸️ 未开始  
**预估工时：** 1.5h

#### 3.2.1 功能描述

追踪事件序列号（seq），检测消息跳跃，判断是否丢失消息。

#### 3.2.2 官方实现（参考）

```typescript
// 官方 gateway.ts
export type GatewayEventFrame = {
  type: "event";
  event: string;
  payload?: unknown;
  seq?: number;  // 序列号
  stateVersion?: { presence: number; health: number };
};

// 在 handleMessage 中
const seq = typeof evt.seq === "number" ? evt.seq : null;
if (seq !== null) {
  if (this.lastSeq !== null && seq > this.lastSeq + 1) {
    this.opts.onGap?.({ expected: this.lastSeq + 1, received: seq });
  }
  this.lastSeq = seq;
}
```

#### 3.2.3 技术方案

**修改文件：** `src/utils/gateway.ts`

**新增属性：**
```typescript
private lastSeq: number | null = null  // 上一个序列号
```

**新增回调：**
```typescript
onGap?: (info: { expected: number; received: number }) => void
```

**修改事件处理：**
```typescript
if (msg.type === 'event') {
  const evt = msg as GatewayEventFrame
  
  // Gap 检测
  const seq = typeof evt.seq === 'number' ? evt.seq : null
  if (seq !== null) {
    if (this.lastSeq !== null && seq > this.lastSeq + 1) {
      console.warn(`[Gateway] Gap detected: expected ${this.lastSeq + 1}, got ${seq}`)
      this.onGap?.({ expected: this.lastSeq + 1, received: seq })
    }
    this.lastSeq = seq
  }
  
  // ...其他事件处理
}
```

**Gap 响应策略：**
1. 记录警告日志
2. 触发 onGap 回调
3. 可选：请求重新同步消息

#### 3.2.4 验收标准

- [ ] 追踪事件序列号
- [ ] 检测到序列号跳跃时触发 onGap
- [ ] 记录警告日志
- [ ] UI 可选显示提示

#### 3.2.5 完成记录

| 日期 | 完成内容 | 备注 |
|------|----------|------|
| - | - | - |

---

### OPT-003 Tick Watch 心跳

**优先级：** P1  
**状态：** ⏸️ 未开始  
**预估工时：** 1h

#### 3.3.1 功能描述

从 hello-ok 获取心跳间隔，定期发送心跳检测连接健康。

#### 3.3.2 官方实现（参考）

```typescript
// hello-ok 中包含 policy
export type GatewayHelloOk = {
  // ...
  policy?: { tickIntervalMs?: number };
};
```

#### 3.3.3 技术方案

**修改文件：** `src/utils/gateway.ts`

**新增属性：**
```typescript
private tickIntervalMs = 30000        // 心跳间隔（默认30秒）
private tickTimer: number | null = null  // 心跳定时器
```

**解析 hello-ok：**
```typescript
if (!this.connected) {
  // ...连接成功逻辑
  
  // 解析心跳间隔
  const payload = msg.payload as { policy?: { tickIntervalMs?: number } }
  if (payload?.policy?.tickIntervalMs) {
    this.tickIntervalMs = payload.policy.tickIntervalMs
    console.log('[Gateway] Tick interval:', this.tickIntervalMs)
  }
  
  // 启动心跳
  this.startTickWatch()
}
```

**心跳方法：**
```typescript
/**
 * 启动心跳监控
 */
private startTickWatch() {
  this.stopTickWatch()
  
  this.tickTimer = window.setInterval(() => {
    if (this.isConnected()) {
      // 发送 ping 或检查连接状态
      console.log('[Gateway] Tick...')
    }
  }, this.tickIntervalMs)
}

/**
 * 停止心跳监控
 */
private stopTickWatch() {
  if (this.tickTimer) {
    clearInterval(this.tickTimer)
    this.tickTimer = null
  }
}
```

#### 3.3.4 验收标准

- [ ] 从 hello-ok 解析 tickIntervalMs
- [ ] 定期发送心跳
- [ ] 连接断开时停止心跳
- [ ] 默认 30 秒间隔

#### 3.3.5 完成记录

| 日期 | 完成内容 | 备注 |
|------|----------|------|
| - | - | - |

---

### OPT-004 消息队列增强

**优先级：** P2  
**状态：** ⏸️ 未开始  
**预估工时：** 2h

#### 3.4.1 功能描述

完善消息排队机制，发送时如果忙则入队，空闲时自动 flush。

#### 3.4.2 官方实现（参考）

```typescript
// 官方 app-chat.ts
type ChatQueueItem = {
  id: string;
  text: string;
  createdAt: number;
  attachments?: ChatAttachment[];
  pendingRunId?: string;
  refreshSessions?: boolean;
};

// 忙时入队
if (isChatBusy(host)) {
  enqueueChatMessage(host, message, attachmentsToSend, refreshSessions);
  return;
}

// 空闲时自动 flush
if (ok && !host.chatRunId) {
  void flushChatQueue(host);
}
```

#### 3.4.3 技术方案

**修改文件：** `src/stores/chat.ts`, `src/components/panels/ChatPanel.vue`

**新增状态：**
```typescript
// chat.ts
chatQueue: ChatQueueItem[] = []
chatSending = false
chatRunId: string | null = null
```

**入队逻辑：**
```typescript
function enqueueMessage(text: string, attachments?: ChatAttachment[]) {
  if (!text.trim() && !attachments?.length) return
  
  chatStore.chatQueue.push({
    id: generateUUID(),
    text: text.trim(),
    createdAt: Date.now(),
    attachments
  })
}
```

**Flush 逻辑：**
```typescript
async function flushChatQueue() {
  if (!isConnected.value || isChatBusy()) return
  
  const next = chatStore.chatQueue.shift()
  if (!next) return
  
  try {
    await sendMessageNow(next.text, next.attachments)
    // 继续处理队列
    if (chatStore.chatQueue.length > 0) {
      void flushChatQueue()
    }
  } catch (error) {
    // 失败时重新入队
    chatStore.chatQueue.unshift(next)
  }
}
```

#### 3.4.4 验收标准

- [ ] 忙时消息自动入队
- [ ] 空闲时自动处理队列
- [ ] 队列持久化（可选）
- [ ] UI 显示队列状态

#### 3.4.5 完成记录

| 日期 | 完成内容 | 备注 |
|------|----------|------|
| - | - | - |

---

### OPT-005 Slash 命令增强

**优先级：** P2  
**状态：** ⏸️ 未开始  
**预估工时：** 1.5h

#### 3.5.1 功能描述

增强本地 Slash 命令支持。

#### 3.5.2 官方实现（参考）

```typescript
// 官方支持的本地命令
/stop     - 中止当前任务
/new      - 新开会话
/reset    - 重置会话
/clear    - 清空历史
/focus    - 切换专注模式
/status   - 显示状态
/model    - 切换模型
/compact  - 压缩上下文
```

#### 3.5.3 技术方案

**修改文件：** `src/components/panels/ChatPanel.vue`

**命令解析：**
```typescript
function parseSlashCommand(text: string): { command: string; args: string } | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith('/')) return null
  
  const parts = trimmed.slice(1).split(' ')
  return {
    command: parts[0].toLowerCase(),
    args: parts.slice(1).join(' ')
  }
}
```

**命令处理：**
```typescript
async function handleSlashCommand(cmd: string, args: string) {
  switch (cmd) {
    case 'stop':
      await abortChat()
      break
    case 'new':
      chatStore.createSession()
      break
    case 'clear':
      await chatStore.clearHistory()
      break
    case 'status':
      showStatusCard()
      break
    case 'model':
      await switchModel(args)
      break
    // ...
  }
}
```

#### 3.5.4 验收标准

- [ ] 支持 /stop, /new, /reset, /clear, /status
- [ ] 支持 /model 切换
- [ ] 支持 /compact 压缩
- [ ] 未知命令提示

#### 3.5.5 完成记录

| 日期 | 完成内容 | 备注 |
|------|----------|------|
| - | - | - |

---

### OPT-006 聊天附件支持

**优先级：** P3  
**状态：** ⏸️ 未开始  
**预估工时：** 3h

#### 3.6.1 功能描述

支持发送文件附件（图片、文档等）。

#### 3.6.2 技术方案

**新增类型：**
```typescript
interface ChatAttachment {
  id: string
  type: 'image' | 'document' | 'file'
  name: string
  mimeType: string
  size: number
  url?: string        // 本地 URL
  base64?: string     // Base64 数据
}
```

**UI 组件：**
- 文件选择按钮
- 附件预览列表
- 删除附件按钮

#### 3.6.3 验收标准

- [ ] 支持选择文件
- [ ] 支持图片预览
- [ ] 支持发送附件
- [ ] 附件大小限制

#### 3.6.4 完成记录

| 日期 | 完成内容 | 备注 |
|------|----------|------|
| - | - | - |

---

### OPT-007 UUID 请求 ID

**优先级：** P3  
**状态：** ⏸️ 未开始  
**预估工时：** 0.5h

#### 3.7.1 功能描述

使用 UUID 替代时间戳+计数器生成请求 ID。

#### 3.7.2 官方实现（参考）

```typescript
// 官方 uuid.ts
export function generateUUID(): string {
  return crypto.randomUUID();
}
```

#### 3.7.3 技术方案

**修改文件：** `src/utils/gateway.ts`

```typescript
private nextId(): string {
  return crypto.randomUUID()
}
```

#### 3.7.4 验收标准

- [ ] 使用 crypto.randomUUID()
- [ ] 请求 ID 格式为标准 UUID

#### 3.7.5 完成记录

| 日期 | 完成内容 | 备注 |
|------|----------|------|
| - | - | - |

---

### OPT-008 可信端点检查

**优先级：** P2  
**状态：** ⏸️ 未开始  
**预估工时：** 0.5h

#### 3.8.1 功能描述

检查当前连接是否为可信端点（localhost 或同源），决定是否尝试 device token 重试。

#### 3.8.2 官方实现（参考）

```typescript
// 官方 gateway.ts
function isTrustedRetryEndpoint(url: string): boolean {
  try {
    const gatewayUrl = new URL(url, window.location.href);
    const host = gatewayUrl.hostname.toLowerCase();
    
    // localhost 相关
    if (host === "localhost" || host === "::1" || host === "[::1]" || host === "127.0.0.1") {
      return true;
    }
    // 127.x.x.x
    if (host.startsWith("127.")) {
      return true;
    }
    // 同源
    const pageUrl = new URL(window.location.href);
    return gatewayUrl.host === pageUrl.host;
  } catch {
    return false;
  }
}
```

#### 3.8.3 技术方案

**修改文件：** `src/utils/gateway.ts`

```typescript
/**
 * 检查是否为可信端点
 */
private isTrustedEndpoint(): boolean {
  try {
    const url = new URL(this.url)
    const host = url.hostname.toLowerCase()
    
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return true
    }
    if (host.startsWith('127.')) {
      return true
    }
    
    return false
  } catch {
    return false
  }
}
```

**使用场景：**
```typescript
// 只在可信端点尝试 device token 重试
if (this.isTrustedEndpoint() && !this.deviceTokenRetryBudgetUsed) {
  // ...重试逻辑
}
```

#### 3.8.4 验收标准

- [ ] 识别 localhost 和 127.x.x.x
- [ ] 非 Trusted 端点不尝试 token 重试
- [ ] 记录检查结果

#### 3.8.5 完成记录

| 日期 | 完成内容 | 备注 |
|------|----------|------|
| - | - | - |

---

### OPT-009 错误恢复建议解析

**优先级：** P2  
**状态：** ⏸️ 未开始  
**预估工时：** 1h

#### 3.9.1 功能描述

解析错误响应中的 `recommendedNextStep` 字段，自动采取恢复策略。

#### 3.9.2 官方实现（参考）

```typescript
// 官方 gateway.ts
const recoveryAdvice = err instanceof GatewayRequestError 
  ? readConnectErrorRecoveryAdvice(err.details) 
  : {};

const retryWithDeviceTokenRecommended =
  recoveryAdvice.recommendedNextStep === "retry_with_device_token";
```

#### 3.9.3 技术方案

**错误响应格式：**
```typescript
interface GatewayError {
  code: string
  message: string
  details?: {
    code?: string
    recommendedNextStep?: 'retry_with_device_token' | 'reconnect' | 'refresh' | string
    canRetryWithDeviceToken?: boolean
  }
}
```

**解析方法：**
```typescript
private parseRecoveryAdvice(error: GatewayError): {
  recommendedNextStep?: string
  canRetryWithDeviceToken?: boolean
} {
  const details = error.details
  if (!details) return {}
  
  return {
    recommendedNextStep: details.recommendedNextStep,
    canRetryWithDeviceToken: details.canRetryWithDeviceToken
  }
}
```

**自动恢复：**
```typescript
const advice = this.parseRecoveryAdvice(error)

if (advice.recommendedNextStep === 'retry_with_device_token' && this.isTrustedEndpoint()) {
  this.pendingDeviceTokenRetry = true
  // ...
}
```

#### 3.9.4 验收标准

- [ ] 解析 recommendedNextStep
- [ ] 解析 canRetryWithDeviceToken
- [ ] 根据建议自动采取行动

#### 3.9.5 完成记录

| 日期 | 完成内容 | 备注 |
|------|----------|------|
| - | - | - |

---

### OPT-010 hello-ok 完整解析

**优先级：** P2  
**状态：** ⏸️ 未开始  
**预估工时：** 1h

#### 3.10.1 功能描述

完整解析 hello-ok 响应，包括 features, server info, policy 等。

#### 3.10.2 官方实现（参考）

```typescript
export type GatewayHelloOk = {
  type: "hello-ok";
  protocol: number;
  server?: {
    version?: string;
    connId?: string;
  };
  features?: {
    methods?: string[];
    events?: string[];
  };
  snapshot?: unknown;
  auth?: {
    deviceToken?: string;
    role?: string;
    scopes?: string[];
    issuedAtMs?: number;
  };
  policy?: {
    tickIntervalMs?: number;
  };
};
```

#### 3.10.3 技术方案

**修改文件：** `src/utils/gateway.ts`

**新增类型：**
```typescript
interface GatewayHelloOk {
  protocol: number
  server?: {
    version?: string
    connId?: string
  }
  features?: {
    methods?: string[]
    events?: string[]
  }
  auth?: {
    deviceToken?: string
    role?: string
    scopes?: string[]
    issuedAtMs?: number
  }
  policy?: {
    tickIntervalMs?: number
  }
}
```

**存储 hello-ok：**
```typescript
private helloOk: GatewayHelloOk | null = null

// 连接成功时
this.helloOk = msg.payload as GatewayHelloOk
```

**暴露访问方法：**
```typescript
getServerInfo() {
  return this.helloOk?.server
}

getFeatures() {
  return this.helloOk?.features
}

getPolicy() {
  return this.helloOk?.policy
}
```

#### 3.10.4 验收标准

- [ ] 解析 server 信息
- [ ] 解析 features（支持的方法/事件）
- [ ] 解析 policy（心跳间隔等）
- [ ] 提供 getter 方法

#### 3.10.5 完成记录

| 日期 | 完成内容 | 备注 |
|------|----------|------|
| - | - | - |

---

## 四、进度跟踪

### 4.1 总体进度

| 阶段 | 状态 | 完成日期 |
|------|------|----------|
| P0 需求 | ✅ 已完成 | 2026-04-08 |
| P1 需求 | ⏸️ 未开始 | - |
| P2 需求 | ⏸️ 未开始 | - |
| P3 需求 | ⏸️ 未开始 | - |

### 4.2 工时统计

- **预估总工时：** 14h
- **实际工时：** 0.5h
- **完成度：** 10%（1/10）

---

## 五、更新日志

| 日期 | 版本 | 更新内容 | 更新人 |
|------|------|----------|--------|
| 2026-04-08 | v1.0.0 | 创建文档，定义 10 个优化需求 | 开发团队 |
| 2026-04-08 | v1.1.0 | 完成 OPT-001 自动重连 | 开发团队 |

---

## 六、参考资源

- [OpenClaw UI 源码](https://github.com/openclaw/openclaw/tree/main/ui/src/ui)
- `gateway.ts` - Gateway 客户端实现
- `app-chat.ts` - 聊天应用逻辑
- `device-auth.ts` - 设备认证存储
- `device-identity.ts` - 设备身份管理
