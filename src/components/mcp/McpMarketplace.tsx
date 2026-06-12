import { useState } from "react";
import { FolderOpen, Terminal, Globe, GitBranch, Download, Check, Loader } from "lucide-react";
import { addMcpServer } from "../../lib/tauri";

interface Template {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  command: string;
  args: string;
}

const TEMPLATES: Template[] = [
  {
    id: "filesystem",
    name: "文件系统",
    desc: "读写桌面文件，创建、搜索、编辑文本",
    icon: <FolderOpen size={20} />,
    command: "npx",
    args: "-y @modelcontextprotocol/server-filesystem ~/Desktop",
  },
  {
    id: "shell",
    name: "Shell 终端",
    desc: "执行终端命令，运行脚本",
    icon: <Terminal size={20} />,
    command: "npx",
    args: "-y super-shell-mcp",
  },
  {
    id: "browser",
    name: "网页浏览器",
    desc: "打开网页、截图、抓取内容",
    icon: <Globe size={20} />,
    command: "npx",
    args: "-y @anthropic/mcp-server-puppeteer",
  },
  {
    id: "github",
    name: "GitHub",
    desc: "管理仓库、Issue、PR",
    icon: <GitBranch size={20} />,
    command: "npx",
    args: "-y @anthropic/mcp-server-github",
  },
];

export function McpMarketplace() {
  const [installing, setInstalling] = useState<Record<string, boolean>>({});
  const [installed, setInstalled] = useState<Record<string, boolean>>({});

  const handleInstall = async (tpl: Template) => {
    setInstalling((prev) => ({ ...prev, [tpl.id]: true }));
    try {
      await addMcpServer(tpl.name, tpl.command, tpl.args);
      setInstalled((prev) => ({ ...prev, [tpl.id]: true }));
    } catch (e) {
      console.error("Install failed:", e);
    } finally {
      setInstalling((prev) => ({ ...prev, [tpl.id]: false }));
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-white/40 text-xs">点击安装即可自动配置，无需手动填写命令</p>
      {TEMPLATES.map((tpl) => {
        const isInstalled = installed[tpl.id];
        const isInstalling = installing[tpl.id];
        return (
          <div
            key={tpl.id}
            className="flex items-center gap-3 px-3 py-3 bg-white/5 rounded-lg hover:bg-white/[0.07] transition-colors"
          >
            <div className="text-white/60 shrink-0">{tpl.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium">{tpl.name}</div>
              <div className="text-white/40 text-xs truncate">{tpl.desc}</div>
            </div>
            <button
              onClick={() => handleInstall(tpl)}
              disabled={isInstalling || isInstalled}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isInstalled
                  ? "bg-green-600/20 text-green-400"
                  : "bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
              }`}
            >
              {isInstalling ? (
                <Loader size={12} className="animate-spin" />
              ) : isInstalled ? (
                <Check size={12} />
              ) : (
                <Download size={12} />
              )}
              {isInstalled ? "已安装" : isInstalling ? "安装中" : "安装"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
