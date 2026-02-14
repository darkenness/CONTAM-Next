import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { TooltipProvider } from './components/ui/tooltip';
import { Toaster } from './components/ui/toaster';
import TopBar from './components/TopBar/TopBar';
import VerticalToolbar from './components/VerticalToolbar/VerticalToolbar';
import SketchPad from './components/SketchPad/SketchPad';
import PropertyPanel from './components/PropertyPanel/PropertyPanel';
import ResultsView from './components/ResultsView/ResultsView';
import TransientChart from './components/TransientChart/TransientChart';
import StatusBar from './components/StatusBar/StatusBar';
import { useAppStore } from './store/useAppStore';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

function BottomPanel() {
  const { result, transientResult } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);
  const hasResults = result || transientResult;

  if (!hasResults) return null;

  return (
    <>
      <div className="h-px bg-border shrink-0" />
      <div className="flex items-center justify-between px-3 py-1 bg-card border-b border-border shrink-0">
        <span className="text-xs font-medium text-muted-foreground">
          {transientResult ? '瞬态仿真结果' : '稳态求解结果'}
        </span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-0.5 rounded hover:bg-accent text-muted-foreground"
        >
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {!collapsed && (
        <div className="max-h-[280px] overflow-auto shrink-0">
          <ResultsView />
          <TransientChart />
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen w-screen bg-background text-foreground">
        <TopBar />
        <div className="flex flex-1 min-h-0">
          <VerticalToolbar />
          <PanelGroup orientation="horizontal">
            {/* Center: Canvas + Bottom Results */}
            <Panel defaultSize={75} minSize={40}>
              <div className="flex flex-col h-full">
                <div className="flex-1 min-h-0">
                  <SketchPad />
                </div>
                <BottomPanel />
              </div>
            </Panel>

            {/* Resize Handle */}
            <PanelResizeHandle className="w-1 bg-border hover:bg-primary/30 transition-colors cursor-col-resize" />

            {/* Right: Property Panel */}
            <Panel defaultSize={25} minSize={15} maxSize={40}>
              <PropertyPanel />
            </Panel>
          </PanelGroup>
        </div>
        <StatusBar />
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

export default App
