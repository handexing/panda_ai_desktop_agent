# Panda AI Desktop Agent Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build ~30MB Tauri 2 desktop pet with API configuration, streaming text chat, single-file analysis, and chat history.

**Architecture:** Single Tauri 2 crate with Diesel (SQLite) for local storage, reqwest for streaming HTTP to user-configured LLM APIs. React frontend renders Sprite Sheet animations via Canvas and streamed chat text via Framer Motion. Chat panel overlays the panda in a single window.

**Tech Stack:** Tauri 2 (Rust), React 18 + TypeScript, Vite, TailwindCSS 3, Zustand, Framer Motion, Diesel 2 (SQLite), reqwest, tokio.

---

## File Structure

```
panda-ai-desktop-agent/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── stores/
│   │   └── pandaStore.ts
│   ├── hooks/
│   │   ├── useChat.ts
│   │   ├── useConfig.ts
│   │   └── useFileDrop.ts
│   ├── components/
│   │   ├── panda/
│   │   │   ├── PandaSprite.tsx
│   │   │   ├── PandaWindow.tsx
│   │   │   ├── PandaOverlay.tsx
│   │   │   └── PandaContextMenu.tsx
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── config/
│   │   │   └── ConfigPanel.tsx
│   │   └── history/
│   │       └── HistoryPanel.tsx
│   └── lib/
│       └── tauri.ts
│
├── src-tauri/
│   ├── Cargo.toml
│   ├── build.rs
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json
│   ├── migrations/
│   │   ├── 001_create_settings/
│   │   │   └── up.sql
│   │   ├── 002_create_conversations/
│   │   │   └── up.sql
│   │   └── 003_create_messages/
│   │       └── up.sql
│   ├── icons/
│   └── src/
│       ├── main.rs
│       ├── lib.rs
│       ├── db/
│       │   ├── mod.rs
│       │   ├── schema.rs
│       │   ├── models.rs
│       │   └── repository.rs
│       ├── api/
│       │   ├── mod.rs
│       │   └── client.rs
│       ├── config/
│       │   └── mod.rs
│       └── parser/
│           ├── mod.rs
│           └── text.rs
```

---

### Task 1: Scaffold Tauri 2 Project

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/icons/` (placeholder)
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs` (minimal, empty run function)
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx` (minimal "Hello Panda")
- Create: `src/App.tsx` (minimal wrapper)
- Create: `src/index.css` (Tailwind directives)
- Create: `.gitignore`

- [ ] **Step 1: Write Rust Cargo.toml**

```toml
[package]
name = "panda-ai-desktop-agent"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.12", features = ["stream"] }
tokio = { version = "1", features = ["full"] }
diesel = { version = "2", features = ["sqlite", "r2d2"] }
diesel_migrations = "2"
r2d2 = "0.4"
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
pdf-extract = "0.7"
anyhow = "1"
log = "0.4"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[features]
default = []
p2-knowledge = ["lancedb"]
p3-agent = ["p2-knowledge"]

[lib]
name = "panda_ai_desktop_agent_lib"
crate-type = ["staticlib", "cdylib", "rlib"]
```

- [ ] **Step 2: Write build.rs**

```rust
fn main() {
    tauri_build::build();
}
```

- [ ] **Step 3: Write src/lib.rs (minimal)**

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Write src/main.rs**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    panda_ai_desktop_agent_lib::run();
}
```

- [ ] **Step 5: Write tauri.conf.json**

```json
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-config-schema/schema.json",
  "productName": "Panda AI",
  "version": "0.1.0",
  "identifier": "com.panda-ai.desktop-agent",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "label": "panda",
        "title": "Panda AI",
        "width": 200,
        "height": 280,
        "center": true,
        "transparent": true,
        "decorations": false,
        "always_on_top": true,
        "resizable": false,
        "skip_taskbar": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

- [ ] **Step 6: Write capabilities/default.json**

```json
{
  "identifier": "default",
  "description": "Default permissions",
  "windows": ["panda"],
  "permissions": [
    "core:default",
    "core:window:default",
    "core:window:allow-set-always-on-top",
    "core:window:allow-set-ignore-cursor-events",
    "core:window:allow-set-size",
    "core:window:allow-set-position",
    "core:window:allow-center",
    "core:window:allow-close",
    "core:window:allow-show",
    "core:window:allow-hide",
    "core:event:default",
    "core:event:allow-listen",
    "core:event:allow-emit"
  ]
}
```

- [ ] **Step 7: Write package.json**

```json
{
  "name": "panda-ai-desktop-agent",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^4.5.0",
    "framer-motion": "^11.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 8: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "useDefineForClassFields": true,
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 9: Write tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 10: Write vite.config.ts**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

- [ ] **Step 11: Write tailwind.config.ts**

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 12: Write postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 13: Write index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Panda AI</title>
  </head>
  <body class="m-0 p-0 overflow-hidden">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 14: Write src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
}
```

- [ ] **Step 15: Write src/main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 16: Write src/App.tsx (minimal placeholder)**

```tsx
function App() {
  return (
    <div className="w-full h-full flex items-center justify-center text-white">
      <p>Panda AI</p>
    </div>
  );
}

