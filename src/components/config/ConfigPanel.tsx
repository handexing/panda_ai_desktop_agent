import { useState, useEffect } from "react";
import { usePandaStore } from "../../stores/pandaStore";
import { getConfig, setConfig, testApiConnection } from "../../lib/tauri";
import { FileText } from "lucide-react";

export function ConfigPanel() {
  const open = usePandaStore((s) => s.configOpen);
  const setOpen = usePandaStore((s) => s.setConfigOpen);
  const setKnowledgePanelOpen = usePandaStore((s) => s.setKnowledgePanelOpen);

  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "fail" | null>(null);

  const [embBaseUrl, setEmbBaseUrl] = useState("");
  const [embApiKey, setEmbApiKey] = useState("");
  const [embModel, setEmbModel] = useState("");
  const [kbEnabled, setKbEnabled] = useState(false);

  useEffect(() => {
    if (open) {
      getConfig("llm_base_url").then((v) => setBaseUrl(v || "https://api.deepseek.com"));
      getConfig("llm_api_key").then((v) => setApiKey(v || ""));
      getConfig("llm_model").then((v) => setModel(v || "deepseek-chat"));
      getConfig("embedding_base_url").then((v) => setEmbBaseUrl(v || ""));
      getConfig("embedding_api_key").then((v) => setEmbApiKey(v || ""));
      getConfig("embedding_model").then((v) => setEmbModel(v || "text-embedding-ada-002"));
      getConfig("knowledge_base_enabled").then((v) => setKbEnabled(v === "true"));
    }
  }, [open]);

  const handleSave = async () => {
    await setConfig("llm_base_url", baseUrl);
    await setConfig("llm_api_key", apiKey);
    await setConfig("llm_model", model);
    await setConfig("embedding_base_url", embBaseUrl);
    await setConfig("embedding_api_key", embApiKey);
    await setConfig("embedding_model", embModel);
    await setConfig("knowledge_base_enabled", kbEnabled ? "true" : "false");
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
      <div className="bg-gray-800 rounded-2xl p-6 w-[90vw] max-w-md mx-auto max-h-[85vh] flex flex-col">
        <h2 className="text-white text-lg font-medium mb-4 shrink-0">API 配置</h2>
        <div className="overflow-y-auto flex-1 min-h-0">

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

          <div className="border-t border-white/10 pt-4 mt-4 mb-4">
            <h3 className="text-white/70 text-sm font-medium mb-3">Embedding 配置（知识库）</h3>

            <label className="block text-sm text-white/60 mb-1">Embedding Base URL</label>
            <input
              value={embBaseUrl}
              onChange={(e) => setEmbBaseUrl(e.target.value)}
              className="w-full bg-white/5 text-white rounded-lg px-3 py-2 mb-3 outline-none text-sm"
              placeholder={baseUrl || "https://api.openai.com/v1"}
            />

            <label className="block text-sm text-white/60 mb-1">Embedding API Key</label>
            <input
              value={embApiKey}
              onChange={(e) => setEmbApiKey(e.target.value)}
              type="password"
              className="w-full bg-white/5 text-white rounded-lg px-3 py-2 mb-3 outline-none text-sm"
              placeholder="sk-xxx"
            />

            <label className="block text-sm text-white/60 mb-1">Embedding Model</label>
            <input
              value={embModel}
              onChange={(e) => setEmbModel(e.target.value)}
              className="w-full bg-white/5 text-white rounded-lg px-3 py-2 mb-3 outline-none text-sm"
              placeholder="text-embedding-ada-002"
            />

            <label className="flex items-center gap-2 text-sm text-white/60 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={kbEnabled}
                onChange={(e) => setKbEnabled(e.target.checked)}
                className="rounded"
              />
              启用知识库检索增强
            </label>

            <button
              onClick={() => { setKnowledgePanelOpen(true); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors"
            >
              <FileText size={16} />
              管理知识库
            </button>
          </div>

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
          </div>
        </div>
        <div className="shrink-0 mt-3">
          <button
            onClick={() => setOpen(false)}
            className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-sm rounded-lg transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
