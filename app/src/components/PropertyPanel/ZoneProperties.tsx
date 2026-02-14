import { useCanvasStore } from '../../store/useCanvasStore';
import { faceArea, getFaceVertices } from '../../model/geometry';
import { Trash2, Box } from 'lucide-react';

function InputField({ label, value, onChange, unit, type = 'text', step }: {
  label: string; value: string | number; onChange: (v: string) => void; unit?: string; type?: string; step?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type={type}
          value={value}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white"
        />
        {unit && <span className="text-[10px] text-slate-400 min-w-[24px]">{unit}</span>}
      </div>
    </label>
  );
}

export function ZoneProperties() {
  const selectedFaceId = useCanvasStore(s => s.selectedFaceId);
  const story = useCanvasStore(s => s.getActiveStory());
  const updateZone = useCanvasStore(s => s.updateZone);

  if (!selectedFaceId) return null;

  const geo = story.geometry;
  const face = geo.faces.find(f => f.id === selectedFaceId);
  if (!face) return null;

  const zone = story.zoneAssignments.find(z => z.faceId === selectedFaceId);
  if (!zone) return null;

  const area = faceArea(geo, face);
  const vertices = getFaceVertices(geo, face);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Box size={16} className="text-blue-600" />
        <span className="text-sm font-bold text-slate-700">区域 / 房间</span>
      </div>

      <InputField
        label="名称"
        value={zone.name}
        onChange={(v) => updateZone(selectedFaceId, { name: v })}
      />
      <InputField
        label="温度"
        value={zone.temperature}
        unit="K"
        type="number"
        step="0.1"
        onChange={(v) => updateZone(selectedFaceId, { temperature: parseFloat(v) || 293.15 })}
      />
      <InputField
        label="体积"
        value={zone.volume}
        unit="m³"
        type="number"
        step="1"
        onChange={(v) => updateZone(selectedFaceId, { volume: parseFloat(v) || 0 })}
      />

      <div className="mt-1 px-2 py-1.5 bg-muted rounded text-[11px] text-muted-foreground space-y-0.5">
        <div>面积: {area.toFixed(2)} m²</div>
        <div>顶点数: {vertices.length}</div>
        <div>Zone ID: {zone.zoneId}</div>
        <div>颜色: <span className="inline-block w-3 h-3 rounded-sm align-middle" style={{ backgroundColor: zone.color }} /></div>
      </div>
    </div>
  );
}

export function EdgeProperties() {
  const selectedEdgeId = useCanvasStore(s => s.selectedEdgeId);
  const story = useCanvasStore(s => s.getActiveStory());
  const removeEdge = useCanvasStore(s => s.removeEdge);

  if (!selectedEdgeId) return null;

  const geo = story.geometry;
  const edge = geo.edges.find(e => e.id === selectedEdgeId);
  if (!edge) return null;

  const length = (() => {
    const v1 = geo.vertices.find(v => v.id === edge.vertexIds[0]);
    const v2 = geo.vertices.find(v => v.id === edge.vertexIds[1]);
    if (!v1 || !v2) return 0;
    return Math.sqrt((v2.x - v1.x) ** 2 + (v2.y - v1.y) ** 2);
  })();

  const facesCount = edge.faceIds.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-slate-400 rounded-sm" />
        <span className="text-sm font-bold text-slate-700">墙壁</span>
        <button
          onClick={() => removeEdge(selectedEdgeId)}
          className="ml-auto p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="px-2 py-1.5 bg-muted rounded text-[11px] text-muted-foreground space-y-0.5">
        <div>长度: {length.toFixed(2)} m</div>
        <div>高度: {edge.wallHeight.toFixed(1)} m</div>
        <div>厚度: {edge.wallThickness.toFixed(2)} m</div>
        <div>类型: {edge.isExterior ? '外墙' : '内墙'}</div>
        <div>相邻面: {facesCount}</div>
      </div>

      {/* Placements on this edge */}
      {story.placements.filter(p => p.edgeId === selectedEdgeId).length > 0 && (
        <div className="border-t border-border pt-2">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            此墙上的组件
          </span>
          <div className="mt-1 space-y-1">
            {story.placements
              .filter(p => p.edgeId === selectedEdgeId)
              .map(p => (
                <div key={p.id} className="flex items-center gap-2 text-xs px-2 py-1 bg-slate-50 rounded">
                  <span className={`w-2 h-2 rounded-full ${p.isConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>{p.type}</span>
                  <span className="text-slate-400">α={p.alpha.toFixed(2)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function StoryProperties() {
  const story = useCanvasStore(s => s.getActiveStory());
  const updateStoryHeight = useCanvasStore(s => s.updateStoryHeight);

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-bold text-slate-700">楼层设置</span>
      <InputField
        label="楼层名称"
        value={story.name}
        onChange={() => {}}
      />
      <InputField
        label="层高"
        value={story.floorToCeilingHeight}
        unit="m"
        type="number"
        step="0.1"
        onChange={(v) => updateStoryHeight(story.id, parseFloat(v) || 3.0)}
      />
      <div className="px-2 py-1.5 bg-muted rounded text-[11px] text-muted-foreground space-y-0.5">
        <div>墙壁数: {story.geometry.edges.length}</div>
        <div>区域数: {story.geometry.faces.length}</div>
        <div>组件数: {story.placements.length}</div>
      </div>
    </div>
  );
}
