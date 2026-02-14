import { Handle, Position, type NodeProps } from '@xyflow/react';

interface SensorNodeData {
  label: string;
  sensorType: string;
  targetId: number;
  speciesIdx: number;
  [key: string]: unknown;
}

const SENSOR_ICONS: Record<string, string> = {
  Concentration: '🧪',
  Pressure: '📊',
  Temperature: '🌡️',
  MassFlow: '💨',
};

export function SensorNode({ data, selected }: NodeProps) {
  const d = data as SensorNodeData;
  return (
    <div className={`px-3 py-2 rounded-lg border-2 bg-blue-50 min-w-[140px] ${
      selected ? 'border-blue-500 shadow-lg' : 'border-blue-200'
    }`}>
      <Handle type="source" position={Position.Right} id="output" className="!bg-blue-500 !w-3 !h-3" />

      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{SENSOR_ICONS[d.sensorType] ?? '📡'}</span>
        <span className="text-xs font-bold text-blue-700">传感器</span>
      </div>
      <div className="text-[11px] font-semibold text-blue-900">{d.label}</div>
      <div className="text-[9px] text-blue-500 mt-0.5">
        {d.sensorType} · 目标#{d.targetId}
      </div>
    </div>
  );
}
