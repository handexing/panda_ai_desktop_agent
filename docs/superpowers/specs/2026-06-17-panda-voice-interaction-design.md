# Panda AI 语音交互优化设计方案

## 概述

优化 Panda AI 桌面助手的语音交互流程，解决当前"不能直接和宠物对话"的问题。核心目标：**双击熊猫 → 直接说话 → 自动理解 → 语音回复**，全程在熊猫悬浮窗完成，无需打开聊天窗口。

## 交互模型

### 手势定义

| 操作 | 行为 | 说明 |
|------|------|------|
| 单击熊猫 | 萌系随机反馈 | 已有行为，保留 |
| **双击熊猫** | **进入/退出语音对话模式** | **新增，核心入口** |
| 说话中双击 | 打断当前播报，重新聆听 | 新增 |
| 右键/长按 | 打开环形菜单 | 已有行为，保留 |
| Option+Space | 全局快捷键唤醒语音对话 | 新增 |
| Escape | 取消当前语音/播报，回到 idle | 新增 |

### 一次完整对话流程

1. **双击熊猫** → 进入聆听状态（熊猫耳朵竖起，显示"我在听~"气泡）
2. **用户说话** → VAD 检测到语音 → 进入录音状态（声波动画 + 实时转写文字显示在气泡中）
3. **停顿 600ms** → 自动截断 → 送至 STT 引擎
4. **熊猫转为"思考中"** → Agent 流式生成回复
5. **回复文字实时显示在气泡**（打字机效果） + TTS 流式语音播报（熊猫张嘴说话动画）
6. **播报结束** → 自动回到 idle。用户可随时双击打断

## 状态管理

### 新增/修改的 PandaState

| 状态 | 说明 | 动画 | 气泡 |
|------|------|------|------|
| `listening` | 等待语音输入 | 耳朵竖起/脉冲环 | "我在听~ 🎤" |
| `recording` | 正在录音 | 声波动画 | 实时转写文字（逐字追加） |
| `talking` | TTS 播报中 | 张嘴说话动画 | AI 回复文字（打字机效果） |

### 状态流转

```
idle ──双击──→ listening ──VAD检测人声──→ recording
recording ──停顿600ms──→ thinking (已有)
thinking ──流式输出──→ talking (TTS播报)
talking ──播报结束──→ idle
talking/thinking ──双击──→ listening (打断重来)
任何状态 ──Escape──→ idle
```

## 用户界面变更

### PandaWindow.tsx
- 双击检测：替换当前单击逻辑，单击保留互动、双击触发语音
- 引入 `useVoiceChat` hook 管理语音对话生命周期
- 在 PandaSprite 外包裹 VoiceWave 声波动画组件

### PetSpeechBubble.tsx
- 支持三种气泡模式：互动文本（现有）、转写文本（实时更新）、AI 回复（打字机效果）
- 自适应宽度，支持长文本

### VoiceWave.tsx（新组件）
- listening 状态：缓慢脉冲光圈
- recording 状态：根据音频能量动态波动的光圈
- talking 状态：平缓呼吸光效

## 后端架构

### 新增 Tauri Command: `voice_chat`

全自动语音对话链路，单次调用完成"录音 → VAD → STT → Agent → TTS 流式播放"：

```
┌─────────────────────────────────────────────────────────┐
│ voice_chat (Rust / Tokio 异步)                          │
│                                                         │
│  cpal(麦克风) ──→ VAD检测(Silero-VAD/能量检测) ──→ 录音缓冲  │
│       ↑                               ↓                 │
│       │                          STT引擎                │
│       │                               ↓                 │
│       │                          Agent推理               │
│       │                               ↓                 │
│       │                   流式文本缓冲 ──→ TTS引擎         │
│       │                               ↓                 │
│       └──────── 打断信号 ───────── rodio播放队列           │
│                                                         │
│  通过 Tauri Events 实时推送前端状态:                      │
│  - voice:transcript (实时转写片段)                       │
│  - voice:reply_token (AI 回复增量)                       │
│  - voice:state (状态变更)                                │
│  - voice:audio_start/audio_end (播报起止)                │
└─────────────────────────────────────────────────────────┘
```

