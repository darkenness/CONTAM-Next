import { useMemo } from 'react';
import * as THREE from 'three';
import type { GeoEdge, Geometry } from '../../model/geometry';
import { getEdgeEndpoints } from '../../model/geometry';
import { useCanvasStore } from '../../store/useCanvasStore';

interface WallMeshProps {
  edge: GeoEdge;
  geometry: Geometry;
  isSelected: boolean;
  isHovered: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onClick?: () => void;
}

export function WallMesh({ edge, geometry, isSelected, isHovered, onPointerEnter, onPointerLeave, onClick }: WallMeshProps) {
  const wallOpacity = useCanvasStore(s => s.wallOpacity);
  const endpoints = getEdgeEndpoints(geometry, edge);
  if (!endpoints) return null;

  const [x1, y1, x2, y2] = endpoints;
  const height = edge.wallHeight;
  const thickness = edge.wallThickness;

  // Calculate wall center position, rotation, and dimensions
  const { position, rotation, length } = useMemo(() => {
    const cx = (x1 + x2) / 2;
    const cz = (y1 + y2) / 2;
    const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1);

    return {
      position: new THREE.Vector3(cx, height / 2, cz),
      rotation: new THREE.Euler(0, -angle, 0),
      length: len,
    };
  }, [x1, y1, x2, y2, height]);

  // Color based on state
  const color = useMemo(() => {
    if (isSelected) return '#3b82f6';      // blue
    if (isHovered) return '#60a5fa';       // light blue
    if (!edge.isExterior) return '#e2e8f0'; // interior wall = light gray
    return '#d1d5db';                       // exterior wall = gray
  }, [isSelected, isHovered, edge.isExterior]);

  // Unclosed wall warning color
  const isUnclosed = edge.faceIds.length === 0;
  const finalColor = isUnclosed ? '#fbbf24' : color; // yellow warning

  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
      onPointerEnter={(e) => { e.stopPropagation(); onPointerEnter?.(); }}
      onPointerLeave={(e) => { e.stopPropagation(); onPointerLeave?.(); }}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      <boxGeometry args={[length, height, thickness]} />
      <meshToonMaterial
        color={finalColor}
        side={THREE.DoubleSide}
        transparent={wallOpacity < 1}
        opacity={wallOpacity}
        depthWrite={wallOpacity >= 0.9}
      />
      {/* Selection outline */}
      {isSelected && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(length + 0.02, height + 0.02, thickness + 0.02)]} />
          <lineBasicMaterial color="#2563eb" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  );
}
