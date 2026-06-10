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
