import { useRef, useCallback, useEffect, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrthographicCamera, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useCanvasStore } from '../store/useCanvasStore';
import { WallMesh } from './components/WallMesh';
import { ZoneFloor } from './components/ZoneFloor';
import { WallPreviewLine } from './components/WallPreviewLine';
import { PlacementIcon } from './components/PlacementIcon';
import { ToolModeIndicator } from './components/ToolModeIndicator';
import { ZoomControls } from './components/ZoomControls';
import { CanvasContextMenu } from './components/ContextMenu';
import { FlowArrows, ZoneDataFloats } from './components/ResultsOverlay';
import { TimeStepper } from './components/TimeStepper';
import { FloorSwitcher } from './components/FloorSwitcher';
import { BackgroundImage } from './components/BackgroundImage';

// ── Ground plane for raycasting ──
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/**
 * Scene content: walls, zones, placements, grid
 */
function SceneContent() {
  const {
    toolMode, snapToGrid, gridSize, showGrid,
    wallPreview, setCursorWorld, setCursorGrid,
    setHoveredEdge, setHoveredFace,
    selectedEdgeId, selectedFaceId, selectedPlacementId,
    hoveredEdgeId, hoveredFaceId, snapVertexId,
  } = useCanvasStore();

  const story = useCanvasStore(s => s.getActiveStory());
  const geo = story.geometry;
  const zones = story.zoneAssignments;
  const placements = story.placements;

  const { camera, raycaster, pointer } = useThree();
  const groundRef = useRef<THREE.Mesh>(null!);

  // Raycast to ground plane for cursor tracking
  const updateCursor = useCallback(() => {
    raycaster.setFromCamera(pointer, camera);
    const intersection = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(groundPlane, intersection);
    if (hit) {
      setCursorWorld({ x: intersection.x, y: intersection.y, z: intersection.z });
      if (snapToGrid) {
        setCursorGrid({
          x: Math.round(intersection.x / gridSize) * gridSize,
          y: Math.round(intersection.z / gridSize) * gridSize,
        });
      } else {
        setCursorGrid({ x: intersection.x, y: intersection.z });
      }
    }
  }, [camera, raycaster, pointer, snapToGrid, gridSize, setCursorWorld, setCursorGrid]);

  useFrame(() => {
    updateCursor();
  });

  // Ground plane mesh for raycasting (invisible)
  const groundGeo = useMemo(() => new THREE.PlaneGeometry(200, 200), []);

  return (
    <>
      {/* Invisible ground plane for raycasting */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        visible={false}
      >
        <primitive object={groundGeo} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Grid */}
      {showGrid && (
        <Grid
          args={[100, 100]}
          cellSize={gridSize}
          cellThickness={0.5}
          cellColor="#cbd5e1"
          sectionSize={gridSize * 5}
          sectionThickness={1}
          sectionColor="#94a3b8"
          fadeDistance={60}
          fadeStrength={1.5}
          position={[0, 0, 0]}
          infiniteGrid
        />
      )}

      {/* Background tracing image */}
      <BackgroundImage />

      {/* Zone floors */}
      {geo.faces.map(face => {
        const zone = zones.find(z => z.faceId === face.id);
        return (
          <ZoneFloor
            key={face.id}
            face={face}
            geometry={geo}
            zone={zone}
            isSelected={selectedFaceId === face.id}
            isHovered={hoveredFaceId === face.id}
            onPointerEnter={() => setHoveredFace(face.id)}
            onPointerLeave={() => setHoveredFace(null)}
          />
        );
      })}

      {/* Walls */}
      {geo.edges.map(edge => (
        <WallMesh
          key={edge.id}
          edge={edge}
          geometry={geo}
          isSelected={selectedEdgeId === edge.id}
          isHovered={hoveredEdgeId === edge.id}
          onPointerEnter={() => setHoveredEdge(edge.id)}
          onPointerLeave={() => setHoveredEdge(null)}
          onClick={() => {
            if (toolMode === 'select') {
              useCanvasStore.getState().selectEdge(edge.id);
            }
          }}
        />
      ))}

      {/* Placements (doors, windows, etc.) */}
      {placements.map(placement => (
        <PlacementIcon
          key={placement.id}
          placement={placement}
          geometry={geo}
          storyHeight={story.floorToCeilingHeight}
          isSelected={selectedPlacementId === placement.id}
        />
      ))}

      {/* Wall drawing preview */}
      {wallPreview.active && (
        <WallPreviewLine
          startX={wallPreview.startX}
          startY={wallPreview.startY}
          endX={wallPreview.endX}
          endY={wallPreview.endY}
          height={story.floorToCeilingHeight}
        />
      )}

      {/* Snap vertex indicator */}
      {snapVertexId && toolMode === 'wall' && (() => {
        const sv = geo.vertices.find(v => v.id === snapVertexId);
        if (!sv) return null;
        return (
          <mesh position={[sv.x, 0.05, sv.y]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial color="#14b8a6" transparent opacity={0.85} />
          </mesh>
        );
      })()}

      {/* Results overlay (only in results mode) */}
      <FlowArrows />
      <ZoneDataFloats />

      {/* Lighting */}
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[15, 25, 15]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <directionalLight position={[-10, 15, -10]} intensity={0.25} />
    </>
  );
}

/**
 * Watches for dark mode toggle and updates scene.background
 */
function ThemeWatcher() {
  const { scene } = useThree();
  useEffect(() => {
    const update = () => {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
      if (bg) scene.background = new THREE.Color(bg);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [scene]);
  return null;
}

/**
 * Camera controller: scroll=zoom, middle-drag=orbit (Y axis), Shift+middle=pan
 */
function CameraController() {
  const { camera, gl } = useThree();
  const cameraZoom = useCanvasStore(s => s.cameraZoom);
  const setCameraZoom = useCanvasStore(s => s.setCameraZoom);
  const cameraAngle = useCanvasStore(s => s.cameraAngle);
  const setCameraAngle = useCanvasStore(s => s.setCameraAngle);
  const isDragging = useRef(false);
  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));

  // Orbit radius and elevation angle (fixed isometric tilt)
  const ORBIT_RADIUS = 28;
  const ELEVATION = Math.PI / 6; // 30° tilt from horizontal

  // Update camera position from angle
  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = cameraZoom;
      camera.updateProjectionMatrix();
    }
    const t = lookTarget.current;
    camera.position.set(
      t.x + ORBIT_RADIUS * Math.cos(ELEVATION) * Math.sin(cameraAngle),
      t.y + ORBIT_RADIUS * Math.sin(ELEVATION),
      t.z + ORBIT_RADIUS * Math.cos(ELEVATION) * Math.cos(cameraAngle),
    );
    camera.lookAt(t);
  }, [camera, cameraZoom, cameraAngle]);

  useEffect(() => {
    const canvas = gl.domElement;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(10, Math.min(200, cameraZoom * zoomFactor));
      setCameraZoom(newZoom);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        if (e.shiftKey) {
          isPanning.current = true;
        } else {
          isDragging.current = true;
        }
        lastPointer.current = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = isDragging.current ? 'grab' : 'move';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current && !isPanning.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };

      if (isDragging.current) {
        // Orbit: rotate cameraAngle around Y axis
        const newAngle = cameraAngle - dx * 0.008;
        setCameraAngle(newAngle);
      } else if (isPanning.current) {
        // Pan in screen-relative direction
        const panSpeed = 0.05 / (cameraZoom / 50);
        const angle = cameraAngle;
        lookTarget.current.x -= (dx * Math.cos(angle) + dy * Math.sin(angle)) * panSpeed;
        lookTarget.current.z -= (-dx * Math.sin(angle) + dy * Math.cos(angle)) * panSpeed;
        // Force camera update
        const t = lookTarget.current;
        camera.position.set(
          t.x + ORBIT_RADIUS * Math.cos(ELEVATION) * Math.sin(angle),
          t.y + ORBIT_RADIUS * Math.sin(ELEVATION),
          t.z + ORBIT_RADIUS * Math.cos(ELEVATION) * Math.cos(angle),
        );
        camera.lookAt(t);
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 1) {
        isDragging.current = false;
        isPanning.current = false;
        canvas.style.cursor = '';
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);

    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
    };
  }, [gl, camera, cameraZoom, setCameraZoom, cameraAngle, setCameraAngle]);

  return null;
}

