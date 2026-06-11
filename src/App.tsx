import { PandaWindow } from "./components/panda/PandaWindow";
import { ChatWindow } from "./components/chat/ChatWindow";
import { ConfigWindow } from "./components/config/ConfigWindow";
import { KnowledgeWindow } from "./components/knowledge/KnowledgeWindow";

function App() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  if (view === "chat") return <ChatWindow />;
  if (view === "config") return <ConfigWindow />;
  if (view === "knowledge") return <KnowledgeWindow />;
  return <PandaWindow />;
}

export default App;
