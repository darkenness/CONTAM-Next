import { useMemo } from 'react';
import * as THREE from 'three';
import { useCanvasStore } from '../../store/useCanvasStore';

/**
 * Renders a background floor plan image as a textured plane below the grid.
 * Used for tracing building geometry from imported floor plans.
 */
export function BackgroundImage() {
  const story = useCanvasStore(s => s.getActiveStory());
  const bg = story.backgroundImage;

  if (!bg || !bg.url) return null;

  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(bg.url);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [bg.url]);

  // Scale: pixels per meter → plane size
  // We assume the image is centered at the origin offset
  const planeWidth = 50 / (bg.scalePixelsPerMeter || 10);
  const planeHeight = 50 / (bg.scalePixelsPerMeter || 10);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[bg.offsetX || 0, -0.02, bg.offsetY || 0]}
      receiveShadow
    >
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={bg.opacity ?? 0.5}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
