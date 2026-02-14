import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/button';
import { Square, Cloud, Link2, FolderOpen, BookOpen } from 'lucide-react';
import { useRef } from 'react';

export default function WelcomePage() {
  const { setToolMode, loadFromJson, setError } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        loadFromJson(json);
      } catch (err) {
        setError(`文件解析失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const loadExample = () => {
    loadFromJson({
      description: '示例：3房间自然通风',
      ambient: { temperature: 283.15, pressure: 0, windSpeed: 3, windDirection: 0 },
      nodes: [
        { id: 1, name: '室外', type: 'ambient', temperature: 283.15, elevation: 0, volume: 0 },
        { id: 2, name: '客厅', type: 'normal', temperature: 293.15, elevation: 0, volume: 60 },
        { id: 3, name: '卧室', type: 'normal', temperature: 295.15, elevation: 0, volume: 30 },
        { id: 4, name: '厨房', type: 'normal', temperature: 297.15, elevation: 0, volume: 20 },
      ],
      links: [
        { id: 5, from: 1, to: 2, elevation: 1.5, element: { type: 'PowerLawOrifice', C: 0.002, n: 0.65 } },
        { id: 6, from: 2, to: 3, elevation: 1.5, element: { type: 'TwoWayFlow', Cd: 0.65, area: 1.8 } },
        { id: 7, from: 2, to: 4, elevation: 1.5, element: { type: 'PowerLawOrifice', C: 0.001, n: 0.65 } },
        { id: 8, from: 4, to: 1, elevation: 2.5, element: { type: 'Fan', maxFlow: 0.05, shutoffPressure: 100 } },
      ],
      species: [
        { id: 0, name: 'CO₂', molarMass: 0.044, decayRate: 0, outdoorConcentration: 7.2e-4 },
      ],
      sources: [
        { zoneId: 2, speciesId: 0, generationRate: 5e-6, removalRate: 0, scheduleId: -1 },
      ],
      transient: { startTime: 0, endTime: 3600, timeStep: 60, outputInterval: 60 },
    });
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 max-w-md px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-xl font-black text-white shadow-lg">
            C
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">CONTAM-Next</h1>
            <p className="text-sm text-muted-foreground">多区域气流与污染物传输仿真</p>
          </div>
        </div>

        {/* Quick Start */}
        <div className="w-full space-y-2">
          <h2 className="text-sm font-semibold text-foreground">快速开始</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={() => setToolMode('addRoom')}>
              <Square size={20} className="text-blue-500" />
              <span className="text-xs">添加房间</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={() => setToolMode('addAmbient')}>
              <Cloud size={20} className="text-green-500" />
              <span className="text-xs">添加室外节点</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={loadExample}>
              <BookOpen size={20} className="text-purple-500" />
              <span className="text-xs">加载示例模型</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={handleOpen}>
              <FolderOpen size={20} className="text-orange-500" />
              <span className="text-xs">打开文件</span>
            </Button>
          </div>
        </div>

        {/* Steps */}
        <div className="w-full space-y-1.5 text-xs text-muted-foreground">
          <h3 className="text-sm font-semibold text-foreground">工作流程</h3>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
            <span>在画布上绘制房间和室外节点</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
            <span>用连接工具 (<Link2 size={12} className="inline" />) 创建气流路径，选择元件类型</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
            <span>在右侧面板配置污染物、排程和控制系统</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">4</span>
            <span>点击顶部"稳态求解"或"瞬态仿真"按钮运行计算</span>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".json,.contam.json" onChange={handleFileChange} className="hidden" />
      </div>
    </div>
  );
}