/**
 * Event bridge: converts R3F pointer events into StateNode tool events
 */
function PointerEventBridge() {
  const { camera, raycaster, pointer } = useThree();
  const toolMode = useCanvasStore(s => s.toolMode);

  const getGridPoint = useCallback((): { x: number; y: number } => {
    raycaster.setFromCamera(pointer, camera);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, intersection);
    const store = useCanvasStore.getState();
    const gs = store.gridSize;
    if (store.snapToGrid) {
      return { x: Math.round(intersection.x / gs) * gs, y: Math.round(intersection.z / gs) * gs };
    }
    return { x: intersection.x, y: intersection.z };
  }, [camera, raycaster, pointer]);

  // Update wall preview + vertex snap detection on every frame
  useFrame(() => {
    const store = useCanvasStore.getState();
    if (store.toolMode !== 'wall') {
      if (store.snapVertexId) store.setSnapVertexId(null);
      return;
    }

    const pt = getGridPoint();

    // Find nearest existing vertex for snap feedback
    const story = store.getActiveStory();
    const verts = story.geometry.vertices;
    const SNAP_THRESHOLD = 0.5; // meters
    let nearestId: string | null = null;
    let nearestDist = SNAP_THRESHOLD;
    let snapX = pt.x, snapY = pt.y;

    for (const v of verts) {
      const d = Math.sqrt((v.x - pt.x) ** 2 + (v.y - pt.y) ** 2);
      if (d < nearestDist) {
        nearestDist = d;
        nearestId = v.id;
        snapX = v.x;
        snapY = v.y;
      }
    }
    store.setSnapVertexId(nearestId);

    if (store.wallPreview.active) {
      store.updateWallPreview(nearestId ? snapX : pt.x, nearestId ? snapY : pt.y);
    }
  });

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const handleClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const store = useCanvasStore.getState();
      const gridPt = getGridPoint();

      // Compute snap-aware point for wall tool
      const getSnapPoint = () => {
        const story = store.getActiveStory();
        const verts = story.geometry.vertices;
        let best = gridPt;
        let bestDist = 0.5;
        for (const v of verts) {
          const d = Math.sqrt((v.x - gridPt.x) ** 2 + (v.y - gridPt.y) ** 2);
          if (d < bestDist) { bestDist = d; best = { x: v.x, y: v.y }; }
        }
        return best;
      };

      switch (store.toolMode) {
        case 'wall':
          if (!store.wallPreview.active) {
            const sp = getSnapPoint();
            store.startWallPreview(sp.x, sp.y);
          } else {
            store.confirmWall();
          }
          break;
        case 'select':
          // Selection is handled by R3F pointer events on meshes (onPointerEnter/onClick)
          // Clicking empty ground clears selection
          if (!store.hoveredEdgeId && !store.hoveredFaceId && !store.hoveredPlacementId) {
            store.clearSelection();
          } else if (store.hoveredEdgeId) {
            store.selectEdge(store.hoveredEdgeId);
          } else if (store.hoveredFaceId) {
            store.selectFace(store.hoveredFaceId);
          }
          break;
        case 'erase':
          if (store.hoveredEdgeId) {
            store.removeEdge(store.hoveredEdgeId);
          } else if (store.selectedPlacementId) {
            store.removePlacement(store.selectedPlacementId);
          }
          break;
        case 'door':
        case 'window':
          if (store.hoveredEdgeId) {
            const placementType = store.toolMode === 'door' ? 'door' : 'window';
            store.addPlacement(store.hoveredEdgeId, 0.5, placementType);
          }
          break;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        const store = useCanvasStore.getState();
        if (store.wallPreview.active) {
          store.cancelWallPreview();
        } else {
          store.clearSelection();
          store.setToolMode('select');
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const store = useCanvasStore.getState();
        if (store.selectedEdgeId) {
          store.removeEdge(store.selectedEdgeId);
        } else if (store.selectedPlacementId) {
          store.removePlacement(store.selectedPlacementId);
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      const store = useCanvasStore.getState();
      if (store.toolMode === 'wall' && store.wallPreview.active) {
        e.preventDefault();
        store.cancelWallPreview();
      }
    };

    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [toolMode, getGridPoint]);

  return null;
}

