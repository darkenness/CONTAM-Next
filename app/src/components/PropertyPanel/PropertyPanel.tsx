import { useAppStore } from '../../store/useAppStore';
import { Trash2, Box, Cloud, Link2 } from 'lucide-react';

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

function NodeProperties() {
  const { nodes, selectedNodeId, updateNode, removeNode } = useAppStore();
  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const isAmbient = node.type === 'ambient';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {isAmbient ? <Cloud size={16} className="text-green-600" /> : <Box size={16} className="text-blue-600" />}
        <span className="text-sm font-bold text-slate-700">{isAmbient ? 'Ambient Node' : 'Room / Zone'}</span>
        <button
          onClick={() => removeNode(node.id)}
          className="ml-auto p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <InputField label="Name" value={node.name} onChange={(v) => updateNode(node.id, { name: v })} />
      <InputField
        label="Temperature" value={node.temperature} unit="K" type="number" step="0.1"
        onChange={(v) => updateNode(node.id, { temperature: parseFloat(v) || 0 })}
      />
      <InputField
        label="Elevation" value={node.elevation} unit="m" type="number" step="0.1"
        onChange={(v) => updateNode(node.id, { elevation: parseFloat(v) || 0 })}
      />

      {!isAmbient && (
        <InputField
          label="Volume" value={node.volume} unit="m³" type="number" step="1"
          onChange={(v) => updateNode(node.id, { volume: parseFloat(v) || 0 })}
        />
      )}

      <div className="mt-1 px-2 py-1.5 bg-slate-50 rounded text-[10px] text-slate-500">
        ID: {node.id} &nbsp;|&nbsp; Type: {node.type} &nbsp;|&nbsp; Pos: ({node.x}, {node.y})
      </div>
    </div>
  );
}

function LinkProperties() {
  const { links, selectedLinkId, updateLink, removeLink, nodes } = useAppStore();
  const link = links.find((l) => l.id === selectedLinkId);
  if (!link) return null;

  const fromNode = nodes.find((n) => n.id === link.from);
  const toNode = nodes.find((n) => n.id === link.to);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Link2 size={16} className="text-slate-600" />
        <span className="text-sm font-bold text-slate-700">Airflow Path</span>
        <button
          onClick={() => removeLink(link.id)}
          className="ml-auto p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1.5">
        {fromNode?.name ?? `#${link.from}`} → {toNode?.name ?? `#${link.to}`}
      </div>

      <InputField
        label="Elevation (Z_k)" value={link.elevation} unit="m" type="number" step="0.1"
        onChange={(v) => updateLink(link.id, { elevation: parseFloat(v) || 0 })}
      />

      <div className="border-t border-slate-100 pt-2 mt-1">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Flow Element</span>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Type</span>
          <select
            value={link.element.type}
            onChange={(e) => updateLink(link.id, {
              element: { ...link.element, type: e.target.value as 'PowerLawOrifice' }
            })}
            className="px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
          >
            <option value="PowerLawOrifice">Power Law Orifice</option>
          </select>
        </label>

        {link.element.type === 'PowerLawOrifice' && (
          <>
            <InputField
              label="Flow Coefficient (C)" value={link.element.C ?? 0.001} type="number" step="0.0001"
              onChange={(v) => updateLink(link.id, {
                element: { ...link.element, C: parseFloat(v) || 0.001 }
              })}
            />
            <InputField
              label="Flow Exponent (n)" value={link.element.n ?? 0.65} type="number" step="0.01"
              onChange={(v) => updateLink(link.id, {
                element: { ...link.element, n: Math.max(0.5, Math.min(1.0, parseFloat(v) || 0.65)) }
              })}
            />
          </>
        )}
      </div>

      <div className="mt-1 px-2 py-1.5 bg-slate-50 rounded text-[10px] text-slate-500">
        ID: {link.id}
      </div>
    </div>
  );
}

function AmbientSettings() {
  const { ambientTemperature, windSpeed, windDirection, setAmbient } = useAppStore();

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-bold text-slate-700">Ambient Conditions</span>
      <InputField
        label="Temperature" value={ambientTemperature} unit="K" type="number" step="0.1"
        onChange={(v) => setAmbient({ ambientTemperature: parseFloat(v) || 283.15 })}
      />
      <InputField
        label="Wind Speed" value={windSpeed} unit="m/s" type="number" step="0.1"
        onChange={(v) => setAmbient({ windSpeed: parseFloat(v) || 0 })}
      />
      <InputField
        label="Wind Direction" value={windDirection} unit="°" type="number" step="1"
        onChange={(v) => setAmbient({ windDirection: parseFloat(v) || 0 })}
      />
    </div>
  );
}

export default function PropertyPanel() {
  const { selectedNodeId, selectedLinkId } = useAppStore();

  return (
    <aside className="w-64 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto">
      <div className="px-3 py-2 border-b border-slate-100">
        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Properties</h2>
      </div>

      <div className="p-3 flex-1 flex flex-col gap-4">
        {selectedNodeId !== null ? (
          <NodeProperties />
        ) : selectedLinkId !== null ? (
          <LinkProperties />
        ) : (
          <>
            <AmbientSettings />
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-400 leading-relaxed">
              Select a room or link to edit its properties. Use the toolbar to add new elements.
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
