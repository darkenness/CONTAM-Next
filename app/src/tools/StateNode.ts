// ── StateNode: Hierarchical state machine for tools (inspired by Tldraw) ──
// NOTE: This is reserved architecture. Currently, PointerEventBridge in
// IsometricCanvas.tsx handles tool interactions directly via switch(toolMode).
// In a future refactor, PointerEventBridge should dispatch events through
// the StateNode tree for cleaner separation of concerns.

export interface PointerEventInfo {
  type: 'pointerdown' | 'pointerup' | 'pointermove';
  point: { x: number; y: number; z: number };  // world coords
  gridPoint: { x: number; y: number };          // snapped to grid
  screenPoint: { x: number; y: number };        // screen coords
  button: number;                               // 0=left, 1=middle, 2=right
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  target?: {
    type: 'vertex' | 'edge' | 'face' | 'placement' | 'ground' | 'none';
    id?: string;
  };
}

export interface KeyboardEventInfo {
  type: 'keydown' | 'keyup';
  key: string;
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

export abstract class StateNode {
  id: string;
  parent: StateNode | null = null;
  children: Map<string, StateNode> = new Map();
  activeChildId: string | null = null;

  constructor(id: string) {
    this.id = id;
  }

  addChild(child: StateNode): void {
    child.parent = this;
    this.children.set(child.id, child);
  }

  getActiveChild(): StateNode | null {
    if (!this.activeChildId) return null;
    return this.children.get(this.activeChildId) ?? null;
  }

  transition(childId: string, info?: any): void {
    const currentChild = this.getActiveChild();
    if (currentChild) {
      currentChild.onExit(info);
    }
    this.activeChildId = childId;
    const newChild = this.getActiveChild();
    if (newChild) {
      newChild.onEnter(info);
    }
  }

  // Lifecycle
  onEnter(_info?: any): void {}
  onExit(_info?: any): void {}

  // Pointer events - dispatched to deepest active child first
  onPointerDown(_info: PointerEventInfo): void {}
  onPointerUp(_info: PointerEventInfo): void {}
  onPointerMove(_info: PointerEventInfo): void {}

  // Keyboard events
  onKeyDown(_info: KeyboardEventInfo): void {}
  onKeyUp(_info: KeyboardEventInfo): void {}

  // Dispatch event to the deepest active state
  dispatchPointerEvent(info: PointerEventInfo & { type: string }): void {
    const activeChild = this.getActiveChild();
    if (activeChild) {
      activeChild.dispatchPointerEvent(info);
      return;
    }
    // Leaf node handles the event
    switch (info.type) {
      case 'pointerdown': this.onPointerDown(info); break;
      case 'pointerup': this.onPointerUp(info); break;
      case 'pointermove': this.onPointerMove(info); break;
    }
  }

  dispatchKeyboardEvent(info: KeyboardEventInfo): void {
    const activeChild = this.getActiveChild();
    if (activeChild) {
      activeChild.dispatchKeyboardEvent(info);
      return;
    }
    switch (info.type) {
      case 'keydown': this.onKeyDown(info); break;
      case 'keyup': this.onKeyUp(info); break;
    }
  }
}