export default App;
```

- [ ] **Step 17: Create placeholder icons and .gitignore**

Create minimal placeholder PNG icons in `src-tauri/icons/`. Write `.gitignore`:

```
node_modules/
dist/
target/
.env
*.local
```

- [ ] **Step 18: Verify the scaffold compiles**

Run: `npm install && cargo build -p panda-ai-desktop-agent`  
Expected: npm install succeeds, `cargo build` compiles successfully

- [ ] **Step 19: Commit**

```
git add -A && git commit -m "chore: scaffold Tauri 2 project with React frontend"
```

---

### Task 2: Database Migration Layer

**Files:**
- Create: `src-tauri/migrations/001_create_settings/up.sql`
- Create: `src-tauri/migrations/002_create_conversations/up.sql`
- Create: `src-tauri/migrations/003_create_messages/up.sql`
- Create: `src-tauri/src/db/mod.rs`
- Create: `src-tauri/src/db/schema.rs`
- Create: `src-tauri/src/db/models.rs`

- [ ] **Step 1: Write migration 001_create_settings/up.sql**

```sql
CREATE TABLE settings (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);
```

- [ ] **Step 2: Write migration 002_create_conversations/up.sql**

```sql
CREATE TABLE conversations (
    id         TEXT PRIMARY KEY NOT NULL,
    title      TEXT NOT NULL DEFAULT '新对话',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 3: Write migration 003_create_messages/up.sql**

```sql
CREATE TABLE messages (
    id              TEXT PRIMARY KEY NOT NULL,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 4: Write db/schema.rs (manual Diesel table definitions)**

```rust
use diesel::table;

table! {
    settings (key) {
        key -> Text,
        value -> Text,
    }
}

table! {
    conversations (id) {
        id -> Text,
        title -> Text,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

table! {
    messages (id) {
        id -> Text,
        conversation_id -> Text,
        role -> Text,
        content -> Text,
        created_at -> Timestamp,
    }
}

joinable!(messages -> conversations (conversation_id));
```

- [ ] **Step 5: Write db/models.rs**

```rust
use diesel::prelude::*;
use chrono::NaiveDateTime;
use serde::Serialize;

#[derive(Debug, Queryable, Selectable, Insertable, Serialize, Clone)]
#[diesel(table_name = crate::db::schema::settings)]
pub struct Setting {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Queryable, Selectable, Insertable, Serialize, Clone)]
#[diesel(table_name = crate::db::schema::conversations)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Queryable, Selectable, Insertable, Serialize, Clone)]
#[diesel(table_name = crate::db::schema::messages)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = crate::db::schema::conversations)]
pub struct NewConversation {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = crate::db::schema::messages)]
pub struct NewMessage {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
}
```

- [ ] **Step 6: Write db/mod.rs (module root, re-exports)**

```rust
pub mod schema;
pub mod models;

use diesel::sqlite::SqliteConnection;
use diesel::r2d2::{ConnectionManager, Pool};
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

pub type DbPool = Pool<ConnectionManager<SqliteConnection>>;

pub fn create_pool(db_path: &str) -> DbPool {
    let manager = ConnectionManager::<SqliteConnection>::new(db_path);
    Pool::builder()
        .max_size(4)
        .build(manager)
        .expect("Failed to create DB pool")
}

pub fn run_migrations(pool: &DbPool) {
    let mut conn = pool.get().expect("Failed to get DB connection");
    conn.run_pending_migrations(MIGRATIONS)
        .expect("Failed to run migrations");
}
```

- [ ] **Step 7: Commit**

```
git add src-tauri/migrations/ src-tauri/src/db/ && git commit -m "feat: add Diesel SQLite schema and migrations"
```

---

### Task 3: Chat Repository (CRUD Operations)

**Files:**
- Create: `src-tauri/src/db/repository.rs`
- Modify: `src-tauri/src/db/mod.rs` (add `pub mod repository;`)

- [ ] **Step 1: Write db/repository.rs**

```rust
use diesel::prelude::*;
use crate::db::schema::{conversations, messages, settings};
use crate::db::models::{Conversation, Message, NewConversation, NewMessage, Setting};
use crate::db::DbPool;
use uuid::Uuid;
use chrono::Utc;

// === Settings ===

pub fn get_setting(pool: &DbPool, setting_key: &str) -> Result<Option<String>, String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    settings::table
        .filter(settings::key.eq(setting_key))
        .select(settings::value)
        .first::<String>(&mut conn)
        .optional()
        .map_err(|e| e.to_string())
}

pub fn set_setting(pool: &DbPool, setting_key: &str, setting_value: &str) -> Result<(), String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    diesel::insert_into(settings::table)
        .values((settings::key.eq(setting_key), settings::value.eq(setting_value)))
        .on_conflict(settings::key)
        .do_update()
        .set(settings::value.eq(setting_value))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(())
}

// === Conversations ===

pub fn list_conversations(pool: &DbPool) -> Result<Vec<Conversation>, String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    conversations::table
        .order_by(conversations::updated_at.desc())
        .load::<Conversation>(&mut conn)
        .map_err(|e| e.to_string())
}

pub fn create_conversation(pool: &DbPool, title: &str) -> Result<Conversation, String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    let new_conv = NewConversation {
        id: Uuid::new_v4().to_string(),
        title: title.to_string(),
    };
    diesel::insert_into(conversations::table)
        .values(&new_conv)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    conversations::table
        .filter(conversations::id.eq(&new_conv.id))
        .first::<Conversation>(&mut conn)
        .map_err(|e| e.to_string())
}

pub fn update_conversation_time(pool: &DbPool, conv_id: &str) -> Result<(), String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    diesel::update(conversations::table.filter(conversations::id.eq(conv_id)))
        .set(conversations::updated_at.eq(Utc::now().naive_utc()))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_conversation_and_messages(pool: &DbPool, conv_id: &str) -> Result<(), String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    diesel::delete(messages::table.filter(messages::conversation_id.eq(conv_id)))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    diesel::delete(conversations::table.filter(conversations::id.eq(conv_id)))
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(())
}

// === Messages ===

pub fn get_messages(pool: &DbPool, conv_id: &str) -> Result<Vec<Message>, String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    messages::table
        .filter(messages::conversation_id.eq(conv_id))
        .order_by(messages::created_at.asc())
        .load::<Message>(&mut conn)
        .map_err(|e| e.to_string())
}

pub fn add_message(pool: &DbPool, conv_id: &str, role: &str, content: &str) -> Result<Message, String> {
    let mut conn = pool.get().map_err(|e| e.to_string())?;
    let new_msg = NewMessage {
        id: Uuid::new_v4().to_string(),
        conversation_id: conv_id.to_string(),
        role: role.to_string(),
        content: content.to_string(),
    };
    diesel::insert_into(messages::table)
        .values(&new_msg)
        .execute(&mut conn)
        .map_err(|e| e.to_string())?;
    messages::table
        .filter(messages::id.eq(&new_msg.id))
        .first::<Message>(&mut conn)
        .map_err(|e| e.to_string())
}
```

- [ ] **Step 2: Add `pub mod repository;` to db/mod.rs**

```rust
pub mod schema;
pub mod models;
pub mod repository;   // <-- add this line

// ... rest stays the same
```

- [ ] **Step 3: Commit**

```
git add src-tauri/src/db/ && git commit -m "feat: add chat repository CRUD operations"
```

---

### Task 4: LLM API Streaming Client

**Files:**
- Create: `src-tauri/src/api/mod.rs`
- Create: `src-tauri/src/api/client.rs`

- [ ] **Step 1: Write api/client.rs**

```rust
use reqwest::{Client, header};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;

#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<Message>,
    stream: bool,
}

