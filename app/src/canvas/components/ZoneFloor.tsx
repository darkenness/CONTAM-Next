import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { GeoFace, Geometry, ZoneAssignment } from '../../model/geometry';
import { getFaceVertices, faceCentroid, faceArea } from '../../model/geometry';

interface ZoneFloorProps {
  face: GeoFace;
  geometry: Geometry;
  zone?: ZoneAssignment;
  isSelected: boolean;
  isHovered: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

export function ZoneFloor({ face, geometry, zone, isSelected, isHovered, onPointerEnter, onPointerLeave }: ZoneFloorProps) {
  const vertices = getFaceVertices(geometry, face);
  if (vertices.length < 3) return null;

  const centroid = useMemo(() => faceCentroid(geometry, face), [geometry, face]);
  const area = useMemo(() => faceArea(geometry, face), [geometry, face]);

  // Create a Shape from the face vertices for ShapeGeometry
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      s.lineTo(vertices[i].x, vertices[i].y);
    }
    s.closePath();
    return s;
  }, [vertices]);

  const color = useMemo(() => {
    if (isSelected) return '#93c5fd';
    if (isHovered) return '#bfdbfe';
    return zone?.color ?? '#e0f2fe';
  }, [isSelected, isHovered, zone?.color]);

  const opacity = isSelected ? 0.7 : isHovered ? 0.6 : 0.45;

  return (
    <group>
      {/* Floor polygon */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow
        onPointerEnter={(e) => { e.stopPropagation(); onPointerEnter?.(); }}
        onPointerLeave={(e) => { e.stopPropagation(); onPointerLeave?.(); }}
      >
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Zone label (HTML overlay) */}
      {zone && (
        <Html
          position={[centroid.x, 0.15, centroid.y]}
          center
          distanceFactor={15}
          style={{ pointerEvents: 'none' }}
        >
          <div className="select-none text-center whitespace-nowrap">
            <div className="text-[11px] font-semibold text-slate-700 leading-tight">
              {zone.name}
            </div>
            <div className="text-[9px] text-slate-500 leading-tight">
              {area.toFixed(1)}m² · {zone.volume.toFixed(0)}m³
            </div>
            <div className="text-[9px] text-slate-400 leading-tight">
              {(zone.temperature - 273.15).toFixed(0)}°C
            </div>
          </div>
        </Html>
      )}

      {/* Selection outline */}
      {isSelected && (
        <lineLoop rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(vertices.flatMap(v => [v.x, v.y, 0])), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#2563eb" linewidth={2} />
        </lineLoop>
      )}
    </group>
  );
}
