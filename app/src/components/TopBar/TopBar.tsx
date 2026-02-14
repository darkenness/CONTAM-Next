import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { Play, Save, FolderOpen, Undo2, Redo2, Trash2, Moon, Sun, FileDown } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { toast } from '../../hooks/use-toast';
import { canvasToTopology, validateModel, steadyResultToCSV, transientResultToCSV, downloadAsFile } from '../../model/dataBridge';

export default function TopBar() {
  const { isRunning, clearAll, setResult, setIsRunning, setError, loadFromJson, species, setTransientResult, result, transientResult } = useAppStore();
  const setAppMode = useCanvasStore(s => s.setAppMode);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTransient = species.length > 0;
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const hasResults = result !== null || transientResult !== null;

  const toggleDark = useCallback(() => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  }, [isDark]);

  const handleExportCSV = useCallback(() => {
    if (transientResult) {
      const csv = transientResultToCSV();
      if (csv) downloadAsFile(csv, 'transient_results.csv');
    } else if (result) {
      const csv = steadyResultToCSV();
      if (csv) downloadAsFile(csv, 'steady_results.csv');
    }
  }, [result, transientResult]);

  const handleRun = async () => {
    // Validate model before running
    const { errors, warnings } = validateModel();
    if (errors.length > 0) {
      toast({ title: '模型验证失败', description: errors[0], variant: 'destructive' });
      return;
    }
    if (warnings.length > 0) {
      toast({ title: '模型警告', description: warnings[0] });
    }

    setIsRunning(true);
    setError(null);
    setResult(null);
    setTransientResult(null);

    try {
      // Use canvas geometry → topology bridge
      const topology = canvasToTopology();

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
        setAppMode('results');
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
        setAppMode('results');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      toast({ title: '求解失败', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSave = () => {
    const topology = canvasToTopology();
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
    <header className="h-10 bg-card border-b border-border flex items-center px-2 gap-0.5 shrink-0 select-none">
      {/* Logo mark */}
      <div className="flex items-center gap-1.5 mr-1.5 pl-1">
        <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L11 4V8L6 11L1 8V4L6 1Z" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-primary-foreground"/>
            <circle cx="6" cy="6" r="1.5" fill="currentColor" className="text-primary-foreground"/>
          </svg>
        </div>
        <span className="font-semibold text-foreground text-[13px] tracking-tight leading-none">CONTAM</span>
        <span className="text-muted-foreground text-[10px] font-medium -ml-0.5">Next</span>
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Run simulation */}
      <Button onClick={handleRun} disabled={isRunning} size="sm" className="h-7 gap-1 px-2.5 text-xs font-medium">
        <Play size={12} fill="currentColor" />
        {isRunning ? '计算中...' : (isTransient ? '瞬态仿真' : '稳态求解')}
      </Button>

      {isRunning && (
        <div className="w-16 h-1 bg-muted rounded-full overflow-hidden ml-1">
          <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '100%' }} />
        </div>
      )}

      <div className="w-px h-5 bg-border mx-1" />

      {/* Edit group: Undo/Redo */}
      <div className="flex items-center gap-0">
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => useAppStore.temporal.getState().undo()}>
              <Undo2 size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">撤销 <kbd className="ml-1 px-1 py-0.5 bg-muted rounded text-[10px] font-data">Ctrl+Z</kbd></TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => useAppStore.temporal.getState().redo()}>
              <Redo2 size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">重做 <kbd className="ml-1 px-1 py-0.5 bg-muted rounded text-[10px] font-data">Ctrl+Shift+Z</kbd></TooltipContent>
        </Tooltip>
      </div>

      {/* Export (shown when results exist) */}
      {hasResults && (
        <>
          <div className="w-px h-5 bg-border mx-1" />
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={handleExportCSV}>
                <FileDown size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">导出 CSV</TooltipContent>
          </Tooltip>
        </>
      )}

      <div className="flex-1" />

      {/* Right group: Theme + File ops */}
      <div className="flex items-center gap-0">
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={toggleDark}>
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{isDark ? '浅色模式' : '深色模式'}</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-0.5" />

        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={handleSave}><Save size={14} /></Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">保存</TooltipContent>
        </Tooltip>

        <input ref={fileInputRef} type="file" accept=".json,.contam.json" onChange={handleFileChange} className="hidden" />
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => fileInputRef.current?.click()}><FolderOpen size={14} /></Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">打开</TooltipContent>
        </Tooltip>

        <AlertDialog>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">清空</TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认清空所有数据</AlertDialogTitle>
              <AlertDialogDescription>所有墙壁、区域、气流路径、污染物和排程数据将被永久删除，此操作无法撤销。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={clearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">确认清空</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  );
}
