import { useAppStore } from '../../store/useAppStore';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

export default function ResultsView() {
  const { result, error, isRunning, setResult, setError } = useAppStore();

  if (isRunning) {
    return (
      <div className="h-10 bg-blue-50 border-t border-blue-100 flex items-center px-4 gap-2 shrink-0">
        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-blue-700 font-medium">Solving airflow network...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-t border-red-200 px-4 py-2 flex items-center gap-2 shrink-0">
        <XCircle size={14} className="text-red-500 shrink-0" />
        <span className="text-xs text-red-700 flex-1 truncate">{error}</span>
        <button onClick={() => setError(null)} className="p-0.5 hover:bg-red-100 rounded">
          <X size={12} className="text-red-400" />
        </button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="bg-slate-50 border-t border-slate-200 shrink-0">
      {/* Status bar */}
      <div className="flex items-center px-4 py-1.5 gap-3 border-b border-slate-100">
        {result.solver.converged ? (
          <CheckCircle size={14} className="text-green-500" />
        ) : (
          <AlertTriangle size={14} className="text-amber-500" />
        )}
        <span className="text-xs font-medium text-slate-700">
          {result.solver.converged ? 'Converged' : 'Did not converge'}
        </span>
        <span className="text-[10px] text-slate-400">
          {result.solver.iterations} iterations &nbsp;|&nbsp; max residual: {result.solver.maxResidual.toExponential(2)} kg/s
        </span>
        <div className="flex-1" />
        <button onClick={() => setResult(null)} className="p-0.5 hover:bg-slate-200 rounded">
          <X size={12} className="text-slate-400" />
        </button>
      </div>

      {/* Results tables */}
      <div className="flex gap-4 px-4 py-2 overflow-x-auto max-h-40 overflow-y-auto">
        {/* Nodes table */}
        <div className="flex-1 min-w-[200px]">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nodes</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase">
                <th className="text-left pr-2 font-semibold">Name</th>
                <th className="text-right pr-2 font-semibold">P (Pa)</th>
                <th className="text-right pr-2 font-semibold">ρ (kg/m³)</th>
                <th className="text-right font-semibold">T (°C)</th>
              </tr>
            </thead>
            <tbody>
              {result.nodes.map((n) => (
                <tr key={n.id} className="border-t border-slate-100">
                  <td className="py-0.5 pr-2 text-slate-700 font-medium">{n.name}</td>
                  <td className="py-0.5 pr-2 text-right text-purple-600 font-mono">{n.pressure.toFixed(3)}</td>
                  <td className="py-0.5 pr-2 text-right text-slate-500 font-mono">{n.density.toFixed(4)}</td>
                  <td className="py-0.5 text-right text-slate-500 font-mono">{(n.temperature - 273.15).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Links table */}
        <div className="flex-1 min-w-[200px]">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Links</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase">
                <th className="text-left pr-2 font-semibold">Path</th>
                <th className="text-right pr-2 font-semibold">ṁ (g/s)</th>
                <th className="text-right font-semibold">Q (L/s)</th>
              </tr>
            </thead>
            <tbody>
              {result.links.map((l) => {
                const fromName = result.nodes.find((n) => n.id === l.from)?.name ?? `#${l.from}`;
                const toName = result.nodes.find((n) => n.id === l.to)?.name ?? `#${l.to}`;
                const flowColor = l.massFlow > 0 ? 'text-green-600' : l.massFlow < 0 ? 'text-red-500' : 'text-slate-400';
                return (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="py-0.5 pr-2 text-slate-700 font-medium truncate max-w-[120px]">{fromName}→{toName}</td>
                    <td className={`py-0.5 pr-2 text-right font-mono ${flowColor}`}>{(l.massFlow * 1000).toFixed(4)}</td>
                    <td className={`py-0.5 text-right font-mono ${flowColor}`}>{(l.volumeFlow_m3s * 1000).toFixed(4)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
