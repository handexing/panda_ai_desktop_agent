import { useState, useEffect } from "react";
import { usePandaStore } from "../../stores/pandaStore";
import { getConfig, setConfig, testApiConnection } from "../../lib/tauri";

export function ConfigPanel() {
  const open = usePandaStore((s) => s.configOpen);
  const setOpen = usePandaStore((s) => s.setConfigOpen);

  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "fail" | null>(null);

  useEffect(() => {
    if (open) {
      getConfig("llm_base_url").then((v) => setBaseUrl(v || "https://api.deepseek.com"));
      getConfig("llm_api_key").then((v) => setApiKey(v || ""));
      getConfig("llm_model").then((v) => setModel(v || "deepseek-chat"));
    }
  }, [open]);

  const handleSave = async () => {
    await setConfig("llm_base_url", baseUrl);
    await setConfig("llm_api_key", apiKey);
    await setConfig("llm_model", model);
    setOpen(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await testApiConnection(baseUrl, apiKey, model);
      setTestResult(ok ? "success" : "fail");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center pointer-events-auto">
      <div className="bg-gray-800 rounded-2xl p-6 w-[90vw] max-w-md mx-auto">
        <h2 className="text-white text-lg font-medium mb-4">API 配置</h2>

        <label className="block text-sm text-white/60 mb-1">Base URL</label>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full bg-white/5 text-white rounded-lg px-3 py-2 mb-3 outline-none text-sm"
          placeholder="https://api.deepseek.com"
        />

        <label className="block text-sm text-white/60 mb-1">API Key</label>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          type="password"
          className="w-full bg-white/5 text-white rounded-lg px-3 py-2 mb-3 outline-none text-sm"
          placeholder="sk-xxx"
        />

        <label className="block text-sm text-white/60 mb-1">模型</label>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full bg-white/5 text-white rounded-lg px-3 py-2 mb-4 outline-none text-sm"
          placeholder="deepseek-chat"
        />

        {testResult === "success" && (
          <p className="text-green-400 text-sm mb-3">✅ 连接成功</p>
        )}
        {testResult === "fail" && (
          <p className="text-red-400 text-sm mb-3">❌ 连接失败，请检查配置</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {testing ? "测试中..." : "测试连接"}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
          >
            保存
          </button>
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-sm rounded-lg transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
