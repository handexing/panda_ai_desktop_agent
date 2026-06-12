import { PandaWindow } from "./components/panda/PandaWindow";
import { ChatWindow } from "./components/chat/ChatWindow";
import { ConfigWindow } from "./components/config/ConfigWindow";
import { GraphWindow } from "./components/graph/GraphWindow";
import { KnowledgeWindow } from "./components/knowledge/KnowledgeWindow";
import { McpWindow } from "./components/mcp/McpWindow";
import { ReminderWindow } from "./components/reminder/ReminderWindow";

function App() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  if (view === "chat") return <ChatWindow />;
  if (view === "config") return <ConfigWindow />;
  if (view === "graph") return <GraphWindow />;
  if (view === "knowledge") return <KnowledgeWindow />;
  if (view === "mcp") return <McpWindow />;
  if (view === "reminder") return <ReminderWindow />;
  return <PandaWindow />;
}

export default App;
