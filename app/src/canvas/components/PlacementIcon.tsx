import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { EdgePlacement, Geometry } from '../../model/geometry';
import { getEdge, getPositionOnEdge } from '../../model/geometry';

interface PlacementIconProps {
  placement: EdgePlacement;
  geometry: Geometry;
  storyHeight: number;
  isSelected: boolean;
}

const PLACEMENT_COLORS: Record<string, string> = {
  door: '#92400e',
  window: '#0ea5e9',
  opening: '#6b7280',
  fan: '#2563eb',
  duct: '#0d9488',
  damper: '#d97706',
  filter: '#7c3aed',
  crack: '#9ca3af',
  srv: '#06b6d4',
  checkValve: '#e11d48',
};

const PLACEMENT_LABELS: Record<string, string> = {
  door: '门',
  window: '窗',
  opening: '开口',
  fan: '风机',
  duct: '风管',
  damper: '风阀',
  filter: '过滤器',
  crack: '裂缝',
  srv: '自调节',
  checkValve: '单向阀',
};

export function PlacementIcon({ placement, geometry, storyHeight, isSelected }: PlacementIconProps) {
  const edge = getEdge(geometry, placement.edgeId);
  if (!edge) return null;

  const pos = getPositionOnEdge(geometry, edge, placement.alpha);
  if (!pos) return null;

  const color = placement.isConfigured
    ? (PLACEMENT_COLORS[placement.type] ?? '#6b7280')
    : '#ef4444'; // Red for unconfigured

  const yPos = storyHeight * 0.5; // Center on wall height

  // Size varies by type
  const size = placement.type === 'door' ? 0.4 : 0.3;

  return (
    <group position={[pos.x, yPos, pos.y]}>
      {/* Icon geometry */}
      {placement.type === 'door' ? (
        <mesh castShadow>
          <boxGeometry args={[size, storyHeight * 0.8, 0.05]} />
          <meshToonMaterial color={color} />
        </mesh>
      ) : placement.type === 'window' ? (
        <mesh castShadow>
          <boxGeometry args={[size * 1.2, size * 0.8, 0.05]} />
          <meshToonMaterial color={color} transparent opacity={0.7} />
        </mesh>
      ) : placement.type === 'fan' ? (
        <mesh castShadow>
          <cylinderGeometry args={[size * 0.5, size * 0.5, 0.15, 8]} />
          <meshToonMaterial color={color} />
        </mesh>
      ) : (
        <mesh castShadow>
          <sphereGeometry args={[size * 0.4, 8, 8]} />
          <meshToonMaterial color={color} />
        </mesh>
      )}

      {/* Unconfigured pulsing indicator */}
      {!placement.isConfigured && (
        <mesh>
          <ringGeometry args={[size * 0.6, size * 0.7, 16]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Selection highlight */}
      {isSelected && (
        <mesh>
          <ringGeometry args={[size * 0.7, size * 0.85, 16]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label */}
      <Html
        position={[0, size + 0.2, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: 'none' }}
      >
        <div className={`text-[9px] font-medium px-1 rounded select-none whitespace-nowrap ${
          placement.isConfigured ? 'text-slate-600' : 'text-red-500 font-bold'
        }`}>
          {PLACEMENT_LABELS[placement.type] ?? placement.type}
        </div>
      </Html>
    </group>
  );
}
