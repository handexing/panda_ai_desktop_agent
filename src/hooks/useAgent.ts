import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { usePandaStore } from "../stores/pandaStore";
import type { TraceStep } from "../lib/tauri";

export function useAgent() {
  useEffect(() => {
    const unlisten = listen<{ step: TraceStep }>(
      "agent:trace",
      (event) => {
        const store = usePandaStore.getState();
        store.addTraceStep(event.payload.step);
        if (event.payload.step.type === "done" || event.payload.step.type === "error") {
          store.setIsStreaming(false);
          store.setPandaState("idle");
        }
      },
    );
    return () => { unlisten.then((fn) => fn()); };
  }, []);
}
