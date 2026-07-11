import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCodexLocations } from './useCodexLocations';

describe('useCodexLocations', () => {
  it('does not create an unnamed location', () => {
    const onUpdateMemory = vi.fn();
    const { result } = renderHook(() => useCodexLocations({ memory: {} as any, onUpdateMemory }));

    act(() => result.current.handleAddLocation());

    expect(onUpdateMemory).not.toHaveBeenCalled();
  });

  it('trims location fields, retains existing locations, and resets the form after saving', () => {
    const onUpdateMemory = vi.fn();
    const existing = { id: 'loc-existing', name: 'Old Gate' };
    const { result } = renderHook(() => useCodexLocations({
      memory: { locations: [existing] } as any,
      onUpdateMemory,
    }));

    act(() => result.current.setShowAddLocationForm(true));
    act(() => result.current.setNewLocation({
      name: '  Moon Archive  ', description: '  Silent stacks  ', realm: '  Upper City  ', safetyLevel: 'Dangerous',
    } as any));
    act(() => result.current.handleAddLocation());

    expect(onUpdateMemory).toHaveBeenCalledWith(expect.objectContaining({
      locations: [
        existing,
        expect.objectContaining({
          id: expect.stringMatching(/^loc-/),
          name: 'Moon Archive',
          description: 'Silent stacks',
          realm: 'Upper City',
          safetyLevel: 'Dangerous',
        }),
      ],
    }));
    expect(result.current.newLocation).toEqual({ name: '', description: '', realm: '', safetyLevel: 'Safe' });
    expect(result.current.showAddLocationForm).toBe(false);
  });
});
