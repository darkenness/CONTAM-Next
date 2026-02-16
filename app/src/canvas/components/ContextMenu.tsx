import { useEffect, useState, useCallback } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import type { EdgePlacement } from '../../model/geometry';

interface MenuPosition {
  x: number;
  y: number;
}

interface ContextMenuState {
  position: MenuPosition | null;
  context: 'edge' | 'face' | 'placement' | 'ground' | null;
  targetId: string | null;
}

const PLACEMENT_TYPES: { type: EdgePlacement['type']; label: string; group: string }[] = [
  { type: 'door', label: '门', group: '开口' },
  { type: 'window', label: '窗', group: '开口' },
  { type: 'crack', label: '裂缝', group: '开口' },
  { type: 'fan', label: '风机', group: 'HVAC' },
  { type: 'duct', label: '风管', group: 'HVAC' },
  { type: 'damper', label: '风阀', group: 'HVAC' },
  { type: 'filter', label: '过滤器', group: 'HVAC' },
  { type: 'srv', label: '自调节通风口', group: 'HVAC' },
  { type: 'checkValve', label: '单向阀', group: 'HVAC' },
];

export function CanvasContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>({ position: null, context: null, targetId: null });

  const selectedEdgeId = useCanvasStore(s => s.selectedEdgeId);
  const selectedFaceId = useCanvasStore(s => s.selectedFaceId);
  const selectedPlacementId = useCanvasStore(s => s.selectedPlacementId);
  const hoveredEdgeId = useCanvasStore(s => s.hoveredEdgeId);
  const hoveredFaceId = useCanvasStore(s => s.hoveredFaceId);

  const hoveredPlacementId = useCanvasStore(s => s.hoveredPlacementId);

  const addPlacement = useCanvasStore(s => s.addPlacement);
  const removeEdge = useCanvasStore(s => s.removeEdge);
  const removePlacement = useCanvasStore(s => s.removePlacement);
  const selectEdge = useCanvasStore(s => s.selectEdge);
  const selectFace = useCanvasStore(s => s.selectFace);
  const selectPlacement = useCanvasStore(s => s.selectPlacement);

  const close = useCallback(() => setMenu({ position: null, context: null, targetId: null }), []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Only handle right-click on canvas area
      const target = e.target as HTMLElement;
      if (!target.closest('canvas')) return;

      e.preventDefault();

      // Determine context based on what's hovered/selected
      // L-05: Check placement first (placements are on edges, so they take priority)
      let context: ContextMenuState['context'] = 'ground';
      let targetId: string | null = null;

      if (hoveredPlacementId || selectedPlacementId) {
        context = 'placement';
        targetId = hoveredPlacementId || selectedPlacementId;
      } else if (hoveredEdgeId || selectedEdgeId) {
        context = 'edge';
        targetId = hoveredEdgeId || selectedEdgeId;
      } else if (hoveredFaceId || selectedFaceId) {
        context = 'face';
        targetId = hoveredFaceId || selectedFaceId;
      }

      setMenu({ position: { x: e.clientX, y: e.clientY }, context, targetId });
    };

    const handleClick = () => close();

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleClick);
    };
  }, [hoveredEdgeId, hoveredFaceId, hoveredPlacementId, selectedEdgeId, selectedFaceId, selectedPlacementId, close]);

  if (!menu.position) return null;

  return (
    <div
      className="fixed z-50 min-w-[180px] bg-popover border border-border rounded-md shadow-lg py-1 text-sm"
      style={{ left: menu.position.x, top: menu.position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Edge context: place flow paths on wall */}
      {menu.context === 'edge' && menu.targetId && (
        <>
          <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">在墙上放置</div>
          {PLACEMENT_TYPES.map(pt => (
            <button
              key={pt.type}
              className="w-full px-3 py-1.5 text-left hover:bg-accent text-foreground flex items-center gap-2"
              onClick={() => {
                addPlacement(menu.targetId!, 0.5, pt.type);
                close();
              }}
            >
              <span className={`w-2 h-2 rounded-full ${pt.group === 'HVAC' ? 'bg-blue-500' : 'bg-amber-500'}`} />
              {pt.label}
            </button>
          ))}
          <div className="h-px bg-border my-1" />
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-accent text-foreground"
            onClick={() => { selectEdge(menu.targetId); close(); }}
          >
            编辑墙壁属性
          </button>
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-destructive/10 text-destructive"
            onClick={() => { removeEdge(menu.targetId!); close(); }}
          >
            删除墙壁
          </button>
        </>
      )}

      {/* Face context: zone operations */}
      {menu.context === 'face' && menu.targetId && (
        <>
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-accent text-foreground"
            onClick={() => { selectFace(menu.targetId); close(); }}
          >
            编辑区域属性
          </button>
        </>
      )}

      {/* Placement context */}
      {menu.context === 'placement' && menu.targetId && (
        <>
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-accent text-foreground"
            onClick={() => { selectPlacement(menu.targetId); close(); }}
          >
            编辑组件属性
          </button>
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-destructive/10 text-destructive"
            onClick={() => { removePlacement(menu.targetId!); close(); }}
          >
            删除组件
          </button>
        </>
      )}

      {/* Ground context */}
      {menu.context === 'ground' && (
        <div className="px-3 py-1.5 text-muted-foreground text-xs">
          右键点击墙壁或区域查看操作
        </div>
      )}
    </div>
  );
}
