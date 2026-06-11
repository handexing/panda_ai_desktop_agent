import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { usePandaStore } from "../stores/pandaStore";
import type { PandaState } from "../stores/pandaStore";

export function usePandaEvents() {
  useEffect(() => {
    const unlisten = listen<{ state: string; message?: string }>(
      "panda:state",
      (event) => {
        const store = usePandaStore.getState();
        store.setPandaState(event.payload.state as PandaState);
        if (event.payload.message) {
          store.setErrorMessage(event.payload.message);
          setTimeout(() => store.setErrorMessage(null), 5000);
        }
      },
    );
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);
}
