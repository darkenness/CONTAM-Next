import { useEffect } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { Button } from '../../components/ui/button';
import { Plus, ChevronUp, ChevronDown } from 'lucide-react';

export function FloorSwitcher() {
  const stories = useCanvasStore(s => s.stories);
  const activeStoryId = useCanvasStore(s => s.activeStoryId);
  const setActiveStory = useCanvasStore(s => s.setActiveStory);
  const addStory = useCanvasStore(s => s.addStory);

  const activeIdx = stories.findIndex(s => s.id === activeStoryId);
  const activeStory = stories[activeIdx];

  // PageUp/PageDown shortcuts for floor switching
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'PageUp') {
        e.preventDefault();
        if (activeIdx < stories.length - 1) {
          setActiveStory(stories[activeIdx + 1].id);
        }
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        if (activeIdx > 0) {
          setActiveStory(stories[activeIdx - 1].id);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeIdx, stories, setActiveStory]);

  if (stories.length <= 1 && !activeStory) return null;

  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col items-center gap-0.5 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-1 py-1 shadow-sm select-none">
      {/* Go up */}
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={activeIdx >= stories.length - 1}
        onClick={() => {
          if (activeIdx < stories.length - 1) setActiveStory(stories[activeIdx + 1].id);
        }}
      >
        <ChevronUp size={14} />
      </Button>

      {/* Floor list */}
      {stories.map((story) => (
        <button
          key={story.id}
          onClick={() => setActiveStory(story.id)}
          className={`w-7 h-7 text-[10px] font-bold rounded flex items-center justify-center transition-colors ${
            story.id === activeStoryId
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent'
          }`}
          title={story.name}
        >
          {story.level + 1}
        </button>
      ))}

      {/* Go down */}
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={activeIdx <= 0}
        onClick={() => {
          if (activeIdx > 0) setActiveStory(stories[activeIdx - 1].id);
        }}
      >
        <ChevronDown size={14} />
      </Button>

      {/* Add floor */}
      <div className="w-full h-px bg-border my-0.5" />
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={addStory}
        title="添加楼层"
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}
