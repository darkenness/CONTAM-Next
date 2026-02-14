import { Handle, Position, type NodeProps } from '@xyflow/react';

interface PIControllerNodeData {
  label: string;
  Kp: number;
  Ki: number;
  setpoint: number;
  deadband: number;
  [key: string]: unknown;
}

export function PIControllerNode({ data, selected }: NodeProps) {
  const d = data as PIControllerNodeData;
  return (
    <div className={`px-3 py-2 rounded-lg border-2 bg-purple-50 min-w-[160px] ${
      selected ? 'border-purple-500 shadow-lg' : 'border-purple-200'
    }`}>
      {/* Input handles: signal1 from left, signal2 from top (CONTAM convention) */}
      <Handle type="target" position={Position.Left} id="input1" className="!bg-purple-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Top} id="input2" className="!bg-purple-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="output" className="!bg-purple-600 !w-3 !h-3" />

      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">⚙️</span>
        <span className="text-xs font-bold text-purple-700">PI 控制器</span>
      </div>
      <div className="text-[11px] font-semibold text-purple-900">{d.label}</div>
      <div className="text-[9px] text-purple-500 mt-0.5 space-y-0.5">
        <div>Kp={d.Kp} Ki={d.Ki}</div>
        <div>设定值={d.setpoint} 死区={d.deadband}</div>
      </div>
    </div>
  );
}
