import { useAppStore } from '../../store/useAppStore';
import { CheckCircle, XCircle, AlertTriangle, X, Download } from 'lucide-react';
import { toast } from '../../hooks/use-toast';

export default function ResultsView() {
  const { result, error, isRunning, setResult, setError, nodes: modelNodes, links: modelLinks } = useAppStore();

  if (isRunning) {
    return (
      <div className="h-10 bg-primary/5 border-t border-primary/10 flex items-center px-4 gap-2 shrink-0">
        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-primary font-medium">正在求解气流网络...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/5 border-t border-destructive/20 px-4 py-2 flex items-center gap-2 shrink-0">
        <XCircle size={14} className="text-destructive shrink-0" />
        <span className="text-xs text-destructive flex-1 truncate">{error}</span>
        <button onClick={() => setError(null)} className="p-0.5 hover:bg-destructive/10 rounded">
          <X size={12} className="text-destructive/60" />
        </button>
      </div>
    );
  }

  if (!result) return null;

  // Compute ACH for each non-ambient node
  const achMap = new Map<number, number>();
  modelNodes.forEach((mn) => {
    if (mn.type === 'ambient' || mn.volume <= 0) return;
    let totalInflow_m3s = 0;
    result.links.forEach((rl) => {
      if (rl.massFlow > 0 && modelLinks.find((ml) => ml.id === rl.id)?.to === mn.id) {
        totalInflow_m3s += Math.abs(rl.volumeFlow_m3s);
      } else if (rl.massFlow < 0 && modelLinks.find((ml) => ml.id === rl.id)?.from === mn.id) {
        totalInflow_m3s += Math.abs(rl.volumeFlow_m3s);
      }
    });
    achMap.set(mn.id, (totalInflow_m3s / mn.volume) * 3600);
  });

  const handleExportCSV = () => {
    const nodeHeader = '名称,压力(Pa),密度(kg/m³),温度(°C),ACH(1/h)';
    const nodeRows = result.nodes.map((n) => {
      const ach = achMap.get(n.id);
      return `${n.name},${n.pressure.toFixed(4)},${n.density.toFixed(5)},${(n.temperature - 273.15).toFixed(2)},${ach !== undefined ? ach.toFixed(2) : 'N/A'}`;
    });
    const linkHeader = '路径,质量流量(kg/s),体积流量(m³/s)';
    const linkRows = result.links.map((l) => {
      const from = result.nodes.find((n) => n.id === l.from)?.name ?? l.from;
      const to = result.nodes.find((n) => n.id === l.to)?.name ?? l.to;
      return `${from}→${to},${l.massFlow.toExponential(6)},${l.volumeFlow_m3s.toExponential(6)}`;
    });
    const csv = [nodeHeader, ...nodeRows, '', linkHeader, ...linkRows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'steady_state_results.csv'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: '已导出', description: 'steady_state_results.csv' });
  };

  return (
    <div className="bg-card shrink-0">
      {/* Status bar */}
      <div className="flex items-center px-4 py-1.5 gap-3 border-b border-border">
        {result.solver.converged ? (
          <CheckCircle size={14} className="text-green-500" />
        ) : (
          <AlertTriangle size={14} className="text-amber-500" />
        )}
        <span className="text-xs font-medium text-foreground">
          {result.solver.converged ? '已收敛' : '未收敛'}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {result.solver.iterations} 次迭代 &nbsp;|&nbsp; 残差: {result.solver.maxResidual.toExponential(2)} kg/s
        </span>
        <div className="flex-1" />
        <button onClick={handleExportCSV} className="p-1 hover:bg-accent rounded" title="导出CSV">
          <Download size={13} className="text-muted-foreground" />
        </button>
        <button onClick={() => setResult(null)} className="p-1 hover:bg-accent rounded">
          <X size={13} className="text-muted-foreground" />
        </button>
      </div>

      {/* Results tables */}
      <div className="flex gap-4 px-4 py-2 overflow-x-auto max-h-48 overflow-y-auto">
        {/* Nodes table */}
        <div className="flex-1 min-w-[260px]">
          <h3 className="text-[11px] font-semibold text-muted-foreground tracking-wider mb-1">节点结果</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] text-muted-foreground">
                <th className="text-left pr-2 font-semibold">名称</th>
                <th className="text-right pr-2 font-semibold">压力 (Pa)</th>
                <th className="text-right pr-2 font-semibold">密度</th>
                <th className="text-right pr-2 font-semibold">温度 (°C)</th>
                <th className="text-right font-semibold">ACH</th>
              </tr>
            </thead>
            <tbody>
              {result.nodes.map((n) => {
                const ach = achMap.get(n.id);
                return (
                  <tr key={n.id} className="border-t border-border">
                    <td className="py-0.5 pr-2 text-foreground font-medium">{n.name}</td>
                    <td className="py-0.5 pr-2 text-right text-purple-600 font-mono">{n.pressure.toFixed(3)}</td>
                    <td className="py-0.5 pr-2 text-right text-muted-foreground font-mono">{n.density.toFixed(4)}</td>
                    <td className="py-0.5 pr-2 text-right text-muted-foreground font-mono">{(n.temperature - 273.15).toFixed(1)}</td>
                    <td className="py-0.5 text-right font-mono font-semibold text-blue-600">
                      {ach !== undefined ? ach.toFixed(1) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Links table */}
        <div className="flex-1 min-w-[200px]">
          <h3 className="text-[11px] font-semibold text-muted-foreground tracking-wider mb-1">路径结果</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] text-muted-foreground">
                <th className="text-left pr-2 font-semibold">路径</th>
                <th className="text-right pr-2 font-semibold">质量流量 (g/s)</th>
                <th className="text-right font-semibold">体积流量 (L/s)</th>
              </tr>
            </thead>
            <tbody>
              {result.links.map((l) => {
                const fromName = result.nodes.find((n) => n.id === l.from)?.name ?? `#${l.from}`;
                const toName = result.nodes.find((n) => n.id === l.to)?.name ?? `#${l.to}`;
                const flowColor = l.massFlow > 0 ? 'text-green-600' : l.massFlow < 0 ? 'text-red-500' : 'text-muted-foreground';
                return (
                  <tr key={l.id} className="border-t border-border">
                    <td className="py-0.5 pr-2 text-foreground font-medium truncate max-w-[120px]">{fromName}→{toName}</td>
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
