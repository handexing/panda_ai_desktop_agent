import { PandaWindow } from "./components/panda/PandaWindow";
import { ChatWindow } from "./components/chat/ChatWindow";

function App() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("view") === "chat") {
    return <ChatWindow />;
  }
  return <PandaWindow />;
}

export default App;
