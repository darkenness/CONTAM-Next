import { useCanvasStore } from '../../store/useCanvasStore';

const TOOL_LABELS: Record<string, string> = {
  wall: '画墙模式 — 点击设定起点，再次点击确认墙段，Esc/右键取消',
  door: '放置门 — 点击墙壁放置',
  window: '放置窗 — 点击墙壁放置',
  erase: '删除模式 — 点击墙壁或组件删除',
  pan: '平移模式 — 拖拽移动视角',
};

export function ToolModeIndicator() {
  const toolMode = useCanvasStore(s => s.toolMode);
  const wallPreview = useCanvasStore(s => s.wallPreview);

  if (toolMode === 'select' && !wallPreview.active) return null;

  const label = wallPreview.active
    ? '画墙中 — 点击确认下一段，Esc/右键结束'
    : TOOL_LABELS[toolMode];

  if (!label) return null;

  return (
    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10 px-3 py-1 bg-card/95 backdrop-blur-sm border border-primary/30 text-xs font-medium rounded shadow-sm select-none pointer-events-none flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      <span className="text-foreground">{label}</span>
    </div>
  );
}
