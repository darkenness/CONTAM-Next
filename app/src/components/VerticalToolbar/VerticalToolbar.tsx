import { useAppStore } from '../../store/useAppStore';
import type { ToolMode } from '../../types';
import { MousePointer2, Square, Cloud, Link2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

const tools: { mode: ToolMode; icon: React.ReactNode; label: string; tip: string; shortcut: string }[] = [
  { mode: 'select', icon: <MousePointer2 size={18} />, label: '选择', tip: '选择并移动元素', shortcut: '1' },
  { mode: 'addRoom', icon: <Square size={18} />, label: '房间', tip: '点击画布添加房间', shortcut: '2' },
  { mode: 'addAmbient', icon: <Cloud size={18} />, label: '室外', tip: '添加室外环境节点', shortcut: '3' },
  { mode: 'addLink', icon: <Link2 size={18} />, label: '连接', tip: '点击两个节点创建气流路径', shortcut: '4' },
];

export default function VerticalToolbar() {
  const { toolMode, setToolMode } = useAppStore();

  return (
    <div className="w-11 bg-card border-r border-border flex flex-col items-center py-2 gap-1 shrink-0">
      {tools.map((t) => (
        <Tooltip key={t.mode} delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setToolMode(t.mode)}
              aria-label={t.tip}
              aria-pressed={toolMode === t.mode}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
                toolMode === t.mode
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {t.icon}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            <span>{t.tip}</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded font-mono">{t.shortcut}</kbd>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
