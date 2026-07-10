import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../store/useAppStore';
import { useCodexDeletions } from './useCodexDeletions';

describe('useCodexDeletions', () => {
  beforeEach(() => {
    useAppStore.getState().setStories([]);
  });

  it.each([
    ['handleDeleteFaction', 'factions'],
    ['handleDeleteArtifact', 'artifacts'],
    ['handleDeleteLocation', 'locations'],
  ] as const)('removes only the selected item with %s', (handler, field) => {
    const memory = {
      [field]: [{ id: 'keep' }, { id: 'delete' }],
    } as any;
    const onUpdateMemory = vi.fn();
    const { result } = renderHook(() =>
      useCodexDeletions(memory, onUpdateMemory, { id: 'story' } as any, vi.fn()),
    );

    act(() => result.current[handler]('delete'));

    expect(onUpdateMemory).toHaveBeenCalledWith({
      ...memory,
      [field]: [{ id: 'keep' }],
    });
  });

  it('deletes a relationship from the latest store snapshot', () => {
    const staleStory = {
      id: 'story',
      title: 'stale title',
      relationships: [{ id: 'delete' }],
    } as any;
    const latestStory = {
      ...staleStory,
      title: 'latest title',
      relationships: [{ id: 'keep' }, { id: 'delete' }],
    } as any;
    useAppStore.getState().setStories([latestStory]);
    const onUpdateStory = vi.fn();
    const { result } = renderHook(() =>
      useCodexDeletions({} as any, vi.fn(), staleStory, onUpdateStory),
    );

    act(() => result.current.handleDeleteCustomRelationship('delete'));

    expect(onUpdateStory).toHaveBeenCalledWith({
      ...latestStory,
      relationships: [{ id: 'keep' }],
    });
  });

  it('deletes a fate node from the latest store snapshot', () => {
    const staleStory = { id: 'story', karmaNodes: [{ id: 'delete' }] } as any;
    const latestStory = {
      ...staleStory,
      karmaNodes: [{ id: 'keep' }, { id: 'delete' }],
    } as any;
    useAppStore.getState().setStories([latestStory]);
    const onUpdateStory = vi.fn();
    const { result } = renderHook(() =>
      useCodexDeletions({} as any, vi.fn(), staleStory, onUpdateStory),
    );

    act(() => result.current.handleDeleteFateNode('delete'));

    expect(onUpdateStory).toHaveBeenCalledWith({
      ...latestStory,
      karmaNodes: [{ id: 'keep' }],
    });
  });
});
