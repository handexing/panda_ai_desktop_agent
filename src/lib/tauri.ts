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

export async function streamMultimodalChat(
  conversationId: string,
  message: string,
  images: string[],
): Promise<void> {
  return invoke("stream_multimodal_chat", { conversationId, message, images });
}

// File
export async function extractFileText(filePath: string): Promise<string> {
  return invoke("extract_file_text", { filePath });
}

export async function imageToBase64(filePath: string): Promise<string> {
  return invoke("image_to_base64", { filePath });
}

// Knowledge base
export interface KnowledgeFile {
  file_name: string;
  chunk_count: number;
}

export interface SearchResult {
  text: string;
  file_name: string;
  score: number;
}

export async function importFile(filePath: string): Promise<KnowledgeFile> {
  return invoke("import_file", { filePath });
}

export async function listKnowledgeFiles(): Promise<KnowledgeFile[]> {
  return invoke("list_knowledge_files");
}

export async function deleteKnowledgeFile(fileName: string): Promise<void> {
  return invoke("delete_knowledge_file", { fileName });
}

export async function searchKnowledge(query: string, topK?: number): Promise<SearchResult[]> {
  return invoke("search_knowledge", { query, topK });
}

// Agent
export interface TraceStep {
  type: "planning" | "executing" | "observing" | "done" | "error";
  detail?: string | { tool: string } | { result: string } | { text: string } | { message: string };
}

export async function streamAgentChat(
  conversationId: string,
  message: string,
): Promise<void> {
  return invoke("stream_agent_chat", { conversationId, message });
}

// Voice
export async function ttsSpeak(text: string): Promise<string> {
  return invoke("tts_speak", { text });
}

// MCP servers
export interface McpServer {
  id: string;
  name: string;
  command: string;
  args: string;
}

export async function listMcpServers(): Promise<McpServer[]> {
  return invoke("list_mcp_servers");
}

export async function addMcpServer(
  name: string, command: string, args: string,
): Promise<McpServer> {
  return invoke("add_mcp_server", { name, command, args });
}

export async function deleteMcpServer(id: string): Promise<void> {
  return invoke("delete_mcp_server", { id });
}
