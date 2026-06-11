import { useState, useEffect } from "react";
import { Trash2, FileText, Upload } from "lucide-react";
import * as api from "../../lib/tauri";

interface KnowledgeFile {
  file_name: string;
  chunk_count: number;
}

export function KnowledgeContent() {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listKnowledgeFiles().then(setFiles).catch(console.error);
  }, []);

  const handleImport = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ multiple: false });
      if (!selected) return;
      setImporting(true);
      setError(null);
      await api.importFile(selected);
      setFiles(await api.listKnowledgeFiles());
    } catch (e) {
      setError(String(e));
      console.error("Import failed:", e);
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      await api.deleteKnowledgeFile(fileName);
      setFiles((prev) => prev.filter((f) => f.file_name !== fileName));
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  return (
    <>
      {/* Import button */}
      <div className="px-4 py-3 border-b border-white/10">
        <button
          onClick={handleImport}
          disabled={importing}
          className="flex items-center gap-2 w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm rounded-lg transition-colors"
        >
          <Upload size={14} />
          {importing ? "导入中..." : "导入文件"}
        </button>
        {error && (
          <p className="text-red-400 text-xs mt-2">{error}</p>
        )}
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {files.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">暂无文件</p>
        ) : (
          files.map((f) => (
            <div
              key={f.file_name}
              className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={14} className="text-white/40 shrink-0" />
                <span className="text-white/80 text-sm truncate">{f.file_name}</span>
              </div>
              <button
                onClick={() => handleDelete(f.file_name)}
                className="text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
