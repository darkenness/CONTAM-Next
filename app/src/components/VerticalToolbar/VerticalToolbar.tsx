import { useCanvasStore, type ToolMode } from '../../store/useCanvasStore';
import { MousePointer2, PenLine, DoorOpen, SquareAsterisk, Eraser } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useEffect } from 'react';

const tools: { mode: ToolMode; icon: React.ReactNode; label: string; tip: string; shortcut: string }[] = [
  { mode: 'select', icon: <MousePointer2 size={18} />, label: '选择', tip: '选择/移动墙壁和区域', shortcut: '1' },
  { mode: 'wall', icon: <PenLine size={18} />, label: '画墙', tip: '点击画墙，围合区域自动生成房间', shortcut: '2' },
  { mode: 'door', icon: <DoorOpen size={18} />, label: '门', tip: '在墙上放置门/气流路径', shortcut: '3' },
  { mode: 'window', icon: <SquareAsterisk size={18} />, label: '窗', tip: '在墙上放置窗户', shortcut: '4' },
  { mode: 'erase', icon: <Eraser size={18} />, label: '删除', tip: '点击删除墙壁或组件', shortcut: '5' },
];

export default function VerticalToolbar() {
  const toolMode = useCanvasStore(s => s.toolMode);
  const setToolMode = useCanvasStore(s => s.setToolMode);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < tools.length) {
        setToolMode(tools[idx].mode);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setToolMode]);

  return (
    <div className="w-10 bg-card border-r border-border flex flex-col items-center py-1.5 gap-0.5 shrink-0">
      {tools.map((t) => {
        const isActive = toolMode === t.mode;
        return (
          <Tooltip key={t.mode} delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setToolMode(t.mode)}
                aria-label={t.tip}
                aria-pressed={isActive}
                className={cn(
                  "relative w-8 h-8 flex items-center justify-center rounded transition-all duration-150",
                  isActive
                    ? "text-primary bg-primary/8"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-primary" />
                )}
                {t.icon}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="text-xs flex items-center gap-2">
              <span>{t.tip}</span>
              <kbd className="px-1 py-0.5 text-[10px] bg-muted rounded font-data">{t.shortcut}</kbd>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
