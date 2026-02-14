import { useAppStore } from '../../store/useAppStore';
import { Play, Save, FolderOpen, Undo2, Redo2, Trash2, Moon, Sun } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { toast } from '../../hooks/use-toast';

export default function TopBar() {
  const { isRunning, clearAll, exportTopology, setResult, setIsRunning, setError, loadFromJson, species, setTransientResult } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTransient = species.length > 0;
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  const toggleDark = useCallback(() => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  }, [isDark]);

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setTransientResult(null);

    try {
      const topology = exportTopology();

      if (window.__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const resultJson = await invoke<string>('run_engine', { input: JSON.stringify(topology) });
        const parsed = JSON.parse(resultJson);
        if (parsed.timeSeries) {
          setTransientResult(parsed);
        } else {
          setResult(parsed);
        }
        toast({ title: '求解完成', description: parsed.timeSeries ? `瞬态仿真完成，${parsed.totalSteps} 步` : '稳态收敛', variant: 'success' });
      } else {
        await new Promise((r) => setTimeout(r, 500));
        if (isTransient) {
          const numSteps = 10;
          const timeSeries = Array.from({ length: numSteps }, (_, i) => ({
            time: i * 60,
            airflow: { converged: true, iterations: 5, pressures: topology.nodes.map((n) => n.type === 'ambient' ? 0 : -0.3), massFlows: topology.links.map(() => 0.0005) },
            concentrations: topology.nodes.map((n) =>
              topology.species?.map((_, si) => n.type === 'ambient' ? (topology.species?.[si]?.outdoorConcentration ?? 0) : i * 1e-5) ?? []
            ),
          }));
          setTransientResult({
            completed: true, totalSteps: numSteps,
            species: topology.species?.map((s) => ({ id: s.id, name: s.name, molarMass: s.molarMass })) ?? [],
            nodes: topology.nodes.map((n) => ({ id: n.id, name: n.name, type: n.type })),
            timeSeries,
          });
        } else {
          setResult({
            solver: { converged: true, iterations: 0, maxResidual: 0 },
            nodes: topology.nodes.map((n) => ({
              id: n.id, name: n.name,
              pressure: n.type === 'ambient' ? 0 : -0.5 + Math.random(),
              density: n.temperature ? 101325 / (287.055 * n.temperature) : 1.2,
              temperature: n.temperature ?? 293.15, elevation: n.elevation ?? 0,
            })),
            links: topology.links.map((l) => ({
              id: l.id, from: l.from, to: l.to,
              massFlow: (Math.random() - 0.5) * 0.001,
              volumeFlow_m3s: (Math.random() - 0.5) * 0.001,
            })),
          });
        }
        toast({ title: '求解完成', variant: 'success' });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      toast({ title: '求解失败', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSave = () => {
    const topology = exportTopology();
    const blob = new Blob([JSON.stringify(topology, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'model.contam.json'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: '已保存', description: 'model.contam.json' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        loadFromJson(json);
        toast({ title: '已加载', description: file.name });
      } catch (err) {
        setError(`文件解析失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="h-11 bg-card border-b border-border flex items-center px-3 gap-1 shrink-0 select-none">
      {/* Logo */}
      <div className="flex items-center gap-1.5 mr-2">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-[9px] font-black text-white leading-none">C</div>
        <span className="font-semibold text-foreground text-sm tracking-tight">CONTAM-Next</span>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Run */}
      <Button onClick={handleRun} disabled={isRunning} size="sm" className="gap-1.5">
        <Play size={14} fill="currentColor" />
        {isRunning ? '计算中...' : (isTransient ? '瞬态仿真' : '稳态求解')}
      </Button>

      {isRunning && (
        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '100%' }} />
        </div>
      )}

      <div className="w-px h-6 bg-border mx-1" />

      {/* Undo/Redo */}
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={() => useAppStore.temporal.getState().undo()}>
            <Undo2 size={15} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>撤销 (Ctrl+Z)</TooltipContent>
      </Tooltip>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={() => useAppStore.temporal.getState().redo()}>
            <Redo2 size={15} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>重做 (Ctrl+Shift+Z)</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {/* Theme toggle */}
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={toggleDark}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isDark ? '切换到浅色模式' : '切换到深色模式'}</TooltipContent>
      </Tooltip>

      <div className="w-px h-6 bg-border mx-1" />

      {/* File ops */}
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={handleSave}><Save size={15} /></Button>
        </TooltipTrigger>
        <TooltipContent>保存模型</TooltipContent>
      </Tooltip>

      <input ref={fileInputRef} type="file" accept=".json,.contam.json" onChange={handleFileChange} className="hidden" />
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={() => fileInputRef.current?.click()}><FolderOpen size={15} /></Button>
        </TooltipTrigger>
        <TooltipContent>打开模型</TooltipContent>
      </Tooltip>

      <AlertDialog>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="hover:bg-destructive/10 hover:text-destructive"><Trash2 size={15} /></Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>清空全部</TooltipContent>
        </Tooltip>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清空</AlertDialogTitle>
            <AlertDialogDescription>此操作将删除所有节点、路径、污染物和排程数据，且无法撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={clearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">确认清空</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
