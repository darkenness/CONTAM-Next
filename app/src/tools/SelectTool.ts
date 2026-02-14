import { StateNode, type PointerEventInfo, type KeyboardEventInfo } from './StateNode';
import { useCanvasStore } from '../store/useCanvasStore';

// ── SelectTool: Select/move walls, zones, placements ──

class IdleState extends StateNode {
  constructor() { super('idle'); }

  onPointerDown(info: PointerEventInfo): void {
    if (info.button === 2) return; // right-click handled elsewhere

    if (info.target?.type === 'edge' || info.target?.type === 'face' || info.target?.type === 'placement') {
      this.parent?.transition('pointing', { targetType: info.target.type, targetId: info.target.id, startPoint: info.point });
    } else {
      useCanvasStore.getState().clearSelection();
    }
  }

  onKeyDown(info: KeyboardEventInfo): void {
    if (info.key === 'Delete' || info.key === 'Backspace') {
      const state = useCanvasStore.getState();
      if (state.selectedEdgeId) {
        state.removeEdge(state.selectedEdgeId);
      }
    }
  }
}

class PointingState extends StateNode {
  private targetType: string = '';
  private targetId: string = '';
  private startPoint = { x: 0, y: 0, z: 0 };

  constructor() { super('pointing'); }

  onEnter(info: { targetType: string; targetId: string; startPoint: { x: number; y: number; z: number } }): void {
    this.targetType = info.targetType;
    this.targetId = info.targetId;
    this.startPoint = info.startPoint;

    if (this.targetType === 'edge') {
      useCanvasStore.getState().selectEdge(this.targetId);
    } else if (this.targetType === 'face') {
      useCanvasStore.getState().selectFace(this.targetId);
    } else if (this.targetType === 'placement') {
      useCanvasStore.getState().selectPlacement(this.targetId);
    }
  }

  onPointerMove(info: PointerEventInfo): void {
    const dx = info.point.x - this.startPoint.x;
    const dz = info.point.z - this.startPoint.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.2) {
      // Start dragging - for now, just go back to idle
      this.parent?.transition('idle');
    }
  }

  onPointerUp(_info: PointerEventInfo): void {
    this.parent?.transition('idle');
  }
}

export class SelectTool extends StateNode {
  constructor() {
    super('select');
    this.addChild(new IdleState());
    this.addChild(new PointingState());
  }

  onEnter(): void {
    this.transition('idle');
  }
}
