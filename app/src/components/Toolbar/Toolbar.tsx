import { useAppStore } from '../../store/useAppStore';
import type { ToolMode } from '../../types';
import { MousePointer2, Square, Cloud, Link2, Play, Trash2, Save, FolderOpen } from 'lucide-react';

const tools: { mode: ToolMode; icon: React.ReactNode; label: string; tip: string }[] = [
  { mode: 'select', icon: <MousePointer2 size={18} />, label: '选择', tip: '选择并移动元素' },
  { mode: 'addRoom', icon: <Square size={18} />, label: '房间', tip: '点击画布添加房间' },
  { mode: 'addAmbient', icon: <Cloud size={18} />, label: '室外', tip: '添加室外环境节点' },
  { mode: 'addLink', icon: <Link2 size={18} />, label: '连接', tip: '点击两个节点创建气流路径' },
];

export default function Toolbar() {
  const { toolMode, setToolMode, isRunning, clearAll, exportTopology, setResult, setIsRunning, setError } = useAppStore();

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const topology = exportTopology();

      // In Tauri: call engine via IPC command
      // In browser dev mode: use mock or fetch API
      if (window.__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const resultJson = await invoke<string>('run_engine', { input: JSON.stringify(topology) });
        setResult(JSON.parse(resultJson));
      } else {
        // Browser dev mode: mock solve with a simple response
        await new Promise((r) => setTimeout(r, 500));
        setResult({
          solver: { converged: true, iterations: 0, maxResidual: 0 },
          nodes: topology.nodes.map((n) => ({
            id: n.id, name: n.name,
            pressure: n.type === 'ambient' ? 0 : -0.5 + Math.random(),
            density: n.temperature ? 101325 / (287.055 * n.temperature) : 1.2,
            temperature: n.temperature ?? 293.15,
            elevation: n.elevation ?? 0,
          })),
          links: topology.links.map((l) => ({
            id: l.id, from: l.from, to: l.to,
            massFlow: (Math.random() - 0.5) * 0.001,
            volumeFlow_m3s: (Math.random() - 0.5) * 0.001,
          })),
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsRunning(false);
    }
  };

  const handleSave = () => {
    const topology = exportTopology();
    const blob = new Blob([JSON.stringify(topology, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.contam.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="h-12 bg-white border-b border-slate-200 flex items-center px-3 gap-1 shrink-0 select-none">
      {/* Logo */}
      <span className="font-bold text-blue-600 text-sm mr-3 tracking-tight">CONTAM-Next</span>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-200 mx-1" />

      {/* Tool buttons */}
      {tools.map((t) => (
        <button
          key={t.mode}
          onClick={() => setToolMode(t.mode)}
          title={t.tip}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
            ${toolMode === t.mode
              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}

      {/* Divider */}
      <div className="w-px h-6 bg-slate-200 mx-1" />

      {/* Actions */}
      <button
        onClick={handleRun}
        disabled={isRunning}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <Play size={14} fill="currentColor" />
        {isRunning ? '计算中...' : '运行'}
      </button>

      <div className="flex-1" />

      {/* File operations */}
      <button onClick={handleSave} title="保存模型" className="p-1.5 rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-700">
        <Save size={16} />
      </button>
      <button title="打开模型" className="p-1.5 rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-700">
        <FolderOpen size={16} />
      </button>
      <button onClick={clearAll} title="清空全部" className="p-1.5 rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600">
        <Trash2 size={16} />
      </button>
    </header>
  );
}
