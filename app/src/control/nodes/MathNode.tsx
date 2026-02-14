import { Handle, Position, type NodeProps } from '@xyflow/react';

interface MathNodeData {
  label: string;
  operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'min' | 'max';
  [key: string]: unknown;
}

const OP_SYMBOLS: Record<string, string> = {
  add: '+', subtract: '−', multiply: '×', divide: '÷', min: 'min', max: 'max',
};

export function MathNode({ data, selected }: NodeProps) {
  const d = data as MathNodeData;
  return (
    <div className={`px-3 py-2 rounded-lg border-2 bg-amber-50 min-w-[100px] ${
      selected ? 'border-amber-500 shadow-lg' : 'border-amber-200'
    }`}>
      <Handle type="target" position={Position.Left} id="input1" className="!bg-amber-500 !w-3 !h-3" style={{ top: '30%' }} />
      <Handle type="target" position={Position.Left} id="input2" className="!bg-amber-400 !w-3 !h-3" style={{ top: '70%' }} />
      <Handle type="source" position={Position.Right} id="output" className="!bg-amber-600 !w-3 !h-3" />

      <div className="text-center">
        <span className="text-lg font-bold text-amber-700">{OP_SYMBOLS[d.operation] ?? '?'}</span>
        <div className="text-[9px] text-amber-500">{d.label}</div>
      </div>
    </div>
  );
}
