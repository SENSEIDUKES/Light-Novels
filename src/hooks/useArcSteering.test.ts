import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useArcSteering } from './useArcSteering';
import { useAppStore } from '../store/useAppStore';

vi.mock('../store/useAppStore', () => ({
  useAppStore: vi.fn()
}));

vi.mock('../lib/storage', () => ({
  storyStorage: {
    getStories: vi.fn()
  }
}));

describe('useArcSteering - Steering action processing', () => {
  let mockStore: any;
  let saveStoriesSpy: any;
  let setAppErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    saveStoriesSpy = vi.fn();
    setAppErrorSpy = vi.fn();

    mockStore = {
      isGenerating: false,
      activeStoryId: 'story-1',
      stories: [
        {
          id: 'story-1',
          memory: { currentPowerStage: 'Low' },
          arcs: [
            {
              isCompleted: true,
              chapters: []
            }
          ]
        }
      ],
      routingConfig: { storyMaker: 'default' },
      setIsGenerating: vi.fn(),
      setAppError: setAppErrorSpy,
      saveStories: saveStoriesSpy,
      setGenerationPhase: vi.fn()
    };

    (useAppStore as any).mockReturnValue(mockStore);
    (useAppStore as any).getState = vi.fn().mockReturnValue(mockStore);
    global.fetch = vi.fn();
  });

  it('processes steering action to generate new arc', async () => {
    const { result } = renderHook(() => useArcSteering());

    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('steer-arc')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            arcTitle: 'Next Arc',
            arcSummary: 'Summary',
            chapters: [{ number: 2, title: 'C2', premise: 'P2' }]
          })
        });
      }
      return Promise.reject();
    });

    await act(async () => {
      await result.current.handleSteerArc('Go to the mountains', '3');
    });

    expect(saveStoriesSpy).toHaveBeenCalled();
    const updated = saveStoriesSpy.mock.calls[0][0];
    expect(updated[0].arcs.length).toBe(2);
    expect(updated[0].arcs[1].title).toBe('Next Arc');
    expect(updated[0].arcs[1].chapters[0].title).toBe('C2');
  });

  it('handles API error correctly', async () => {
    const { result } = renderHook(() => useArcSteering());
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Steering Failed' })
    });

    await act(async () => {
      await result.current.handleSteerArc('Direction', '3');
    });

    expect(setAppErrorSpy).toHaveBeenCalledWith('Steering Failed');
  });
});
