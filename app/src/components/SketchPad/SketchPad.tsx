import { useRef, useCallback, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text, Arrow, Circle, Group, Line } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useAppStore } from '../../store/useAppStore';
import type { ZoneNode, SimulationResult } from '../../types';
import { Button } from '../ui/button';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

const GRID_SIZE = 20;
const COLORS = {
  room: '#e0f2fe',
  roomBorder: '#0284c7',
  roomSelected: '#bae6fd',
  roomHover: '#7dd3fc',
  ambient: '#d1fae5',
  ambientBorder: '#059669',
  link: '#94a3b8',
  linkSelected: '#0284c7',
  flowPositive: '#10b981',
  flowNegative: '#f43f5e',
  grid: '#f8fafc',
  gridMajor: '#e2e8f0',
  pressure: '#8b5cf6',
  canvas: '#fafbfc',
};

function GridLines({ width, height }: { width: number; height: number }) {
  const lines = [];
  for (let x = 0; x < width; x += GRID_SIZE) {
    const isMajor = x % (GRID_SIZE * 5) === 0;
    lines.push(<Line key={`v${x}`} points={[x, 0, x, height]} stroke={isMajor ? COLORS.gridMajor : COLORS.grid} strokeWidth={isMajor ? 0.8 : 0.3} />);
  }
  for (let y = 0; y < height; y += GRID_SIZE) {
    const isMajor = y % (GRID_SIZE * 5) === 0;
    lines.push(<Line key={`h${y}`} points={[0, y, width, y]} stroke={isMajor ? COLORS.gridMajor : COLORS.grid} strokeWidth={isMajor ? 0.8 : 0.3} />);
  }
  return <>{lines}</>;
}

function concToColor(value: number, maxConc: number): string | null {
  if (maxConc <= 0 || value <= 0) return null;
  const ratio = Math.min(value / maxConc, 1.0);
  // Green(safe) → Yellow(moderate) → Red(high)
  const r = Math.round(ratio < 0.5 ? ratio * 2 * 255 : 255);
  const g = Math.round(ratio < 0.5 ? 255 : (1 - (ratio - 0.5) * 2) * 255);
  const b = 0;
  const alpha = 0.3 + ratio * 0.5;
  return `rgba(${r},${g},${b},${alpha})`;
}