### voice.rs 重构

移除零散的 `start_voice_recording` / `stop_voice_recording`，改为面向语音对话的核心结构：

```rust
pub struct VoiceEngine {
    // 音频参数
    sample_rate: u32,
    // VAD 状态
    vad: Option<VadState>,
    // 打断信号
    interrupt: Arc<AtomicBool>,
    // 录音缓冲
    buffer: Arc<Mutex<Vec<f32>>>,
}

impl VoiceEngine {
    /// 启停录音（被 voice_chat 内部调用）
    fn start_capture(&self) -> Result<()>;
    fn stop_capture(&self) -> Result<Vec<i16>>;

    /// VAD 检测（能量阈值 + 持续静音计时）
    fn detect_speech(&self, samples: &[f32]) -> VadResult;

    /// 完整的语音对话轮次
    async fn chat_turn(&self, app: AppHandle, pool: DbPool) -> Result<()>;
}
```

### VAD 实现策略（第一阶段）

使用**能量检测**而非 Silero-VAD：
- 计算短时能量（每 30ms 帧）
- 阈值自适应（跟踪环境底噪）
- 连续 600ms 低于阈值 → 语音结束
- 优势：零模型依赖，纯数学计算，CPU 消耗极低

第二阶段可替换为 Silero-VAD ONNX 提升准确率。

### 流式 TTS 管道

```
Agent 流式文本 ──→ 断句器(Sentence Splitter) ──→ TTS 请求 ──→ 音频队列 ──→ rodio 播放
                           │                              ↑
                   按。！？\n 断句                  sink.stop() 打断
```

断句策略：
- 累积 Agent 流式输出的 tokens
- 遇到句尾标点（`。！？\n`）或超时（500ms）则形成一个完整的句子
- 立即发送 TTS 请求，不等待全文
- TTS 返回的音频追加到 rodio 播放队列

## 数据流

### 新增 Tauri Events

| Event | Payload | 触发时机 | 消费者 |
|-------|---------|----------|--------|
| `voice:state` | `{ state: "listening" \| "recording" \| "thinking" \| "talking" \| "idle" }` | 状态变更 | PandaWindow |
| `voice:transcript` | `{ text: string, final: boolean }` | STT 中间/最终结果 | PetSpeechBubble |
| `voice:reply_token` | `{ text: string }` | Agent 流式 token | PetSpeechBubble |
| `voice:error` | `{ message: string }` | 出错时 | PandaWindow |

### conversation 管理

语音对话自动使用一个固定的 conversation（`voice_conversation`），无需用户手动创建或切换：
- 首次语音对话时自动创建
- 后续对话追加到同一个 conversation
- 语音对话和文字聊天共享同一后端，用户可在 ChatWindow 中看到完整的语音对话历史

## 实施计划

### 第一阶段：核心链路（3-5天）

1. **重构 voice.rs** — 创建 VoiceEngine，实现录音 + 能量 VAD + 音频缓冲
2. **实现 `voice_chat` command** — 打通录音 → STT → Agent → TTS 自动链路
3. **前端 useVoiceChat hook** — 监听 voice:* events，驱动 UI 状态
4. **PandaWindow 改造** — 双击检测，语音模式切换
5. **PetSpeechBubble 增强** — 转写文字和 AI 回复的气泡显示
6. **VoiceWave 组件** — 声波动画

### 第二阶段：体验打磨（2-3天）

1. 流式 TTS 断句合成（边生成边播放）
2. 打断机制（双击/快捷键中断当前播报）
3. 全局快捷键 Option+Space
4. VAD 参数调优（阈值、截断时间）

### 第三阶段：增强（可选）

1. Silero-VAD 替换能量检测
2. 本地 STT/TTS 模型集成（SenseVoice + Kokoro）
3. 语音唤醒词检测
