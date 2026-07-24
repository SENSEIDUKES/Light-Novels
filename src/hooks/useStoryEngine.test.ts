import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStoryEngine } from './useStoryEngine';
import { useAppStore } from '../store/useAppStore';

vi.mock('./useChapterGeneration', () => ({
  useChapterGeneration: () => ({ handleGenerateChapter: vi.fn() })
}));
vi.mock('./useArcSteering', () => ({
  useArcSteering: () => ({ handleSteerArc: vi.fn(), handleAlterFate: vi.fn() })
}));
vi.mock('./useStoryGeneration', () => ({
  useStoryGeneration: () => ({ handleGenerateBlueprint: vi.fn(), handleStartStory: vi.fn() })
}));
vi.mock('./useVisualAssets', () => ({
  useVisualAssets: () => ({ handleGenerateCover: vi.fn(), handleApplyCover: vi.fn() })
}));
vi.mock('./useChapterSealing', () => ({
  useChapterSealing: () => ({ handleCheckConsistency: vi.fn(), handleSealChapter: vi.fn() })
}));
vi.mock('../lib/qi', () => ({
  awardQi: vi.fn()
}));

const mockStories: any[] = [
  {
    id: 'story1',
    arcs: [
      {
        chapters: [
          { number: 1, status: 'unread' },
          { number: 2, status: 'read' }
        ]
      }
    ]
  }
];

describe('useStoryEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      stories: JSON.parse(JSON.stringify(mockStories)),
      activeStoryId: 'story1',
      saveStories: vi.fn()
    });
  });

  it('handleUpdateMemoryManual updates memory', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const saveStoriesMock = useAppStore.getState().saveStories;
    
    await act(async () => {
      await result.current.handleUpdateMemoryManual({ powerSystem: 'Test' } as any);
    });

    expect(saveStoriesMock).toHaveBeenCalled();
    const updatedStories = (saveStoriesMock as any).mock.calls[0][0];
    expect(updatedStories[0].memory.powerSystem).toBe('Test');
  });

  it('handleUpdateStoryDirect updates story directly', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const saveStoriesMock = useAppStore.getState().saveStories;

    await act(async () => {
      await result.current.handleUpdateStoryDirect({ id: 'story1', title: 'New Title' } as any);
    });

    expect(saveStoriesMock).toHaveBeenCalled();
    const updatedStories = (saveStoriesMock as any).mock.calls[0][0];
    expect(updatedStories[0].title).toBe('New Title');
  });

  it('handleToggleRead toggles unread to read and awards qi', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const saveStoriesMock = useAppStore.getState().saveStories;
    const { awardQi } = await import('../lib/qi');

    await act(async () => {
      await result.current.handleToggleRead(1);
    });

    expect(saveStoriesMock).toHaveBeenCalled();
    const updatedStories = (saveStoriesMock as any).mock.calls[0][0];
    expect(updatedStories[0].arcs[0].chapters[0].status).toBe('read');
    expect(awardQi).toHaveBeenCalledWith('chapter_finished');
  });

  it('handleToggleRead guards against race conditions on rapid double clicks', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const saveStoriesMock = useAppStore.getState().saveStories;
    const { awardQi } = await import('../lib/qi');

    // We simulate rapid clicks by calling the handler twice concurrently.
    // To make sure state behaves correctly during the double call, we configure
    // saveStoriesMock to actually update the zustand store state synchronously,
    // mimicking the actual saveStories behavior.
    (saveStoriesMock as any).mockImplementation((updated: any) => {
      useAppStore.setState({ stories: updated });
    });

    await act(async () => {
      await Promise.all([
        result.current.handleToggleRead(1),
        result.current.handleToggleRead(1),
      ]);
    });

    // The first call marks it as 'read' and awards Qi.
    // The second call reads the fresh state, sees it as 'read', and toggles it back to 'unread'
    // without awarding Qi again!
    expect(awardQi).toHaveBeenCalledTimes(1);

    const finalStories = useAppStore.getState().stories;
    // Toggled back to unread by the second click
    expect(finalStories[0].arcs[0].chapters[0].status).toBe('unread');
  });

  it('handleToggleRead toggles read to unread', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const saveStoriesMock = useAppStore.getState().saveStories;
    const { awardQi } = await import('../lib/qi');
    (awardQi as any).mockClear();

    await act(async () => {
      await result.current.handleToggleRead(2);
    });

    expect(saveStoriesMock).toHaveBeenCalled();
    const updatedStories = (saveStoriesMock as any).mock.calls[0][0];
    expect(updatedStories[0].arcs[0].chapters[1].status).toBe('unread');
    expect(awardQi).not.toHaveBeenCalled();
  });

  it('returns all required handlers', () => {
    const { result } = renderHook(() => useStoryEngine());
    expect(typeof result.current.handleGenerateChapter).toBe('function');
    expect(typeof result.current.handleSteerArc).toBe('function');
    expect(typeof result.current.handleAlterFate).toBe('function');
    expect(typeof result.current.handleGenerateBlueprint).toBe('function');
    expect(typeof result.current.handleStartStory).toBe('function');
    expect(typeof result.current.handleGenerateCover).toBe('function');
    expect(typeof result.current.handleApplyCover).toBe('function');
    expect(typeof result.current.handleCheckConsistency).toBe('function');
    expect(typeof result.current.handleSealChapter).toBe('function');
  });
});
