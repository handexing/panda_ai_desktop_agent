import { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { RefreshCw, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import * as d3Force from "d3-force";
import * as d3Drag from "d3-drag";
import * as d3Selection from "d3-selection";

interface Node {
  id: number; name: string; node_type: string;
}
interface Edge {
  id: number; from_node_id: number; to_node_id: number; relation: string;
}
interface SimNode extends d3Force.SimulationNodeDatum {
  id: number; name: string; node_type: string;
}
interface SimLink extends d3Force.SimulationLinkDatum<SimNode> {
  id: number; relation: string;
}

const TYPE_COLORS: Record<string, string> = {
  person: "#4ade80", file: "#60a5fa", project: "#f472b6",
  topic: "#fbbf24", tool: "#a78bfa",
};
const TYPE_LABELS: Record<string, string> = {
  person: "人物", file: "文件", project: "项目", topic: "话题", tool: "工具",
};

const isMac = navigator.userAgent.includes("Mac");

export function GraphWindow() {
  const win = getCurrentWindow();
  const svgRef = useRef<SVGSVGElement>(null);
  const [rawNodes, setRawNodes] = useState<Node[]>([]);
  const [rawEdges, setRawEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const simRef = useRef<d3Force.Simulation<SimNode, SimLink> | null>(null);

  const loadGraph = async () => {
    try {
      const data: { nodes: Node[]; edges: Edge[] } = await invoke("get_graph");
      setRawNodes(data.nodes);
      setRawEdges(data.edges);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadGraph(); }, []);

  // Build force simulation whenever data changes
  useEffect(() => {
    if (rawNodes.length === 0 || !svgRef.current) return;
    if (simRef.current) { simRef.current.stop(); }

    const svg = d3Selection.select(svgRef.current);
    const width = svgRef.current.clientWidth || 400;
    const height = svgRef.current.clientHeight || 450;
    svg.selectAll("*").remove();

    const simNodes: SimNode[] = rawNodes.map((n) => ({
      id: n.id, name: n.name, node_type: n.node_type,
    }));
    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = rawEdges
      .filter((e) => nodeMap.has(e.from_node_id) && nodeMap.has(e.to_node_id))
      .map((e) => ({ id: e.id, relation: e.relation, source: e.from_node_id, target: e.to_node_id }));

    const simulation = d3Force.forceSimulation<SimNode>(simNodes)
      .force("link", d3Force.forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id).distance(100))
      .force("charge", d3Force.forceManyBody().strength(-350))
      .force("center", d3Force.forceCenter(width / 2, height / 2))
      .force("collision", d3Force.forceCollide<SimNode>().radius(28))
      .force("bounds", () => {
        const pad = 30;
        for (const n of simNodes) {
          n.x = Math.max(pad, Math.min(width - pad, n.x ?? width / 2));
          n.y = Math.max(pad, Math.min(height - pad, n.y ?? height / 2));
        }
      })
      .alphaDecay(0.015);
    simRef.current = simulation;

    // Links
    const linkG = svg.append("g");
    const linkLines = linkG.selectAll<SVGLineElement, SimLink>("line").data(simLinks).join("line")
      .attr("stroke", "#ffffff18").attr("stroke-width", 1.5);
    const linkLabels = linkG.selectAll<SVGTextElement, SimLink>("text").data(simLinks).join("text")
      .text((d) => d.relation)
      .attr("fill", "#ffffff30").attr("font-size", 9).attr("text-anchor", "middle").attr("dy", -5);

    // Nodes
    const nodeG = svg.append("g");
    const nodeGroups = nodeG.selectAll<SVGGElement, SimNode>("g").data(simNodes).join("g")
      .attr("cursor", "grab")
      .on("click", (_e: any, d: SimNode) => {
        const node = rawNodes.find((n) => n.id === d.id) || null;
        setSelectedNode((prev) => (prev?.id === node?.id ? null : node));
      });

    nodeGroups.append("circle")
      .attr("r", 16).attr("fill", (d) => TYPE_COLORS[d.node_type] || "#999")
      .attr("opacity", 0.85).attr("stroke", "#ffffff20").attr("stroke-width", 1);

    nodeGroups.append("text")
      .text((d) => d.name.length > 6 ? d.name.slice(0, 6) + ".." : d.name)
      .attr("fill", "#ffffffcc").attr("font-size", 10).attr("text-anchor", "middle").attr("dy", 28);

    // Drag
    const drag = d3Drag.drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x; d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
      });
    nodeGroups.call(drag as any);

    // Highlight helper
    const highlight = (nodeId: number | null) => {
      const connected = nodeId
        ? new Set(rawEdges.filter((e) => e.from_node_id === nodeId || e.to_node_id === nodeId)
            .flatMap((e) => [e.from_node_id, e.to_node_id]))
        : null;

      nodeGroups.select("circle").attr("opacity", (d: any) => {
        if (!connected) return 0.85;
        return connected.has(d.id) ? 0.9 : 0.15;
      });
      linkLines.attr("stroke", (d: any) => {
        if (!connected) return "#ffffff18";
        const s = (d.source as SimNode).id;
        const t = (d.target as SimNode).id;
        return (connected.has(s) && connected.has(t)) ? "#ffffff40" : "#ffffff06";
      }).attr("stroke-width", (d: any) => {
        if (!connected) return 1.5;
        const s = (d.source as SimNode).id;
        const t = (d.target as SimNode).id;
        return (connected.has(s) && connected.has(t)) ? 2.5 : 0.5;
      });
      linkLabels.attr("fill", (d: any) => {
        if (!connected) return "#ffffff30";
        const s = (d.source as SimNode).id;
        const t = (d.target as SimNode).id;
        return (connected.has(s) && connected.has(t)) ? "#ffffff60" : "#ffffff08";
      });
    };

    nodeGroups.on("mouseenter", (_e: any, d: SimNode) => highlight(d.id));
    nodeGroups.on("mouseleave", () => highlight(null));

    simulation.on("tick", () => {
      linkLines
        .attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      linkLabels
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);
      nodeGroups.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [rawNodes, rawEdges]);

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
    setRawNodes([]); setRawEdges([]); setMsg(""); setSelectedNode(null);
  };

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
        {msg && <span className="text-white/40 text-xs ml-1">{msg}</span>}
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 bg-gray-950 relative">
          {rawNodes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white/30 text-sm">
              点击「提取图谱」从对话中生成
            </div>
          ) : (
            <svg ref={svgRef} width="100%" height="100%" />
          )}
        </div>

        {selectedNode && (
          <div className="w-48 border-l border-white/10 bg-gray-800/80 shrink-0 overflow-y-auto p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: TYPE_COLORS[selectedNode.node_type] || "#999" }} />
              <div>
                <div className="text-white text-sm font-medium">{selectedNode.name}</div>
                <div className="text-white/40 text-xs">{TYPE_LABELS[selectedNode.node_type] || selectedNode.node_type}</div>
              </div>
            </div>

            <button onClick={() => setSelectedNode(null)}
              className="text-white/30 hover:text-white/60 text-xs mb-3">
              ← 返回全图
            </button>

            <h4 className="text-white/50 text-xs font-medium mb-2">关联关系</h4>
            <div className="space-y-2">
              {rawEdges
                .filter((e) => e.from_node_id === selectedNode.id || e.to_node_id === selectedNode.id)
                .map((e) => {
                  const otherId = e.from_node_id === selectedNode.id ? e.to_node_id : e.from_node_id;
                  const otherNode = rawNodes.find((n) => n.id === otherId);
                  const dir = e.from_node_id === selectedNode.id ? "→" : "←";
                  return (
                    <div key={e.id} className="flex items-center gap-1.5 text-xs">
                      <span className="text-white/30">{dir}</span>
                      <span className="text-white/60 truncate">{otherNode?.name || "?"}</span>
                      <span className="text-white/30 ml-auto">{e.relation}</span>
                    </div>
                  );
                })}
              {rawEdges.filter((e) => e.from_node_id === selectedNode.id || e.to_node_id === selectedNode.id).length === 0 && (
                <p className="text-white/30 text-xs">暂无关联</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
