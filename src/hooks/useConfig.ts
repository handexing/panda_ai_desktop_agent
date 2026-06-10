export function useConfig() {
  // Check if config is empty on mount to potentially show setup prompt
  const checkConfig = async () => {
    const { getConfig } = await import("../lib/tauri");
    const key = await getConfig("llm_api_key");
    if (!key) {
      // No API key configured — user can set it up via the config panel
      // Don't show modal automatically, just let the UI handle it
    }
  };

  // Run once on mount
  if (typeof window !== "undefined") {
    // Use setTimeout to avoid async issues in render
    setTimeout(checkConfig, 1000);
  }
}
