import { useAppStore } from '../../store/useAppStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { PenLine, FolderOpen, BookOpen, DoorOpen } from 'lucide-react';
import { useRef } from 'react';

interface WelcomePageProps {
  onStart?: () => void;
}

export default function WelcomePage({ onStart }: WelcomePageProps) {
  const { loadFromJson, setError } = useAppStore();
  const setToolMode = useCanvasStore(s => s.setToolMode);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        loadFromJson(json);
        onStart?.();
      } catch (err) {
        setError(`文件解析失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleNewProject = () => {
    setToolMode('wall');
    onStart?.();
  };

  const handleStartEmpty = () => {
    onStart?.();
  };

  const steps = [
    '在 2.5D 等距画布上画墙，围合区域自动生成房间',
    '在墙上放置门窗、风机等气流路径组件',
    '配置污染物种类、排程和控制系统',
    '运行稳态求解或瞬态仿真，查看 2.5D 结果动画',
  ];

  return (
    <div className="flex-1 flex items-center justify-center bg-background relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative flex flex-col items-center gap-8 max-w-[420px] px-8">
        {/* Logo + Title */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L22 8V16L12 22L2 16V8L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-primary-foreground"/>
              <circle cx="12" cy="12" r="3" fill="currentColor" className="text-primary-foreground"/>
              <path d="M12 9V5M12 15V19M9 12H5M15 12H19" stroke="currentColor" strokeWidth="1" className="text-primary-foreground" opacity="0.5"/>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-foreground tracking-tight">CONTAM-Next</h1>
            <p className="text-xs text-muted-foreground mt-0.5">多区域气流与污染物传输仿真</p>
            <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-data text-primary bg-primary/8 rounded">v2.0 · 2.5D</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="w-full grid grid-cols-2 gap-2">
          <button onClick={handleNewProject} className="group flex flex-col items-center gap-2 p-3.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-150">
            <PenLine size={18} className="text-primary" />
            <span className="text-xs font-medium text-foreground">新建项目</span>
            <span className="text-[10px] text-muted-foreground leading-tight">画墙 → 围合 → 仿真</span>
          </button>
          <button onClick={handleStartEmpty} className="group flex flex-col items-center gap-2 p-3.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-150">
            <DoorOpen size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs font-medium text-foreground">空白画布</span>
            <span className="text-[10px] text-muted-foreground leading-tight">自由探索</span>
          </button>
          <button onClick={() => handleStartEmpty()} className="group flex flex-col items-center gap-2 p-3.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-150">
            <BookOpen size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs font-medium text-foreground">示例模型</span>
            <span className="text-[10px] text-muted-foreground leading-tight">即将推出</span>
          </button>
          <button onClick={handleOpen} className="group flex flex-col items-center gap-2 p-3.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-150">
            <FolderOpen size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs font-medium text-foreground">打开文件</span>
            <span className="text-[10px] text-muted-foreground leading-tight">.contam.json</span>
          </button>
        </div>

        {/* Workflow steps */}
        <div className="w-full">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">工作流程</h3>
          <div className="space-y-0">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1.5 border-l-2 border-border pl-3 ml-1 hover:border-primary/40 transition-colors">
                <span className="font-data text-[10px] text-primary font-semibold mt-px">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".json,.contam.json" onChange={handleFileChange} className="hidden" />
      </div>
    </div>
  );
}
