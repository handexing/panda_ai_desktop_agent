use anyhow::Result;
use tokio::process::{Child, Command};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use crate::mcp::protocol::{JsonRpcRequest, JsonRpcResponse, JsonRpcNotification};

/// Manages a single MCP server via stdio subprocess.
pub struct McpTransport {
    child: Child,
    next_id: u64,
}

impl McpTransport {
    /// Spawn an MCP server process.
    pub async fn spawn(command: &str, args: &[&str]) -> Result<Self> {
        let child = Command::new(command)
            .args(args)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::null())
            .kill_on_drop(true)
            .spawn()?;

        Ok(Self { child, next_id: 1 })
    }

    /// Send a JSON-RPC request and read the matching response.
    pub async fn send_request(&mut self, method: &str, params: Option<serde_json::Value>) -> Result<serde_json::Value> {
        let id = self.next_id;
        self.next_id += 1;
        let request = JsonRpcRequest::new(id, method, params);
        let mut line = serde_json::to_string(&request)?;
        line.push('\n');

        let stdin = self.child.stdin.as_mut().expect("stdin not open");
        stdin.write_all(line.as_bytes()).await?;
        stdin.flush().await?;

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

        let stdin = self.child.stdin.as_mut().expect("stdin not open");
        stdin.write_all(line.as_bytes()).await?;
        stdin.flush().await?;
        Ok(())
    }

    async fn read_response(&mut self, expected_id: u64) -> Result<serde_json::Value> {
        let stdout = self.child.stdout.as_mut().expect("stdout not open");
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();

        while let Some(line) = lines.next_line().await? {
            if line.is_empty() { continue; }
            // Try parsing as response first
            if let Ok(response) = serde_json::from_str::<JsonRpcResponse>(&line) {
                if response.id == Some(expected_id) {
                    if let Some(err) = response.error {
                        anyhow::bail!("MCP error {}: {}", err.code, err.message);
                    }
                    return Ok(response.result.unwrap_or(serde_json::Value::Null));
                }
                // Response for different id — keep reading
                continue;
            }
            // Check for notification (ignore)
            if let Ok(_notification) = serde_json::from_str::<JsonRpcNotification>(&line) {
                continue;
            }
        }
        anyhow::bail!("MCP transport: child process exited or stdout closed")
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
    fn drop(&mut self) {
        // kill_on_drop handles process cleanup
    }
}
