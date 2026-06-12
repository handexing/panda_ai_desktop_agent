import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { RefreshCw, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface Node {
  id: number; name: string; node_type: string;
}
interface Edge {
  id: number; from_node_id: number; to_node_id: number; relation: string;
}

const TYPE_COLORS: Record<string, string> = {
  person: "#4ade80", file: "#60a5fa", project: "#f472b6",
  topic: "#fbbf24", tool: "#a78bfa",
};

const isMac = navigator.userAgent.includes("Mac");

export function GraphWindow() {
  const win = getCurrentWindow();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const loadGraph = async () => {
    try {
      const data: { nodes: Node[]; edges: Edge[] } = await invoke("get_graph");
      setNodes(data.nodes);
      setEdges(data.edges);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadGraph(); }, []);

  const handleExtract = async () => {
    setLoading(true); setMsg("提取中...");
    try {
      const result: string = await invoke("extract_graph");
      setMsg(result);
      await loadGraph();
    } catch (e) { setMsg(String(e)); }
    finally { setLoading(false); }
  };

  const handleClear = async () => {
    await invoke("clear_graph");
    setNodes([]); setEdges([]); setMsg("");
  };

  // Calculate circle layout positions
  const cx = 190, cy = 180, radius = 140;
  const positions: Record<number, {x: number; y: number}> = {};
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    positions[n.id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });

  return (
    <div className="flex flex-col h-screen bg-gray-900 rounded-2xl overflow-hidden">
      <div className="relative flex items-center h-10 bg-gray-800/80 shrink-0 select-none" data-tauri-drag-region="true">
        {isMac && (
          <div className="flex items-center gap-1.5 pl-3">
            <button onClick={() => win.close()} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400" />
            <button onClick={() => win.minimize()} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400" />
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center text-sm text-white/70 font-medium pointer-events-none select-none">
          知识图谱
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 shrink-0">
        <button onClick={handleExtract} disabled={loading}
          className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs rounded-lg">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {loading ? "提取中" : "提取图谱"}
        </button>
        <button onClick={handleClear}
          className="flex items-center gap-1 px-3 py-1 text-white/50 hover:text-red-400 text-xs rounded-lg hover:bg-white/10">
          <Trash2 size={12} />清空
        </button>
        {msg && <span className="text-white/50 text-xs">{msg}</span>}
      </div>

      {/* Graph canvas */}
      <div className="flex-1 bg-gray-950 overflow-hidden">
        {nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/30 text-sm">
            暂无图谱数据，点击「提取图谱」从对话中提取
          </div>
        ) : (
          <svg width="100%" height="100%" viewBox="0 0 380 400">
            {/* Edges */}
            {edges.map((e) => {
              const from = positions[e.from_node_id];
              const to = positions[e.to_node_id];
              if (!from || !to) return null;
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;
              return (
                <g key={e.id}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#ffffff20" strokeWidth={1} />
                  <text x={midX} y={midY} fill="#ffffff40" fontSize={9} textAnchor="middle" dy={-4}>{e.relation}</text>
                </g>
              );
            })}
            {/* Nodes */}
            {nodes.map((n) => {
              const p = positions[n.id];
              if (!p) return null;
              return (
                <g key={n.id}>
                  <circle cx={p.x} cy={p.y} r={14} fill={TYPE_COLORS[n.node_type] || "#999"} opacity={0.9} />
                  <text x={p.x} y={p.y + 24} fill="#ffffff80" fontSize={10} textAnchor="middle">{n.name}</text>
                  <text x={p.x} y={p.y + 36} fill="#ffffff40" fontSize={8} textAnchor="middle">{n.node_type}</text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
