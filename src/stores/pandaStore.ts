import { create } from "zustand";
import type { Conversation, Message } from "../lib/tauri";

export type PandaState =
  | "idle"
  | "thinking"
  | "error"
  | "coffee"
  | "flipbook"
  | "type"
  | "sleep"
  | "talk"
  | "raisepaw"
  | "happy"
  | "angry";

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
