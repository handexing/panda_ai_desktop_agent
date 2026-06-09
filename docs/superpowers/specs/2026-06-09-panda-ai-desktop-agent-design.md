# Panda AI Desktop Agent — 设计文档 (V1.7)

## 一、产品定位

Panda AI 是一款常驻桌面的 Personal AI Agent。采用 `Tauri 2 (Rust) + React` 架构，所有重型推理能力完全托管于用户自定义配置的云端 API（Bring Your Own Key）。产品通过分阶段、精细化的依赖控制，在第一阶段实现 ~30MB 的极轻量常驻，后续逐步平滑演进为用户的第二大脑与个人工作流引擎。

## 二、技术架构

### 2.1 总体架构

```
Panda UI (React + Tailwind + Framer Motion)
       │ (Tauri IPC Bridge)
Panda Backend (纯 Rust 核心进程)
       ├── Agent Orchestrator (纯 Rust 状态机，P3 引入)
       ├── Local Storage (SQLite(Diesel) + LanceDB(P2引入))
       └── MCP Client (P3 引入)
               │ (HTTPS)
       用户自定义云端 API (DeepSeek / OpenAI / 硅基流动等)
```

### 2.2 演进式依赖控制

| Phase | 依赖 | 体积 |
|-------|------|------|
| P1 | Tauri 2 + Diesel + reqwest + tokio | ~30MB |
| P2 | + LanceDB (Rust SDK) | ~55MB |
| P3 | + Rust State Machine + EdgeTTS | ~60MB |

通过 Cargo feature flag 实现编译隔离：

```toml
[features]
default = []
p2-knowledge = ["lancedb"]
p3-agent = ["p2-knowledge"]
```

### 2.3 项目结构