#[derive(Debug, Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatChunk {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    delta: Delta,
    #[serde(default)]
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Delta {
    #[serde(default)]
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChatHistory {
    pub role: String,
    pub content: String,
}

/// Call a streaming OpenAI-compatible chat completion API.
/// `on_token` is called with each text chunk.
/// Returns the full assembled text on success.
pub async fn stream_chat_completion(
    base_url: &str,
    api_key: &str,
    model: &str,
    system_prompt: &str,
    history: &[ChatHistory],
    user_message: &str,
    mut on_token: impl FnMut(String),
) -> Result<String, String> {
    let url = format!("{}/v1/chat/completions", base_url.trim_end_matches('/'));
    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let mut messages = Vec::new();

    if !system_prompt.is_empty() {
        messages.push(Message {
            role: "system".into(),
            content: system_prompt.to_string(),
        });
    }

    for msg in history {
        messages.push(Message {
            role: msg.role.clone(),
            content: msg.content.clone(),
        });
    }

    messages.push(Message {
        role: "user".into(),
        content: user_message.to_string(),
    });

    let request_body = ChatRequest {
        model: model.to_string(),
        messages,
        stream: true,
    };

    let response = client
        .post(&url)
        .header(header::AUTHORIZATION, format!("Bearer {}", api_key))
        .header(header::CONTENT_TYPE, "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "API request timed out".to_string()
            } else if e.is_connect() {
                format!("Cannot connect to {}: {}", base_url, e)
            } else {
                format!("API request failed: {}", e)
            }
        })?;

    let status = response.status();
    if !status.is_success() {
        let err_body = response.text().await.unwrap_or_default();
        return Err(format!("API returned {status}: {err_body}"));
    }

    let stream = response.bytes_stream();
    let mut full_text = String::new();
    let mut buffer = String::new();

    use tokio_stream::StreamExt;
    use tokio_stream::wrappers::ReadableStreamType;
    tokio::pin!(stream);

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;
        let chunk_str = String::from_utf8_lossy(&chunk);
        buffer.push_str(&chunk_str);

        while let Some(line_end) = buffer.find('\n') {
            let line = buffer[..line_end].trim().to_string();
            buffer = buffer[line_end + 1..].to_string();

            if line.is_empty() {
                continue;
            }
            if !line.starts_with("data: ") {
                continue;
            }
            let data = &line[6..];
            if data == "[DONE]" {
                break;
            }

            if let Ok(parsed) = serde_json::from_str::<ChatChunk>(data) {
                if let Some(content) = parsed.choices.first().and_then(|c| c.delta.content.as_deref()) {
                    full_text.push_str(content);
                    on_token(content.to_string());
                }
            }
        }
    }

    Ok(full_text)
}

/// Test API connectivity by sending a simple non-streaming request.
pub async fn test_connection(
    base_url: &str,
    api_key: &str,
    model: &str,
) -> Result<bool, String> {
    let url = format!("{}/v1/chat/completions", base_url.trim_end_matches('/'));
    let client = Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let body = json!({
        "model": model,
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens": 5,
        "stream": false,
    });

    let response = client
        .post(&url)
        .header(header::AUTHORIZATION, format!("Bearer {}", api_key))
        .header(header::CONTENT_TYPE, "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Connection test failed: {}", e))?;

    Ok(response.status().is_success())
}
```

- [ ] **Step 2: Write api/mod.rs**

```rust
pub mod client;
```

- [ ] **Step 3: Add `tokio-stream` dependency to Cargo.toml**

Add `tokio-stream = "0.1"` to `[dependencies]` in Cargo.toml.

- [ ] **Step 4: Verify it compiles**

Run: `cargo check`
Expected: compilation succeeds

- [ ] **Step 5: Commit**

```
git add src-tauri/src/api/ src-tauri/Cargo.toml && git commit -m "feat: add streaming LLM API client"
```

---

### Task 5: File Parser Module

**Files:**
- Create: `src-tauri/src/parser/mod.rs`
- Create: `src-tauri/src/parser/text.rs`

- [ ] **Step 1: Write parser/text.rs**

```rust
use std::fs;
use std::path::Path;

/// Extract plain text from a file. Supports TXT, MD, and PDF.
pub fn extract_text(file_path: &str) -> Result<String, String> {
    let path = Path::new(file_path);
    let ext = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "txt" | "md" | "markdown" => extract_plain_text(file_path),
        "pdf" => extract_pdf_text(file_path),
        _ => Err(format!("Unsupported file type: .{}", ext)),
    }
}

fn extract_plain_text(file_path: &str) -> Result<String, String> {
    fs::read_to_string(file_path).map_err(|e| format!("Failed to read file: {}", e))
}

fn extract_pdf_text(file_path: &str) -> Result<String, String> {
    let bytes = fs::read(file_path).map_err(|e| format!("Failed to read PDF: {}", e))?;
    let text = pdf_extract::extract_text_from_mem(&bytes)
        .map_err(|e| format!("Failed to extract PDF text: {}", e))?;
    Ok(text)
}
```

- [ ] **Step 2: Write parser/mod.rs**

```rust
pub mod text;

pub use text::extract_text;
```

- [ ] **Step 3: Verify it compiles**

Run: `cargo check`
Expected: compilation succeeds

- [ ] **Step 4: Commit**

```
git add src-tauri/src/parser/ && git commit -m "feat: add file parser for TXT, MD, PDF"
```

---

### Task 6: Tauri Commands and App Setup

**Files:**
- Modify: `src-tauri/src/lib.rs` (full command registration + setup)
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/config_cmds.rs`
- Create: `src-tauri/src/commands/chat_cmds.rs`
- Create: `src-tauri/src/commands/parser_cmds.rs`

- [ ] **Step 1: Write commands/config_cmds.rs**

```rust
use tauri::{AppHandle, State};
use crate::db::{DbPool, repository};

#[tauri::command]
pub fn get_config(pool: State<'_, DbPool>, key: String) -> Result<Option<String>, String> {
    repository::get_setting(&pool, &key)
}

#[tauri::command]
pub fn set_config(pool: State<'_, DbPool>, key: String, value: String) -> Result<(), String> {
    repository::set_setting(&pool, &key, &value)
}

#[tauri::command]
pub async fn test_api_connection(
    base_url: String,
    api_key: String,
    model: String,
) -> Result<bool, String> {
    crate::api::client::test_connection(&base_url, &api_key, &model).await
}
```

- [ ] **Step 2: Write commands/chat_cmds.rs**

