import React, { useMemo } from 'react';
import type { ReaderPreferences } from '../types';

const THEME_ACCENT_HEX: Record<NonNullable<ReaderPreferences['themeOverride']>, string> = {
  void: '#04ACFF',
  crimson: '#8B0000',
  abyss: '#04ACFF',
  sepia: '#8b5a2b',
  emerald: '#10B981',
};

interface ReaderVignetteOverlayProps {
  style?: ReaderPreferences['vignetteStyle'];
  theme?: ReaderPreferences['themeOverride'];
}

export function ReaderVignetteOverlay({
  style = 'off',
  theme = 'void',
}: ReaderVignetteOverlayProps) {
  return useMemo(() => {
    if (style === 'off') return null;

    if (style === 'radial') {
      return (
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle,_transparent_55%,_rgba(0,0,0,0.65)_100%)] mix-blend-multiply"
          aria-hidden="true"
          data-testid="vignette-overlay"
          data-style="radial"
        />
      );
    }

    if (style === 'cosmic') {
      const themeColor = THEME_ACCENT_HEX[theme] ?? THEME_ACCENT_HEX.void;
      return (
        <div
          className="pointer-events-none absolute inset-0 z-0 animate-[pulse_4s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{
            backgroundImage: `radial-gradient(circle, transparent 65%, ${themeColor}1f 100%)`,
            boxShadow: `inset 0 0 45px ${themeColor}1a`,
          }}
          aria-hidden="true"
          data-testid="vignette-overlay"
          data-style="cosmic"
        />
      );
    }

    return (
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
        data-testid="vignette-overlay"
        data-style="scroll"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,_rgba(25,20,15,0.15)_0%,_transparent_12%,_transparent_88%,_rgba(25,20,15,0.15)_100%)]" />
        <div className="absolute inset-2 sm:inset-4 border-2 border-double border-amber-950/15 rounded opacity-60" />
      </div>
    );
  }, [style, theme]);
}
