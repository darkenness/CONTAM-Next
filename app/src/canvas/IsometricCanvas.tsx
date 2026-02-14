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
    hoveredEdgeId, hoveredFaceId,
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
 * Camera controller for pan/zoom
 */
function CameraController() {
  const { camera, gl } = useThree();
  const cameraZoom = useCanvasStore(s => s.cameraZoom);
  const setCameraZoom = useCanvasStore(s => s.setCameraZoom);
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = cameraZoom;
      camera.updateProjectionMatrix();
    }
  }, [camera, cameraZoom]);

  useEffect(() => {
    const canvas = gl.domElement;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(10, Math.min(200, cameraZoom * zoomFactor));
      setCameraZoom(newZoom);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1) { // middle button
        isDragging.current = true;
        lastPointer.current = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };

      // Pan in isometric space
      const panSpeed = 0.05 / (cameraZoom / 50);
      camera.position.x -= (dx * Math.cos(Math.PI / 4) + dy * Math.sin(Math.PI / 4)) * panSpeed;
      camera.position.z -= (-dx * Math.sin(Math.PI / 4) + dy * Math.cos(Math.PI / 4)) * panSpeed;
      camera.position.y -= dy * panSpeed * 0.5;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 1) {
        isDragging.current = false;
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
  }, [gl, camera, cameraZoom, setCameraZoom]);

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

  // Update wall preview on every frame when drawing
  useFrame(() => {
    const store = useCanvasStore.getState();
    if (store.toolMode === 'wall' && store.wallPreview.active) {
      const pt = getGridPoint();
      store.updateWallPreview(pt.x, pt.y);
    }
  });

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const handleClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const store = useCanvasStore.getState();
      const gridPt = getGridPoint();

      switch (store.toolMode) {
        case 'wall':
          if (!store.wallPreview.active) {
            store.startWallPreview(gridPt.x, gridPt.y);
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
    </div>
  );
}
