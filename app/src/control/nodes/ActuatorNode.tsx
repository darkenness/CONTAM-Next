import { Handle, Position, type NodeProps } from '@xyflow/react';

interface ActuatorNodeData {
  label: string;
  actuatorType: string;
  linkIdx: number;
  [key: string]: unknown;
}

const ACTUATOR_ICONS: Record<string, string> = {
  DamperFraction: '🔧',
  FanSpeed: '🌀',
  FilterBypass: '🔄',
};

export function ActuatorNode({ data, selected }: NodeProps) {
  const d = data as ActuatorNodeData;
  return (
    <div className={`px-3 py-2 rounded-lg border-2 bg-green-50 min-w-[140px] ${
      selected ? 'border-green-500 shadow-lg' : 'border-green-200'
    }`}>
      <Handle type="target" position={Position.Left} id="input" className="!bg-green-500 !w-3 !h-3" />

      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{ACTUATOR_ICONS[d.actuatorType] ?? '🎛️'}</span>
        <span className="text-xs font-bold text-green-700">执行器</span>
      </div>
      <div className="text-[11px] font-semibold text-green-900">{d.label}</div>
      <div className="text-[9px] text-green-500 mt-0.5">
        {d.actuatorType} · 路径#{d.linkIdx}
      </div>
    </div>
  );
}