```
panda-ai-desktop-agent/
├── src/                          # React 前端
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── panda/               # 桌宠渲染 (APNG/Sprite Sheet)
│   │   ├── chat/                # 聊天面板 (Overlay)
│   │   ├── config/              # API 配置面板
│   │   ├── history/             # 对话历史
│   │   ├── knowledge/           # 知识库管理 [P2]
│   │   └── trace/               # Agent 步骤条 [P3]
│   ├── stores/                   # Zustand
│   └── hooks/
│
├── src-tauri/                    # 标准 Tauri 单 crate + 模块
│   ├── Cargo.toml                # feature flags 控制依赖
│   ├── tauri.conf.json
│   ├── capabilities/
│   ├── build.rs
│   ├── migrations/               # Diesel 迁移文件
│   ├── src/
│   │   ├── main.rs               # Tauri 入口
│   │   ├── lib.rs                # Tauri setup + command 注册
│   │   ├── api/                  # API 路由 & 流式 HTTP 客户端
│   │   ├── config/               # API Key / Base URL 管理
│   │   ├── db/                   # Diesel models, schema, repository
│   │   ├── parser/               # 文件解析 (PDF/TXT/MD)
│   │   ├── lancedb/              # [P2] LanceDB 封装
│   │   ├── agent/                # [P3] 状态机引擎
│   │   ├── mcp/                  # [P3] MCP 客户端
│   │   └── memory/               # [P3] 长期记忆提取
│   └── icons/
│
├── public/
├── index.html
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

## 三、分阶段设计

### 3.1 Phase 1：极致 MVP (~30MB)

**核心目标**：跑通 Tauri 2 透明窗口，上线 API 配置，实现极低内存常驻的完整文本聊天闭环。

#### 后端模块

**Diesel 表结构（P1）：**

```sql
CREATE TABLE settings (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

CREATE TABLE conversations (
    id         TEXT PRIMARY KEY NOT NULL,
    title      TEXT NOT NULL DEFAULT '新对话',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id              TEXT PRIMARY KEY NOT NULL,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**IPC Command 定义：**

```rust
// API 配置
#[tauri::command] async fn get_config(key: String) -> Result<Option<String>>
#[tauri::command] async fn set_config(key: String, value: String) -> Result<()>
#[tauri::command] async fn test_api_connection(base_url: String, api_key: String, model: String) -> Result<bool>

// 对话管理
#[tauri::command] async fn list_conversations() -> Result<Vec<Conversation>>
#[tauri::command] async fn create_conversation(title: String) -> Result<Conversation>
#[tauri::command] async fn get_messages(conversation_id: String) -> Result<Vec<Message>>
#[tauri::command] async fn delete_conversation(id: String) -> Result<()>

// 流式聊天 (通过 Tauri Event emit 推送)
#[tauri::command] async fn stream_chat(conversation_id: String, message: String) -> Result<()>
// Events: "chat:token", "chat:done", "chat:error"

// 文件解析
#[tauri::command] async fn extract_file_text(file_path: String) -> Result<String>
```

**流式聊天数据流：**
```
用户输入 → invoke("stream_chat")
  → Rust 存用户消息到 SQLite
  → Rust 加载历史消息
  → Rust 调用 LLM API (stream=true)
  → Rust emit("chat:token", token) 逐 token 推前端
  → 流结束 emit("chat:done") → Rust 存完整回复
```

#### 前端模块

**桌宠窗口：**
- 单 Tauri 窗口，无边框透明，Always on Top
- Sprite Sheet 动画渲染（Idle / Thinking / Error）
- 左键单击展开/折叠聊天 Overlay
- 右键菜单（新对话/配置/退出）
- 文件拖拽到桌宠触发解析

**聊天面板（Overlay 模式）：**
- 桌宠窗口内展开，覆盖桌宠上方
- 消息列表 + 输入框 + 发送
- 流式逐字渲染（Tauri Events → Zustand Store → React）
- 对话历史列表（侧拉或弹窗）

**状态管理（Zustand）：**
```typescript
interface PandaStore {
  pandaState: 'idle' | 'thinking' | 'error';
  chatOpen: boolean;
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  streamingText: string;
  isStreaming: boolean;
}
```

**动画映射：**
| 动画 | 触发 | 循环 |
|------|------|------|
| idle | 无任务 | 循环 |
| thinking | API 请求中 | 循环 |
| error | API 超时/Key 失效 → 3s 后回 idle | 播放一次 |

### 3.2 Phase 2：知识库与视觉 (~55MB)

**核心目标**：激活 LanceDB，实现知识管理与多模态。

**新增模块：**
- `lancedb/` — LanceDB 初始化、文本切片、批量导入、混合检索
- Embedding API 配置扩展（embedding_api_key / embedding_base_url / embedding_model）

**核心数据流：**
```
文件拖入 → Rust 提取文本 → Text Splitter 切片
  → 调用 Embedding API → 向量写入 LanceDB → 搜索时混合检索注入 Prompt
```

**Vision：**
- 拖拽图片/截图 → Base64 → 云端多模态 API → 流式回答

**动画扩展：** 新增 `executing`（翻书/检索中）

### 3.3 Phase 3：Agent 跃迁 (~60MB)

**核心目标**：纯 Rust 状态机 + MCP 生态 + 长期记忆 + 语音。

**Agent 状态机核心循环：**
```
Plan (LLM function calling → tool_calls JSON)
  → Execute (Rust 调用 MCP 工具)
    → Observe (收集结果，还 LLM 继续)
      → 直到 LLM 判断任务完成 → Finish
```

**MCP 客户端：**
- JSON-RPC over stdio transport
- 支持标准 MCP server（filesystem、browser、calendar、notion 等）
- 用户通过配置面板管理 MCP server

**长期记忆：**
- 对话结束闲时批处理提取
- LLM 单次调用提炼用户画像 → SQLite 存储
- 每次聊天时注入 System Prompt

**语音：**
- ASR: Web Speech API（浏览器内置，零依赖）
- TTS: EdgeTTS（微软 REST API，无需 Key）

**Trace UI：**
- 前端步骤条，实时展示 Agent 执行进度

### 3.4 Phase 4：终极形态

- SQLite 图谱可视化（知识/人物关系拓扑图）
- 系统级主动助手（时间/日程提醒）
- Computer Use（受控环境模拟鼠标键盘）

## 四、关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| Agent Runtime | 纯 Rust 状态机 | 零额外运行时依赖，Cargo 编译隔离 |
| ORM | Diesel (同步 + r2d2 连接池) | 编译期类型检查，成熟稳定 |
| 向量库 | LanceDB | 嵌入式，纯 Rust SDK，无需独立服务 |
| 知识图谱 | SQLite 关系表模拟 | 避免嵌入重型图数据库 |
| 动画格式 | APNG / Sprite Sheet | 用户提供资源，前端 Canvas 渲染 |
| 语音 ASR | Web Speech API | 浏览器内置，零依赖零体积 |
| 语音 TTS | EdgeTTS (REST API) | 免费，无需 Key，HTTP 调用即可 |
| 聊天窗口 | 单窗口 Overlay 模式 | 桌宠为主，交互直觉，管理简单 |
| 跨平台 | macOS + Windows 同步 | Tauri 2 天然跨平台 |

## 五、未决问题

- P3 阶段不同厂商 LLM 的 Function Calling 格式差异需要 adapter 层
- EdgeTTS 在中国大陆网络的可用性（P3 阶段才涉及）
- P4 Computer Use 的安全授权模型（用户权限弹窗、白名单等）