function RoomShape({ node, isSelected, result, heatmapColor, sourceCount }: {
  node: ZoneNode; isSelected: boolean; result: SimulationResult | null;
  heatmapColor?: string | null; sourceCount?: number;
}) {
  const { selectNode, updateNode, toolMode } = useAppStore();
  const isAmbient = node.type === 'ambient';

  const nodeResult = result?.nodes.find((r: { id: number }) => r.id === node.id);
  const pressureText = nodeResult ? `${nodeResult.pressure.toFixed(2)} Pa` : '';

  const fillColor = heatmapColor
    ? heatmapColor
    : isAmbient ? COLORS.ambient : (isSelected ? COLORS.roomSelected : COLORS.room);

  return (
    <Group
      x={node.x}
      y={node.y}
      draggable={toolMode === 'select'}
      onClick={() => { if (toolMode === 'select') selectNode(node.id); }}
      onTap={() => { if (toolMode === 'select') selectNode(node.id); }}
      onDragMove={(e: KonvaEventObject<DragEvent>) => {
        updateNode(node.id, { x: e.target.x(), y: e.target.y() });
      }}
      onDragEnd={(e: KonvaEventObject<DragEvent>) => {
        const snappedX = Math.round(e.target.x() / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(e.target.y() / GRID_SIZE) * GRID_SIZE;
        e.target.x(snappedX);
        e.target.y(snappedY);
        updateNode(node.id, { x: snappedX, y: snappedY });
      }}
    >
      <Rect
        width={node.width}
        height={node.height}
        fill={fillColor}
        stroke={isAmbient ? COLORS.ambientBorder : COLORS.roomBorder}
        strokeWidth={isSelected ? 2.5 : 1.5}
        cornerRadius={8}
        shadowColor={isSelected ? 'rgba(2,132,199,0.25)' : 'rgba(0,0,0,0.1)'}
        shadowBlur={isSelected ? 16 : 6}
        shadowOffsetY={isSelected ? 1 : 2}
      />
      <Text
        text={node.name}
        x={4}
        y={8}
        width={node.width - 8}
        fontSize={12}
        fontFamily="'SF Pro Text', 'PingFang SC', system-ui, sans-serif"
        fontStyle="600"
        fill={isAmbient ? '#065f46' : '#0c4a6e'}
        align="center"
      />
      <Text
        text={isAmbient ? `${(node.temperature - 273.15).toFixed(0)}°C` : `${node.volume}m³`}
        x={4}
        y={24}
        width={node.width - 8}
        fontSize={10}
        fontFamily="'SF Pro Text', 'PingFang SC', system-ui, sans-serif"
        fill="#64748b"
        align="center"
      />
      {pressureText && (
        <Text
          text={pressureText}
          x={4}
          y={node.height - 18}
          width={node.width - 8}
          fontSize={10}
          fontFamily="Inter, sans-serif"
          fontStyle="bold"
          fill={COLORS.pressure}
          align="center"
        />
      )}
      {/* Source indicator */}
      {(sourceCount ?? 0) > 0 && (
        <Circle x={node.width - 8} y={8} radius={6} fill="#f97316" opacity={0.85} />
      )}
      {(sourceCount ?? 0) > 0 && (
        <Text x={node.width - 12} y={4} text="S" fontSize={8} fontStyle="bold" fill="white" />
      )}
    </Group>
  );
}

const SCALE_MIN = 0.2;
const SCALE_MAX = 3.0;
const SCALE_STEP = 1.1;

export default function SketchPad() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const { nodes, links, selectedNodeId, toolMode, addNode, addLink, result, selectNode } = useAppStore();
  const [linkStart, setLinkStart] = useState<number | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition()!;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, direction > 0 ? oldScale * SCALE_STEP : oldScale / SCALE_STEP));
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    setStageScale(newScale);
    setStagePos(newPos);
  }, []);

  const getCanvasPoint = useCallback((pointerPos: { x: number; y: number }) => {
    return {
      x: (pointerPos.x - stagePos.x) / stageScale,
      y: (pointerPos.y - stagePos.y) / stageScale,
    };
  }, [stageScale, stagePos]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleStageClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      const pointerPos = e.target.getStage()!.getPointerPosition()!;
      const pos = getCanvasPoint(pointerPos);

      if (toolMode === 'addRoom') {
        addNode({
          type: 'normal',
          x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE - 60,
          y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE - 40,
        });
      } else if (toolMode === 'addAmbient') {
        addNode({
          type: 'ambient',
          name: '室外',
          temperature: 283.15,
          volume: 0,
          x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE - 60,
          y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE - 40,
        });
      } else if (toolMode === 'select') {
        selectNode(null);
      }
    }
  }, [toolMode, addNode, selectNode, getCanvasPoint]);

  const handleNodeClickForLink = useCallback((nodeId: number) => {
    if (toolMode !== 'addLink') return;
    if (linkStart === null) {
      setLinkStart(nodeId);
    } else if (linkStart !== nodeId) {
      const fromNode = nodes.find((n) => n.id === linkStart)!;
      const toNode = nodes.find((n) => n.id === nodeId)!;
      addLink({
        from: linkStart,
        to: nodeId,
        x: (fromNode.x + toNode.x) / 2,
        y: (fromNode.y + toNode.y) / 2,
      });
      setLinkStart(null);
    }
  }, [toolMode, linkStart, nodes, addLink]);

  const getNodeCenter = (id: number) => {
    const n = nodes.find((node) => node.id === id);
    if (!n) return { x: 0, y: 0 };
    return { x: n.x + n.width / 2, y: n.y + n.height / 2 };
  };

  const zoomTo = useCallback((newScale: number) => {
    const clampedScale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, newScale));
    const stage = stageRef.current;
    if (stage) {
      const centerX = size.width / 2;
      const centerY = size.height / 2;
      const oldScale = stageScale;
      const mousePointTo = {
        x: (centerX - stagePos.x) / oldScale,
        y: (centerY - stagePos.y) / oldScale,
      };
      setStageScale(clampedScale);
      setStagePos({
        x: centerX - mousePointTo.x * clampedScale,
        y: centerY - mousePointTo.y * clampedScale,
      });
    } else {
      setStageScale(clampedScale);
    }
  }, [stageScale, stagePos, size]);

  const { sources } = useAppStore();
  const sourcesByZone = new Map<number, number>();
  sources.forEach((s) => { sourcesByZone.set(s.zoneId, (sourcesByZone.get(s.zoneId) || 0) + 1); });

  return (
    <div ref={containerRef} className="flex-1 bg-background relative overflow-hidden cursor-crosshair">
      {/* Tool mode indicator */}
      {toolMode !== 'select' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full shadow-lg">
          {toolMode === 'addRoom' && '点击放置房间'}
          {toolMode === 'addAmbient' && '点击放置室外节点'}
          {toolMode === 'addLink' && (linkStart === null ? '点击第一个节点' : '点击第二个节点以创建连接')}
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-1 py-0.5 shadow-sm select-none">
        <Button variant="ghost" size="icon-sm" onClick={() => zoomTo(stageScale / SCALE_STEP)}>
          <ZoomOut size={14} />
        </Button>
        <span className="text-xs text-muted-foreground w-10 text-center font-mono">
          {Math.round(stageScale * 100)}%
        </span>
        <Button variant="ghost" size="icon-sm" onClick={() => zoomTo(stageScale * SCALE_STEP)}>
          <ZoomIn size={14} />
        </Button>
        <div className="w-px h-4 bg-border" />
        <Button variant="ghost" size="icon-sm" onClick={() => { setStageScale(1); setStagePos({ x: 0, y: 0 }); }}>
          <Maximize2 size={14} />
        </Button>
      </div>

      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={toolMode === 'select'}
        onWheel={handleWheel}
        onDragEnd={(e: KonvaEventObject<DragEvent>) => {
          if (e.target === e.target.getStage()) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onClick={handleStageClick}
      >
        <Layer>
          <GridLines width={size.width} height={size.height} />
        </Layer>

        <Layer>
          {/* Draw links as arrows */}
          {links.map((link) => {
            const from = getNodeCenter(link.from);
            const to = getNodeCenter(link.to);
            const isSelected = useAppStore.getState().selectedLinkId === link.id;
            const linkResult = result?.links.find((r) => r.id === link.id);
            // HVAC color coding by element type (when no result yet)
            const elemColors: Record<string, string> = {
              Fan: '#2563eb', Duct: '#0d9488', Filter: '#7c3aed',
              Damper: '#d97706', SelfRegulatingVent: '#06b6d4', CheckValve: '#e11d48',
            };
            const baseColor = elemColors[link.element.type] ?? COLORS.link;
            const flowColor = linkResult
              ? (linkResult.massFlow > 0 ? COLORS.flowPositive : COLORS.flowNegative)
              : baseColor;

            const elemLabel: Record<string, string> = {
              PowerLawOrifice: '孔口',
              TwoWayFlow: '大开口',
              Fan: '风扇',
              Duct: '风管',
              Damper: '阀门',
              Filter: '过滤器',
              SelfRegulatingVent: '自调节',
              CheckValve: '单向阀',
            };
            const typeTag = elemLabel[link.element.type] ?? link.element.type;

            return (
              <Group key={`link-${link.id}`}>
                <Arrow
                  points={[from.x, from.y, to.x, to.y]}
                  stroke={isSelected ? COLORS.linkSelected : flowColor}
                  strokeWidth={isSelected ? 3 : 2}
                  pointerLength={8}
                  pointerWidth={6}
                  fill={isSelected ? COLORS.linkSelected : flowColor}
                  onClick={() => useAppStore.getState().selectLink(link.id)}
                  hitStrokeWidth={12}
                />
                <Text
                  x={(from.x + to.x) / 2 - 20}
                  y={(from.y + to.y) / 2 + (linkResult ? -22 : -8)}
                  text={typeTag}
                  fontSize={9}
                  fontFamily="Inter, sans-serif"
                  fill={isSelected ? COLORS.linkSelected : '#94a3b8'}
                  padding={1}
                />
                {linkResult && (
                  <Text
                    x={(from.x + to.x) / 2 - 30}
                    y={(from.y + to.y) / 2 - 10}
                    text={`${(linkResult.massFlow * 1000).toFixed(3)} g/s`}
                    fontSize={9}
                    fontFamily="Inter, sans-serif"
                    fontStyle="bold"
                    fill={flowColor}
                    padding={2}
                  />
                )}
              </Group>
            );
          })}

          {/* Draw link-in-progress */}
          {linkStart !== null && (
            <Circle
              x={getNodeCenter(linkStart).x}
              y={getNodeCenter(linkStart).y}
              radius={8}
              fill="transparent"
              stroke={COLORS.linkSelected}
              strokeWidth={2}
              dash={[4, 4]}
            />
          )}

          {/* Draw nodes */}
          {nodes.map((node) => (
            <Group key={`node-${node.id}`} onClick={() => handleNodeClickForLink(node.id)}>
              <RoomShape
                node={node}
                isSelected={selectedNodeId === node.id}
                result={result}
                sourceCount={sourcesByZone.get(node.id) ?? 0}
              />
            </Group>
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