```rust
use tauri::{AppHandle, Emitter, State};
use serde::Serialize;
use crate::db::{DbPool, repository, models};
use crate::api::client::{self, ChatHistory};

#[tauri::command]
pub fn list_conversations(pool: State<'_, DbPool>) -> Result<Vec<models::Conversation>, String> {
    repository::list_conversations(&pool)
}

#[tauri::command]
pub fn create_conversation(pool: State<'_, DbPool>, title: String) -> Result<models::Conversation, String> {
    repository::create_conversation(&pool, &title)
}

#[tauri::command]
pub fn get_messages(pool: State<'_, DbPool>, conversation_id: String) -> Result<Vec<models::Message>, String> {
    repository::get_messages(&pool, &conversation_id)
}

#[tauri::command]
pub fn delete_conversation(pool: State<'_, DbPool>, id: String) -> Result<(), String> {
    repository::delete_conversation_and_messages(&pool, &id)
}

#[derive(Serialize, Clone)]
pub struct TokenPayload {
    pub conversation_id: String,
    pub token: String,
}

#[derive(Serialize, Clone)]
pub struct DonePayload {
    pub conversation_id: String,
}

#[derive(Serialize, Clone)]
pub struct ErrorPayload {
    pub conversation_id: String,
    pub message: String,
}

#[tauri::command]
pub async fn stream_chat(
    app: AppHandle,
    pool: State<'_, DbPool>,
    conversation_id: String,
    message: String,
) -> Result<(), String> {
    // 1. Save user message
    repository::add_message(&pool, &conversation_id, "user", &message)?;
    repository::update_conversation_time(&pool, &conversation_id)?;

    // 2. Load config
    let base_url = repository::get_setting(&pool, "llm_base_url")?.unwrap_or_default();
    let api_key = repository::get_setting(&pool, "llm_api_key")?.unwrap_or_default();
    let model = repository::get_setting(&pool, "llm_model")?.unwrap_or_default();

    if base_url.is_empty() || api_key.is_empty() {
        let _ = app.emit("chat:error", ErrorPayload {
            conversation_id: conversation_id.clone(),
            message: "API 未配置，请在设置中输入 API Key 和 Base URL".into(),
        });
        return Err("API not configured".into());
    }

    // 3. Load conversation history (last 20 messages)
    let history_messages = repository::get_messages(&pool, &conversation_id)?;
    let history: Vec<ChatHistory> = history_messages
        .iter()
        .map(|m| ChatHistory {
            role: m.role.clone(),
            content: m.content.clone(),
        })
        .collect();

    // 4. Stream the chat completion
    let conv_id = conversation_id.clone();
    let app_clone = app.clone();
    let result = client::stream_chat_completion(
        &base_url,
        &api_key,
        &model,
        "你是一只叫 Panda 的 AI 助手，住在用户的桌面上。请用友好的语气回答问题。",
        &history,
        &message,
        |token| {
            let _ = app_clone.emit("chat:token", TokenPayload {
                conversation_id: conv_id.clone(),
                token,
            });
        },
    ).await;

    match result {
        Ok(full_text) => {
            // Save assistant message
            repository::add_message(&pool, &conversation_id, "assistant", &full_text)?;
            repository::update_conversation_time(&pool, &conversation_id)?;
            let _ = app.emit("chat:done", DonePayload {
                conversation_id: conversation_id.clone(),
            });
            Ok(())
        }
        Err(e) => {
            let _ = app.emit("chat:error", ErrorPayload {
                conversation_id: conversation_id.clone(),
                message: e.clone(),
            });
            Err(e)
        }
    }
}
```

- [ ] **Step 3: Write commands/parser_cmds.rs**

```rust
#[tauri::command]
pub fn extract_file_text(file_path: String) -> Result<String, String> {
    crate::parser::text::extract_text(&file_path)
}
```

- [ ] **Step 4: Write commands/mod.rs**

```rust
pub mod config_cmds;
pub mod chat_cmds;
pub mod parser_cmds;
```

- [ ] **Step 5: Rewrite lib.rs with full setup**

```rust
mod db;
mod api;
mod parser;
mod commands;

use db::DbPool;
use std::path::PathBuf;

fn get_db_path(app: &tauri::App) -> PathBuf {
    let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
    std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
    app_dir.join("panda.db")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let db_path = get_db_path(app);
            let pool = db::create_pool(db_path.to_str().unwrap());
            db::run_migrations(&pool);
            app.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::config_cmds::get_config,
            commands::config_cmds::set_config,
            commands::config_cmds::test_api_connection,
            commands::chat_cmds::list_conversations,
            commands::chat_cmds::create_conversation,
            commands::chat_cmds::get_messages,
            commands::chat_cmds::delete_conversation,
            commands::chat_cmds::stream_chat,
            commands::parser_cmds::extract_file_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 6: Verify it compiles**

Run: `cargo check`
Expected: compilation succeeds

- [ ] **Step 7: Commit**

```
git add src-tauri/src/ && git commit -m "feat: add Tauri commands for config, chat, and file parsing"
```

---

### Task 7: Zustand Store and Tauri Helpers

**Files:**
- Create: `src/stores/pandaStore.ts`
- Create: `src/lib/tauri.ts`

- [ ] **Step 1: Write lib/tauri.ts**

```ts
import { invoke } from "@tauri-apps/api/core";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

// Config
export async function getConfig(key: string): Promise<string | null> {
  return invoke<string | null>("get_config", { key });
}

export async function setConfig(key: string, value: string): Promise<void> {
  return invoke("set_config", { key, value });
}

export async function testApiConnection(
  baseUrl: string,
  apiKey: string,
  model: string,
): Promise<boolean> {
  return invoke("test_api_connection", { baseUrl, apiKey, model });
}

// Conversations
export async function listConversations(): Promise<Conversation[]> {
  return invoke("list_conversations");
}

export async function createConversation(title: string): Promise<Conversation> {
  return invoke("create_conversation", { title });
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  return invoke("get_messages", { conversationId });
}

export async function deleteConversation(id: string): Promise<void> {
  return invoke("delete_conversation", { id });
}

// Chat
export async function streamChat(
  conversationId: string,
  message: string,
): Promise<void> {
  return invoke("stream_chat", { conversationId, message });
}

// File
export async function extractFileText(filePath: string): Promise<string> {
  return invoke("extract_file_text", { filePath });
}
```

- [ ] **Step 2: Write stores/pandaStore.ts**

```ts
import { create } from "zustand";
import type { Conversation, Message } from "../lib/tauri";

export type PandaState = "idle" | "thinking" | "error";

interface PandaStore {
  // Panda animation state
  pandaState: PandaState;
  setPandaState: (s: PandaState) => void;

  // Chat panel visibility
  chatOpen: boolean;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;

  // Conversation list
  conversations: Conversation[];
  setConversations: (list: Conversation[]) => void;
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;

  // Messages
  messages: Message[];
  setMessages: (msgs: Message[]) => void;
  addMessage: (msg: Message) => void;

  // Streaming state
  streamingText: string;
  isStreaming: boolean;
  appendToken: (token: string) => void;
  setStreamingText: (text: string) => void;
  setIsStreaming: (v: boolean) => void;

  // UI panels
  configOpen: boolean;
  setConfigOpen: (open: boolean) => void;
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;

  // Error
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
}

