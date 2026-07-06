import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SYSTEM_COLORS_LEGEND } from '../lib/systemColors';

interface AetherialSystemLegendProps {
  currentPrefs: any;
  handleUpdatePreference: (key: string, value: any) => void;
  setShowLegend: (show: boolean) => void;
}

export function AetherialSystemLegend({
  currentPrefs,
  handleUpdatePreference,
  setShowLegend,
}: AetherialSystemLegendProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-8 p-3 sm:p-5 bg-[#080808]/90 border border-portal/30 rounded-lg w-full max-w-2xl mx-auto shadow-[0_0_30px_rgba(4,172,255,0.1)] relative z-10"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-portal/20 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-portal text-sm animate-pulse">✦</span>
          <h4 className="font-display font-medium text-xs sm:text-sm text-signal tracking-widest uppercase">
            Aetherial System Codes
          </h4>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={currentPrefs?.colorPaletteId || 'default'}
            onChange={(e) => handleUpdatePreference('colorPaletteId', e.target.value)}
            className="text-[9px] uppercase font-mono tracking-wider text-portal transition-colors px-2.5 py-1.5 border border-portal/30 hover:border-portal rounded-sm bg-portal/5 hover:bg-portal/15 cursor-pointer outline-none focus:ring-1 focus:ring-portal appearance-none max-w-[150px] sm:max-w-none text-ellipsis overflow-hidden whitespace-nowrap"
          >
            <option value="default" className="bg-void text-signal">Default Palette</option>
            <option value="protanopia" className="bg-void text-signal">Protanopia</option>
            <option value="deuteranopia" className="bg-void text-signal">Deuteranopia</option>
            <option value="tritanopia" className="bg-void text-signal">Tritanopia</option>
            <option value="high_contrast_dark" className="bg-void text-signal">High Contrast</option>
          </select>
          <button
            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
              localStorage.setItem("seihouse-system-legend-show", "false");
              setShowLegend(false);
            }}
            className="text-[9px] uppercase font-mono tracking-wider text-portal hover:text-signal transition-colors px-2.5 py-1.5 border border-portal/30 hover:border-portal rounded-sm bg-portal/5 hover:bg-portal/15 cursor-pointer shadow-[0_0_10px_rgba(4,172,255,0.1)] font-medium shrink-0"
          >
            Dismiss
          </button>
        </div>
      </div>
      
      <p className="text-neutral-400 text-[10px] sm:text-xs font-serif italic mb-4 leading-relaxed">
        The Heavenly System speaks through colors. The resonance of each hue carries deep narrative significance. Learn to feel the thread of your fate.
      </p>
      
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
        {SYSTEM_COLORS_LEGEND.map((m) => (
          <div
            key={m.type}
            className={`p-2 border rounded-md ${m.cssVar ? '' : `${m.bgColor} ${m.borderColor}`} flex flex-col justify-between min-h-[60px] transition-all hover:scale-[1.02]`}
            style={m.cssVar ? {
              backgroundColor: `color-mix(in srgb, var(${m.cssVar}) 15%, transparent)`,
              borderColor: `color-mix(in srgb, var(${m.cssVar}) 40%, transparent)`
            } : {}}
          >
            <span 
              className={`text-[10px] font-bold uppercase tracking-wider ${m.cssVar ? '' : m.textColor}`}
              style={m.cssVar ? { color: `var(${m.cssVar})` } : {}}
            >
              {m.name}
            </span>
            <span className="text-[9px] text-neutral-400 font-mono tracking-tight mt-1 leading-normal">
              {m.playerMeaning}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
