use anyhow::Result;
use std::time::Duration;
use tokio::process::{Child, Command};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::ChildStdin;
use tokio::process::ChildStdout;
use tokio::process::ChildStderr;
use crate::mcp::protocol::{JsonRpcRequest, JsonRpcResponse, JsonRpcNotification};

/// Manages a single MCP server via stdio subprocess.
pub struct McpTransport {
    child: Child,
    stdin: ChildStdin,
    reader: BufReader<ChildStdout>,
    stderr: Option<ChildStderr>,
    next_id: u64,
}

impl McpTransport {
    /// Spawn an MCP server process.
    pub async fn spawn(command: &str, args: &[&str]) -> Result<Self> {
        let command = command.trim();
        // GUI apps on macOS have a minimal PATH — ensure node/npx are findable
        let path = std::env::var("PATH").unwrap_or_default();
        let extended_path = format!("/usr/local/bin:/opt/homebrew/bin:{}", path);

        let mut child = Command::new(command)
            .args(args)
            .env("PATH", &extended_path)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| anyhow::anyhow!("Failed to spawn '{}': {}", command, e))?;

        // Give process a moment; npx may need time to start
        tokio::time::sleep(std::time::Duration::from_millis(300)).await;

        match child.try_wait() {
            Ok(Some(status)) => {
                let stderr_text = Self::read_stderr(child.stderr.as_mut()).await;
                anyhow::bail!(
                    "MCP 进程启动失败 ({}): {}",
                    status,
                    stderr_text.trim()
                );
            }
            Ok(None) => {}
            Err(e) => anyhow::bail!("Failed to check process: {}", e),
        }

        let stdin = child.stdin.take().expect("stdin not set");
        let stdout = child.stdout.take().expect("stdout not set");
        let stderr = child.stderr.take();
        let reader = BufReader::new(stdout);

        Ok(Self { child, stdin, reader, stderr, next_id: 1 })
    }

    async fn read_stderr(stderr_opt: Option<&mut ChildStderr>) -> String {
        use tokio::io::AsyncReadExt;
        if let Some(stderr) = stderr_opt {
            let mut buf = vec![0u8; 8192];
            match stderr.read(&mut buf).await {
                Ok(n) if n > 0 => String::from_utf8_lossy(&buf[..n]).to_string(),
                _ => "(no stderr output)".into(),
            }
        } else {
            "(stderr not captured)".into()
        }
    }

    /// Send a JSON-RPC request and read the matching response.
    pub async fn send_request(&mut self, method: &str, params: Option<serde_json::Value>) -> Result<serde_json::Value> {
        let id = self.next_id;
        self.next_id += 1;
        let request = JsonRpcRequest::new(id, method, params);
        let mut line = serde_json::to_string(&request)?;
        line.push('\n');

        self.stdin.write_all(line.as_bytes()).await?;
        self.stdin.flush().await?;

        self.read_response(id).await
    }

    /// Send a notification (no response expected).
    pub async fn send_notification(&mut self, method: &str, params: Option<serde_json::Value>) -> Result<()> {
        let notification = serde_json::json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
        });
        let mut line = serde_json::to_string(&notification)?;
        line.push('\n');

        self.stdin.write_all(line.as_bytes()).await?;
        self.stdin.flush().await?;
        Ok(())
    }

    async fn read_response(&mut self, expected_id: u64) -> Result<serde_json::Value> {
        let start = std::time::Instant::now();
        let timeout = Duration::from_secs(15);

        loop {
            // Overall timeout to prevent infinite hangs
            if start.elapsed() > timeout {
                anyhow::bail!("MCP read_response timeout ({}s) for id={}", timeout.as_secs(), expected_id);
            }

            // Read with per-iteration timeout so we can abort hung servers
            let mut line = String::new();
            let read_fut = self.reader.read_line(&mut line);
            let n = match tokio::time::timeout(Duration::from_millis(100), read_fut).await {
                Ok(Ok(n)) => n,
                Ok(Err(e)) => return Err(e.into()),
                Err(_timeout) => continue, // retry — overall timeout checked above
            };
            if n == 0 {
                let stderr_text = if let Ok(Some(_status)) = self.child.try_wait() {
                    Self::read_stderr(self.stderr.as_mut()).await
                } else {
                    "(process still running)".into()
                };
                anyhow::bail!("MCP stdout closed. stderr: {}", stderr_text.trim());
            }
            let line = line.trim().to_string();
            if line.is_empty() { continue; }

            if let Ok(response) = serde_json::from_str::<JsonRpcResponse>(&line) {
                if response.id == Some(expected_id) {
                    if let Some(err) = response.error {
                        anyhow::bail!("MCP error {}: {}", err.code, err.message);
                    }
                    return Ok(response.result.unwrap_or(serde_json::Value::Null));
                }
                continue;
            }
            if let Ok(_notification) = serde_json::from_str::<JsonRpcNotification>(&line) {
                continue;
            }
        }
    }

    /// Initialize MCP handshake.
    pub async fn initialize(&mut self) -> Result<serde_json::Value> {
        let params = serde_json::json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": { "name": "panda-ai", "version": "0.1.0" }
        });
        self.send_request("initialize", Some(params)).await
    }
}

impl Drop for McpTransport {
    fn drop(&mut self) {}
}