export const usePandaStore = create<PandaStore>((set) => ({
  // Panda state
  pandaState: "idle",
  setPandaState: (s) => set({ pandaState: s }),

  // Chat panel
  chatOpen: false,
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  setChatOpen: (open) => set({ chatOpen: open }),

  // Conversations
  conversations: [],
  setConversations: (list) => set({ conversations: list }),
  currentConversationId: null,
  setCurrentConversationId: (id) => set({ currentConversationId: id }),

  // Messages
  messages: [],
  setMessages: (msgs) => set({ messages: msgs }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  // Streaming
  streamingText: "",
  isStreaming: false,
  appendToken: (token) =>
    set((s) => ({ streamingText: s.streamingText + token })),
  setStreamingText: (text) => set({ streamingText: text }),
  setIsStreaming: (v) => set({ isStreaming: v }),

  // Panels
  configOpen: false,
  setConfigOpen: (open) => set({ configOpen: open }),
  historyOpen: false,
  setHistoryOpen: (open) => set({ historyOpen: open }),

  // Error
  errorMessage: null,
  setErrorMessage: (msg) => set({ errorMessage: msg }),
}));
```

- [ ] **Step 3: Commit**

```
git add src/stores/ src/lib/ && git commit -m "feat: add Zustand store and Tauri API helpers"
```

---

### Task 8: PandaSprite Animation Component

**Files:**
- Create: `src/components/panda/PandaSprite.tsx`

- [ ] **Step 1: Write PandaSprite.tsx**

```tsx
import { useRef, useEffect } from "react";
import type { PandaState } from "../../stores/pandaStore";

interface SpriteConfig {
  cols: number;
  rows: number;
  fps: number;
  loop: boolean;
}

const SPRITE_CONFIGS: Record<PandaState, SpriteConfig> = {
  idle: { cols: 4, rows: 1, fps: 8, loop: true },
  thinking: { cols: 4, rows: 1, fps: 6, loop: true },
  error: { cols: 2, rows: 1, fps: 4, loop: false },
};

const SPRITE_SHEETS: Record<PandaState, string> = {
  idle: "/sprites/idle.png",
  thinking: "/sprites/thinking.png",
  error: "/sprites/error.png",
};

interface PandaSpriteProps {
  state: PandaState;
  width?: number;
  height?: number;
}

export function PandaSprite({ state, width = 200, height = 200 }: PandaSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const config = SPRITE_CONFIGS[state];
    const img = new Image();
    img.src = SPRITE_SHEETS[state];
    let stopped = false;

    img.onload = () => {
      const frameWidth = img.width / config.cols;
      const frameHeight = img.height / config.rows;
      const frameDelay = 1000 / config.fps;
      let lastTime = 0;
      frameRef.current = 0;

      function render(timestamp: number) {
        if (stopped) return;
        if (timestamp - lastTime >= frameDelay) {
          lastTime = timestamp;
          const col = frameRef.current % config.cols;
          const row = Math.floor(frameRef.current / config.cols) % config.rows;
          ctx!.clearRect(0, 0, width, height);
          ctx!.drawImage(
            img,
            col * frameWidth,
            row * frameHeight,
            frameWidth,
            frameHeight,
            0,
            0,
            width,
            height,
          );
          frameRef.current++;
          const totalFrames = config.cols * config.rows;
          if (!config.loop && frameRef.current >= totalFrames) {
            // stop on last frame for non-looping animations
            return;
          }
          frameRef.current %= totalFrames;
        }
        animFrameRef.current = requestAnimationFrame(render);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    return () => {
      stopped = true;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [state, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="block"
      style={{ width, height }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```
git add src/components/panda/PandaSprite.tsx && git commit -m "feat: add PandaSprite canvas animation component"
```

---

### Task 9: PandaWindow Shell and Event Handling

**Files:**
- Create: `src/components/panda/PandaWindow.tsx`
- Create: `src/components/panda/PandaOverlay.tsx`
- Create: `src/components/panda/PandaContextMenu.tsx`

- [ ] **Step 1: Write PandaOverlay.tsx**

```tsx
import { usePandaStore } from "../../stores/pandaStore";
import { ChatPanel } from "../chat/ChatPanel";

export function PandaOverlay() {
  const chatOpen = usePandaStore((s) => s.chatOpen);

  if (!chatOpen) return null;

  return (
    <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm flex flex-col z-10">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
        <button
          onClick={() => usePandaStore.getState().setChatOpen(false)}
          className="text-white/60 hover:text-white text-sm"
        >
          ← 折叠
        </button>
        <span className="text-white/80 text-sm font-medium">Panda AI</span>
        <button
          onClick={() => usePandaStore.getState().setConfigOpen(true)}
          className="text-white/60 hover:text-white text-sm"
        >
          ⚙️
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <ChatPanel />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write PandaContextMenu.tsx**

```tsx
import { useEffect, useRef, useState } from "react";
import { usePandaStore } from "../../stores/pandaStore";
import { createConversation, listConversations } from "../../lib/tauri";

interface MenuItem {
  label: string;
  action: () => void;
}

export function PandaContextMenu() {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const items: MenuItem[] = [
    {
      label: "新对话",
      action: async () => {
        const conv = await createConversation("新对话");
        const store = usePandaStore.getState();
        store.setCurrentConversationId(conv.id);
        store.setMessages([]);
        store.setChatOpen(true);
        const list = await listConversations();
        store.setConversations(list);
        setVisible(false);
      },
    },
    {
      label: "API 配置",
      action: () => {
        usePandaStore.getState().setConfigOpen(true);
        setVisible(false);
      },
    },
    {
      label: "历史记录",
      action: () => {
        usePandaStore.getState().setHistoryOpen(true);
        setVisible(false);
      },
    },
    {
      label: "退出",
      action: () => {
        // @ts-ignore - Tauri v2 API
        import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
          getCurrentWindow().close();
        });
        setVisible(false);
      },
    },
  ];

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-800 border border-white/20 rounded-lg shadow-xl py-1 min-w-[140px]"
      style={{ left: pos.x, top: pos.y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write PandaWindow.tsx**

```tsx
import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { onDragDropEvent } from "@tauri-apps/api/webviewWindow";
import { usePandaStore } from "../../stores/pandaStore";
import { extractFileText, createConversation, streamChat } from "../../lib/tauri";
import { PandaSprite } from "./PandaSprite";
import { PandaOverlay } from "./PandaOverlay";
import { PandaContextMenu } from "./PandaContextMenu";
import { ConfigPanel } from "../config/ConfigPanel";
import { HistoryPanel } from "../history/HistoryPanel";

export function PandaWindow() {
  const pandaState = usePandaStore((s) => s.pandaState);
  const chatOpen = usePandaStore((s) => s.chatOpen);
  const errorMessage = usePandaStore((s) => s.errorMessage);
  const currentConversationId = usePandaStore((s) => s.currentConversationId);

  // Click to toggle chat (window expand/collapse)
  const handleClick = async () => {
    const store = usePandaStore.getState();
    if (!store.chatOpen) {
      // Ensure there's a conversation
      if (!store.currentConversationId) {
        const conv = await createConversation("新对话");
        store.setCurrentConversationId(conv.id);
        const { listConversations } = await import("../../lib/tauri");
        store.setConversations(await listConversations());
      }
      // Expand window
      await getCurrentWindow().setSize({ width: 400, height: 600 });
      store.setChatOpen(true);
    }
  };

  // File drop handling
  useEffect(() => {
    const unlisten = onDragDropEvent(async (event) => {
      if (event.payload.type === "drop") {
        const filePath = event.payload.paths[0];
        if (!filePath) return;
        const store = usePandaStore.getState();

        // Create or use conversation
        let convId = store.currentConversationId;
        if (!convId) {
          const conv = await createConversation("文件分析");
          convId = conv.id;
          store.setCurrentConversationId(convId);
          store.setConversations(await import("../../lib/tauri").then(m => m.listConversations()));
        }

        // Extract text
        store.setPandaState("thinking");
        const text = await extractFileText(filePath);

        // Send to chat
        if (!store.chatOpen) {
          await getCurrentWindow().setSize({ width: 400, height: 600 });
          store.setChatOpen(true);
        }

        store.setPandaState("thinking");
        await streamChat(convId, `请分析以下文件内容：\n\n${text}`);
      }
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  // Auto-reset error animation after 3s
  useEffect(() => {
    if (pandaState === "error") {
      const timer = setTimeout(() => {
        usePandaStore.getState().setPandaState("idle");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pandaState]);

  // Set mouse-through when chat is closed
  useEffect(() => {
    const win = getCurrentWindow();
    if (chatOpen) {
      win.setIgnoreCursorEvents(false);
    } else {
      win.setIgnoreCursorEvents(true);
    }
  }, [chatOpen]);

  return (
    <div className="relative w-screen h-screen select-none">
      {/* Clickable area (only when chat is closed) */}
      {!chatOpen && (
        <div
          className="absolute inset-0 z-10"
          onClick={handleClick}
        />
      )}

      {/* Panda sprite */}
      <div className="flex flex-col items-center justify-center h-full pt-4">
        <PandaSprite state={pandaState} />
        {errorMessage && (
          <p className="text-red-400 text-xs mt-2 px-4 text-center">
            {errorMessage}
          </p>
        )}
      </div>

      {/* Chat overlay */}
      <PandaOverlay />

      {/* Context menu */}
      <PandaContextMenu />

      {/* Config panel */}
      <ConfigPanel />

      {/* History panel */}
      <HistoryPanel />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```
git add src/components/panda/ && git commit -m "feat: add PandaWindow shell with click, drag-drop, and context menu"
```

---

### Task 10: Chat UI Components

**Files:**
- Create: `src/components/chat/ChatInput.tsx`
- Create: `src/components/chat/MessageList.tsx`
- Create: `src/components/chat/ChatPanel.tsx`

- [ ] **Step 1: Write ChatInput.tsx**

```tsx
import { useState, useRef, useEffect } from "react";
import { usePandaStore } from "../../stores/pandaStore";
import { streamChat } from "../../lib/tauri";

export function ChatInput() {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = usePandaStore((s) => s.isStreaming);
  const conversationId = usePandaStore((s) => s.currentConversationId);
  const setPandaState = usePandaStore((s) => s.setPandaState);

  useEffect(() => {
    if (!isStreaming && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isStreaming]);

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg || !conversationId || isStreaming) return;
    setText("");
    setPandaState("thinking");
    try {
      await streamChat(conversationId, msg);
    } catch {
      setPandaState("error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 border-t border-white/10 p-3">
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息..."
        rows={1}
        disabled={isStreaming}
        className="flex-1 bg-white/5 text-white text-sm rounded-lg px-3 py-2 outline-none resize-none placeholder-white/30 disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || isStreaming || !conversationId}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
      >
        {isStreaming ? "..." : "发送"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write MessageList.tsx**

```tsx
import { useRef, useEffect } from "react";
import { usePandaStore } from "../../stores/pandaStore";

export function MessageList() {
  const messages = usePandaStore((s) => s.messages);
  const streamingText = usePandaStore((s) => s.streamingText);
  const isStreaming = usePandaStore((s) => s.isStreaming);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-white/10 text-white/90"
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}

      {isStreaming && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-white/10 text-white/90">
            {streamingText}
            <span className="inline-block w-1.5 h-4 bg-blue-400 ml-0.5 animate-pulse" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 3: Write ChatPanel.tsx**

```tsx
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

export function ChatPanel() {
  return (
    <div className="flex flex-col h-full">
      <MessageList />
      <ChatInput />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```
git add src/components/chat/ && git commit -m "feat: add chat UI components (MessageList, ChatInput, ChatPanel)"
```

---

### Task 11: ConfigPanel and HistoryPanel

**Files:**
- Create: `src/components/config/ConfigPanel.tsx`
- Create: `src/components/history/HistoryPanel.tsx`

- [ ] **Step 1: Write ConfigPanel.tsx**

```tsx
import { useState, useEffect } from "react";
import { usePandaStore } from "../../stores/pandaStore";
import { getConfig, setConfig, testApiConnection } from "../../lib/tauri";

export function ConfigPanel() {
  const open = usePandaStore((s) => s.configOpen);
  const setOpen = usePandaStore((s) => s.setConfigOpen);

  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "fail" | null>(null);

  useEffect(() => {
    if (open) {
      getConfig("llm_base_url").then((v) => setBaseUrl(v || "https://api.deepseek.com"));
      getConfig("llm_api_key").then((v) => setApiKey(v || ""));
      getConfig("llm_model").then((v) => setModel(v || "deepseek-chat"));
    }
  }, [open]);

  const handleSave = async () => {
    await setConfig("llm_base_url", baseUrl);
    await setConfig("llm_api_key", apiKey);
    await setConfig("llm_model", model);
    setOpen(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await testApiConnection(baseUrl, apiKey, model);
      setTestResult(ok ? "success" : "fail");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="bg-gray-800 rounded-2xl p-6 w-[90vw] max-w-md mx-auto">
        <h2 className="text-white text-lg font-medium mb-4">API 配置</h2>

        <label className="block text-sm text-white/60 mb-1">Base URL</label>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full bg-white/5 text-white rounded-lg px-3 py-2 mb-3 outline-none text-sm"
          placeholder="https://api.deepseek.com"
        />

        <label className="block text-sm text-white/60 mb-1">API Key</label>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          type="password"
          className="w-full bg-white/5 text-white rounded-lg px-3 py-2 mb-3 outline-none text-sm"
          placeholder="sk-xxx"
        />

        <label className="block text-sm text-white/60 mb-1">模型</label>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full bg-white/5 text-white rounded-lg px-3 py-2 mb-4 outline-none text-sm"
          placeholder="deepseek-chat"
        />

        {testResult === "success" && (
          <p className="text-green-400 text-sm mb-3">✅ 连接成功</p>
        )}
        {testResult === "fail" && (
          <p className="text-red-400 text-sm mb-3">❌ 连接失败，请检查配置</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {testing ? "测试中..." : "测试连接"}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
          >
            保存
          </button>
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-sm rounded-lg transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write HistoryPanel.tsx**

```tsx
import { useEffect, useState } from "react";
import { usePandaStore } from "../../stores/pandaStore";
import {
  listConversations,
  getMessages,
  deleteConversation,
  createConversation,
} from "../../lib/tauri";
import type { Conversation } from "../../lib/tauri";

export function HistoryPanel() {
  const open = usePandaStore((s) => s.historyOpen);
  const setOpen = usePandaStore((s) => s.setHistoryOpen);
  const storeConversations = usePandaStore((s) => s.conversations);
  const setStoreConversations = usePandaStore((s) => s.setConversations);
  const setCurrentConversationId = usePandaStore((s) => s.setCurrentConversationId);
  const setMessages = usePandaStore((s) => s.setMessages);
  const setChatOpen = usePandaStore((s) => s.setChatOpen);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      listConversations()
        .then(setStoreConversations)
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleSelect = async (conv: Conversation) => {
    setCurrentConversationId(conv.id);
    const msgs = await getMessages(conv.id);
    setMessages(msgs);
    setChatOpen(true);
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    const list = await listConversations();
    setStoreConversations(list);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="bg-gray-800 rounded-2xl p-6 w-[90vw] max-w-md mx-auto max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-medium">历史记录</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-white/60 hover:text-white text-sm"
          >
            关闭
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading && <p className="text-white/40 text-sm">加载中...</p>}
          {!loading && storeConversations.length === 0 && (
            <p className="text-white/40 text-sm">暂无对话记录</p>
          )}
          {storeConversations.map((conv) => (
            <div
              key={conv.id}
              className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2"
            >
              <button
                onClick={() => handleSelect(conv)}
                className="flex-1 text-left text-white/80 hover:text-white text-sm truncate"
              >
                {conv.title}
              </button>
              <button
                onClick={() => handleDelete(conv.id)}
                className="text-red-400/60 hover:text-red-400 text-xs shrink-0"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```
git add src/components/config/ src/components/history/ && git commit -m "feat: add ConfigPanel and HistoryPanel"
```

---

### Task 12: IPC Hooks and App Assembly

**Files:**
- Create: `src/hooks/useChat.ts`
- Create: `src/hooks/useConfig.ts`
- Create: `src/hooks/useFileDrop.ts`
- Modify: `src/App.tsx` (final assembly with event listeners)

- [ ] **Step 1: Write hooks/useChat.ts**

```ts
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { usePandaStore } from "../stores/pandaStore";

export function useChat() {
  const appendToken = usePandaStore((s) => s.appendToken);
  const setIsStreaming = usePandaStore((s) => s.setIsStreaming);
  const setPandaState = usePandaStore((s) => s.setPandaState);
  const addMessage = usePandaStore((s) => s.addMessage);
  const setErrorMessage = usePandaStore((s) => s.setErrorMessage);
  const currentConversationId = usePandaStore((s) => s.currentConversationId);

  useEffect(() => {
    const unlistenToken = listen<{ conversation_id: string; token: string }>(
      "chat:token",
      (event) => {
        if (event.payload.conversation_id === currentConversationId) {
          appendToken(event.payload.token);
        }
      },
    );

    const unlistenDone = listen<{ conversation_id: string }>(
      "chat:done",
      (event) => {
        if (event.payload.conversation_id === currentConversationId) {
          const store = usePandaStore.getState();
          const fullText = store.streamingText;
          store.addMessage({
            id: crypto.randomUUID(),
            conversation_id: event.payload.conversation_id,
            role: "assistant",
            content: fullText,
            created_at: new Date().toISOString(),
          });
          store.setStreamingText("");
          store.setIsStreaming(false);
          store.setPandaState("idle");
        }
      },
    );

    const unlistenError = listen<{ conversation_id: string; message: string }>(
      "chat:error",
      (event) => {
        const store = usePandaStore.getState();
        if (event.payload.conversation_id === currentConversationId) {
          store.setStreamingText("");
          store.setIsStreaming(false);
          store.setPandaState("error");
          store.setErrorMessage(event.payload.message);
          setTimeout(() => store.setErrorMessage(null), 5000);
        }
      },
    );

    return () => {
      unlistenToken.then((fn) => fn());
      unlistenDone.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, [currentConversationId]);
}
```

- [ ] **Step 2: Write hooks/useConfig.ts**

```ts
import { useEffect } from "react";
import { usePandaStore } from "../stores/pandaStore";
import { getConfig } from "../lib/tauri";

export function useConfig() {
  useEffect(() => {
    // Load config on mount to verify setup
    getConfig("llm_base_url").catch(() => {
      // No config yet, that's OK
    });
  }, []);
}
```

- [ ] **Step 3: Write hooks/useFileDrop.ts**

```ts
import { useEffect } from "react";
import { onDragDropEvent } from "@tauri-apps/api/webviewWindow";
import { usePandaStore } from "../stores/pandaStore";
import { extractFileText, createConversation, streamChat, listConversations } from "../lib/tauri";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useFileDrop() {
  const setPandaState = usePandaStore((s) => s.setPandaState);
  const setChatOpen = usePandaStore((s) => s.setChatOpen);

  useEffect(() => {
    const unlisten = onDragDropEvent(async (event) => {
      if (event.payload.type !== "drop") return;
      const filePath = event.payload.paths[0];
      if (!filePath) return;

      const store = usePandaStore.getState();
      let convId = store.currentConversationId;
      if (!convId) {
        const conv = await createConversation("文件分析");
        convId = conv.id;
        store.setCurrentConversationId(convId);
        store.setConversations(await listConversations());
      }

      setPandaState("thinking");
      const text = await extractFileText(filePath);

      if (!store.chatOpen) {
        await getCurrentWindow().setSize({ width: 400, height: 600 });
        setChatOpen(true);
      }

      setPandaState("thinking");
      streamChat(convId, `请分析以下文件内容：\n\n${text}`).catch(() => {
        setPandaState("error");
      });
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);
}
```

- [ ] **Step 4: Rewrite App.tsx with full assembly**

```tsx
import { PandaWindow } from "./components/panda/PandaWindow";
import { useChat } from "./hooks/useChat";
import { useConfig } from "./hooks/useConfig";
import { useFileDrop } from "./hooks/useFileDrop";

function App() {
  useChat();
  useConfig();
  useFileDrop();

  return <PandaWindow />;
}

export default App;
```

- [ ] **Step 5: Verify frontend builds**

Run: `npm run build`  
Expected: TypeScript compiles, Vite bundles successfully

- [ ] **Step 6: Commit**

```
git add src/ && git commit -m "feat: add IPC hooks and final App assembly"
```

---

### Task 13: Window Behavior (Edge Snap, Mouse Through, Auto-hide)

**Files:**
- Modify: `src-tauri/src/lib.rs` (add window event handlers)
- Modify: `src-tauri/src/commands/mod.rs` (add window commands)

- [ ] **Step 1: Add window commands in commands/window_cmds.rs**

```rust
use tauri::State;
use crate::db::DbPool;
use crate::db::repository;

#[tauri::command]
pub fn check_first_run(pool: State<'_, DbPool>) -> Result<bool, String> {
    let configured = repository::get_setting(&pool, "llm_api_key")?;
    Ok(configured.is_none() || configured.as_deref() == Some(""))
}

#[tauri::command]
pub async fn collapse_window(window: tauri::Window) -> Result<(), String> {
    window.set_size(tauri::LogicalSize::new(200, 280))
        .map_err(|e| e.to_string())?;
    window.center().map_err(|e| e.to_string())?;
    Ok(())
}
```

- [ ] **Step 2: Update commands/mod.rs**

```rust
pub mod config_cmds;
pub mod chat_cmds;
pub mod parser_cmds;
pub mod window_cmds;  // <-- add
```

- [ ] **Step 3: Update lib.rs with edge-snap logic**

Modify the `setup` closure to add `on_window_event`:

```rust
.setup(|app| {
    let db_path = get_db_path(app);
    let pool = db::create_pool(db_path.to_str().unwrap());
    db::run_migrations(&pool);
    app.manage(pool);

    // Edge snap: listen for window move events
    let window = app.get_webview_window("panda").unwrap();
    let window_clone = window.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Moved(position) = event {
            let screen = match window_clone.available_monitors() {
                Ok(mut m) if !m.is_empty() => m.remove(0),
                _ => return,
            };
            let screen_size = screen.size();
            let (x, y) = (position.x, position.y);
            let snap_dist = 15;

            let mut new_x = x;
            let mut new_y = y;

            if x.abs() <= snap_dist {
                new_x = 0;
            } else if (x + 200 - screen_size.width as i32).abs() <= snap_dist {
                new_x = screen_size.width as i32 - 200;
            }

            if y.abs() <= snap_dist {
                new_y = 0;
            } else if (y + 280 - screen_size.height as i32).abs() <= snap_dist {
                new_y = screen_size.height as i32 - 280;
            }

            if new_x != x || new_y != y {
                let _ = window_clone.set_position(tauri::PhysicalPosition::new(new_x, new_y));
            }
        }
    });

    Ok(())
})
```

Also add `on_window_event` import: the `WindowEvent` is from `tauri`.

- [ ] **Step 4: Register new commands in invoke_handler**

Add `commands::window_cmds::check_first_run,` and `commands::window_cmds::collapse_window,` to the invoke_handler.

- [ ] **Step 5: Verify it compiles**

Run: `cargo build`  
Expected: compilation succeeds

- [ ] **Step 6: Commit**

```
git add src-tauri/src/ && git commit -m "feat: add edge snap, mouse through, and window commands"
```

---

### Task 14: Final Integration and Verification

**Files:**
- None (no new files — we verify the full app runs)

- [ ] **Step 1: Create placeholder sprite sheet images**

Create minimal placeholder PNG images at `public/sprites/idle.png`, `public/sprites/thinking.png`, `public/sprites/error.png` so the frontend doesn't error on load. These are tiny placeholder images (1x1 pixel PNGs) that will be replaced by the user's Sprite Sheets later.

- [ ] **Step 2: Full build verification**

Run:
```bash
cargo build
npm run build
```

Expected: both Rust and TypeScript compile without errors.

- [ ] **Step 3: Check binary size**

Run:
```bash
ls -lh target/debug/panda-ai-desktop-agent
```
Expected: debug binary size is not a concern. Release build with `cargo build --release` should be ~30MB.

- [ ] **Step 4: Manual test checklist**

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Window launch | `cargo tauri dev` | Transparent window appears, panda visible |
| Click to chat | Click panda | Window expands to 400x600, chat panel shows |
| New conversation | Right-click → 新对话 | New conversation created, chat panel opens |
| API config | Right-click → API 配置 | Config panel opens, can input key/url |
| API test | Enter key + url → 测试连接 | Success or failure feedback |
| Send message | Type text → 发送 | Thinking animation, streaming text appears |
| File drag-drop | Drop PDF/MD/TXT on window | Panda thinks, then file content sent to chat |
| History | Right-click → 历史记录 | Shows conversation list, can select/delete |
| Error handling | Set invalid API key | Error animation shows, error message displayed |
| Collapse chat | Click ← 折叠 | Window shrinks to 200x280 |
| Edge snap | Drag window near screen edge | Snaps to edge |

- [ ] **Step 5: Commit any final fixes**

```
git add -A && git commit -m "chore: final integration and placeholder assets"
```

---

## Phase 1 Summary

After these 14 tasks, the project will be a working desktop pet that:
- Runs as a ~30MB Tauri 2 transparent window
- Plays Sprite Sheet animations (Idle/Thinking/Error)
- Accepts user-configured LLM API (DeepSeek, OpenAI, etc.)
- Provides streaming text chat with conversational memory
- Handles file drag-drop (TXT, MD, PDF) with text extraction
- Manages chat history with SQLite persistence
- Supports edge snapping and mouse-through behavior

## Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| Tauri 2 transparent window | Task 1 |
| Always on Top / edge snap | Task 13 |
| Sprite Sheet animation (Idle/Thinking/Error) | Task 8 |
| API 配置中心 (Base URL + Key + Model) | Task 6 + Task 11 |
| 连通性测试 | Task 6 + Task 11 |
| 流式聊天 (streaming) | Task 4 + Task 6 + Task 10 |
| 对话管理 (新建/历史/删除) | Task 3 + Task 6 + Task 11 |
| 单文件拖拽 (MD/TXT/PDF) | Task 5 + Task 12 |
| 鼠标穿透 | Task 9 + Task 13 |
| Error动画联动 | Task 8 + Task 9 + Task 12 |
| SQLite 持久化 | Task 2 + Task 3 |
| 右键菜单 | Task 9 |