/**
 * Wall opacity slider overlay
 */
function WallOpacitySlider() {
  const wallOpacity = useCanvasStore(s => s.wallOpacity);
  const setWallOpacity = useCanvasStore(s => s.setWallOpacity);
  return (
    <div className="absolute bottom-14 right-3 flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border rounded-xl px-3 py-1.5 shadow-lg">
      <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">墙透明度</span>
      <input
        type="range"
        min="0.05"
        max="1"
        step="0.05"
        value={wallOpacity}
        onChange={e => setWallOpacity(parseFloat(e.target.value))}
        className="w-20 h-1 accent-primary"
      />
      <span className="text-[10px] font-data text-muted-foreground w-7 text-right">{Math.round(wallOpacity * 100)}%</span>
    </div>
  );
}

/**
 * Main IsometricCanvas component — replaces the old Konva SketchPad
 */
export default function IsometricCanvas() {
  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        style={{ background: 'var(--background)' }}
        onCreated={({ gl, scene, camera }) => {
          gl.toneMapping = THREE.NoToneMapping;
          // Read computed background color from CSS variable
          const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
          scene.background = new THREE.Color(bgColor || '#f8f9fb');
          camera.lookAt(0, 0, 0);
        }}
      >
        <OrthographicCamera
          makeDefault
          zoom={50}
          position={[20, 20, 20]}
          near={0.1}
          far={200}
        />
        <ThemeWatcher />
        <CameraController />
        <PointerEventBridge />
        <SceneContent />
      </Canvas>

      {/* Overlay UI */}
      <ToolModeIndicator />
      <ZoomControls />
      <FloorSwitcher />
      <CanvasContextMenu />
      <TimeStepper />
      <WallOpacitySlider />
    </div>
  );
}
