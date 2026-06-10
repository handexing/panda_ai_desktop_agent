import { PandaWindow } from "./components/panda/PandaWindow";
import { useChat } from "./hooks/useChat";
import { useConfig } from "./hooks/useConfig";

function App() {
  useChat();
  useConfig();

  return <PandaWindow />;
}

export default App;
