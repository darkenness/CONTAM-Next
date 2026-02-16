// M-13: Unified room list hook — merges legacy AppStore nodes + canvas zone assignments
// Canvas zones take priority when IDs overlap
import { useAppStore } from '../store/useAppStore';
import { useCanvasStore } from '../store/useCanvasStore';

export interface MergedRoom {
  id: number;
  name: string;
}

export function useMergedRooms(): MergedRoom[] {
  const nodes = useAppStore(s => s.nodes);
  const stories = useCanvasStore(s => s.stories);

  const roomMap = new Map<number, MergedRoom>();
  // Legacy nodes first (lower priority)
  for (const n of nodes) {
    if (n.type === 'normal') roomMap.set(n.id, { id: n.id, name: n.name });
  }
  // Canvas zones override
  for (const s of stories) {
    for (const z of s.zoneAssignments) {
      roomMap.set(z.zoneId, { id: z.zoneId, name: z.name });
    }
  }
  return Array.from(roomMap.values());
}
