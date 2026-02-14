import { StateNode, type PointerEventInfo, type KeyboardEventInfo } from './StateNode';
import { useCanvasStore } from '../store/useCanvasStore';

// ── WallTool: Draw walls by clicking start → preview → click end ──

class IdleState extends StateNode {
  constructor() { super('idle'); }

  onPointerDown(info: PointerEventInfo): void {
    if (info.button !== 0) return;
    const store = useCanvasStore.getState();
    const point = store.snapToGrid ? info.gridPoint : { x: info.point.x, y: info.point.z };
    store.startWallPreview(point.x, point.y);
    this.parent?.transition('drawing', { startPoint: point });
  }
}

class DrawingState extends StateNode {
  constructor() { super('drawing'); }

  onPointerMove(info: PointerEventInfo): void {
    const store = useCanvasStore.getState();
    const point = store.snapToGrid ? info.gridPoint : { x: info.point.x, y: info.point.z };
    store.updateWallPreview(point.x, point.y);
  }

  onPointerDown(info: PointerEventInfo): void {
    if (info.button !== 0) return;
    const store = useCanvasStore.getState();
    store.confirmWall();
    // Stay in drawing state for continuous wall drawing (chain walls)
  }

  onKeyDown(info: KeyboardEventInfo): void {
    if (info.key === 'Escape') {
      useCanvasStore.getState().cancelWallPreview();
      this.parent?.transition('idle');
    }
  }

  onPointerUp(info: PointerEventInfo): void {
    if (info.button === 2) {
      // Right-click finishes wall chain
      useCanvasStore.getState().cancelWallPreview();
      this.parent?.transition('idle');
    }
  }
}

export class WallTool extends StateNode {
  constructor() {
    super('wall');
    this.addChild(new IdleState());
    this.addChild(new DrawingState());
  }

  onEnter(): void {
    this.transition('idle');
  }

  onExit(): void {
    useCanvasStore.getState().cancelWallPreview();
  }
}
