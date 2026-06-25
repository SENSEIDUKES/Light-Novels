import { useEffect } from 'react';
import { ReaderAccessibilitySettings } from '../types';

/**
 * Hook: useReaderAccessibility
 *
 * Centralized theme and customization layer hook.
 * Overrides layout font scales, spacing weights, and color tokens
 * via root-level CSS variables without triggering costly DOM repaints.
 * Safely cleans up rules on unmount.
 *
 * @param settings - Native friction-free accessibility configuration
 */
export function useReaderAccessibility(settings: ReaderAccessibilitySettings) {
  useEffect(() => {
    // We target documentElement to allow native CSS inheritance
    // and avoid React re-renders strictly for aesthetic overrides.
    const root = document.documentElement;

    // Apply numerical scale overrides
    root.style.setProperty('--reader-font-size-scale', settings.fontSizeRem.toString());
    root.style.setProperty('--reader-line-height-scale', settings.lineHeightScale.toString());
    root.style.setProperty('--reader-letter-spacing', `${settings.letterSpacing}em`);

    // Apply dataset flags for structured CSS selector targeting (color palettes & fonts)
    root.setAttribute('data-palette', settings.colorPaletteId);
    root.setAttribute('data-font', settings.fontFamilyId);

    // Cleanup phase: Prevents style leakage when the reader block is fully unmounted
    return () => {
      root.style.removeProperty('--reader-font-size-scale');
      root.style.removeProperty('--reader-line-height-scale');
      root.style.removeProperty('--reader-letter-spacing');
      root.removeAttribute('data-palette');
      root.removeAttribute('data-font');
    };
  }, [
    // We re-run this minimal DOM update only when a setting primitively changes
    settings.fontSizeRem,
    settings.lineHeightScale,
    settings.letterSpacing,
    settings.colorPaletteId,
    settings.fontFamilyId
  ]);
}
