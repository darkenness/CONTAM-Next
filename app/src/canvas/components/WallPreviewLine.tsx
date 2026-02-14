import { useMemo } from 'react';
import * as THREE from 'three';

interface WallPreviewLineProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  height: number;
}

export function WallPreviewLine({ startX, startY, endX, endY, height }: WallPreviewLineProps) {
  const length = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
  if (length < 0.05) return null;

  const { position, rotation } = useMemo(() => {
    const cx = (startX + endX) / 2;
    const cz = (startY + endY) / 2;
    const angle = Math.atan2(endY - startY, endX - startX);
    return {
      position: new THREE.Vector3(cx, height / 2, cz),
      rotation: new THREE.Euler(0, -angle, 0),
    };
  }, [startX, startY, endX, endY, height]);

  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[length, height, 0.2]} />
      <meshBasicMaterial
        color="#3b82f6"
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </mesh>
  );
}
