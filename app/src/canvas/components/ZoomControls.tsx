import { useCanvasStore } from '../../store/useCanvasStore';
import { Button } from '../../components/ui/button';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export function ZoomControls() {
  const cameraZoom = useCanvasStore(s => s.cameraZoom);
  const setCameraZoom = useCanvasStore(s => s.setCameraZoom);

  return (
    <div className="absolute bottom-2 right-2 z-10 flex items-center gap-0 bg-card/90 backdrop-blur-sm border border-border rounded px-0.5 py-0.5 shadow-sm select-none">
      <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => setCameraZoom(Math.max(10, cameraZoom * 0.85))}>
        <ZoomOut size={12} />
      </Button>
      <span className="font-data text-[10px] text-muted-foreground w-8 text-center">
        {Math.round(cameraZoom)}
      </span>
      <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => setCameraZoom(Math.min(200, cameraZoom * 1.15))}>
        <ZoomIn size={12} />
      </Button>
      <div className="w-px h-3.5 bg-border mx-0.5" />
      <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => setCameraZoom(50)}>
        <Maximize2 size={12} />
      </Button>
    </div>
  );
}
