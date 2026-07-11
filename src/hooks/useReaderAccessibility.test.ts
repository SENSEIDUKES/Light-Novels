import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useReaderAccessibility } from './useReaderAccessibility';

describe('useReaderAccessibility', () => {
  it('keeps root variables and palette attributes synchronized, then removes them on unmount', () => {
    const settings = {
      fontSizeRem: 1.25,
      lineHeightScale: 1.7,
      letterSpacing: 0.04,
      colorPaletteId: 'night',
      fontFamilyId: 'serif',
    } as any;
    const { rerender, unmount } = renderHook(({ current }) => useReaderAccessibility(current), {
      initialProps: { current: settings },
    });

    expect(document.documentElement.style.getPropertyValue('--reader-font-size-scale')).toBe('1.25');
    expect(document.documentElement.dataset.palette).toBe('night');
    expect(document.documentElement.dataset.font).toBe('serif');

    rerender({ current: { ...settings, fontSizeRem: 1.5, colorPaletteId: 'dawn' } });
    expect(document.documentElement.style.getPropertyValue('--reader-font-size-scale')).toBe('1.5');
    expect(document.documentElement.dataset.palette).toBe('dawn');

    unmount();
    expect(document.documentElement.style.getPropertyValue('--reader-font-size-scale')).toBe('');
    expect(document.documentElement.hasAttribute('data-palette')).toBe(false);
    expect(document.documentElement.hasAttribute('data-font')).toBe(false);
  });
});
