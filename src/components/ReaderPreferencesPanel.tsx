import React from 'react';
import { motion } from 'motion/react';
import { Check, Sliders, VolumeX, Volume2 } from 'lucide-react';
import { ReaderPreferences } from '../types';

interface ReaderPreferencesPanelProps {
  currentPrefs: ReaderPreferences;
  handleUpdatePreference: <K extends keyof ReaderPreferences>(key: K, value: ReaderPreferences[K]) => void;
  isMuted: boolean;
  handleMuteToggle: (muted: boolean) => void;
  atmosphere: string;
  handleAtmosphereChange: (val: string) => void;
  volume: number;
  handleVolumeChange: (vol: number) => void;
  showLegend?: boolean;
  onToggleLegend?: () => void;
}

export const ReaderPreferencesPanel: React.FC<ReaderPreferencesPanelProps> = ({
  currentPrefs,
  handleUpdatePreference,
  isMuted,
  handleMuteToggle,
  atmosphere,
  handleAtmosphereChange,
  volume,
  handleVolumeChange,
  showLegend,
  onToggleLegend
}) => {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-neutral-950 border-b border-neutral-900 overflow-hidden px-4 py-4 space-y-4"
    >
      <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="space-y-1">
          <span className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">
            Aura Font
          </span>
          <div className="flex flex-col gap-1">
            {(["serif", "sans", "mono"] as const).map((f) => (
              <button
                key={f}
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleUpdatePreference("fontFamily", f)}
                className={`px-2 py-1 text-[10px] rounded border text-left flex items-center justify-between transition-all capitalize ${
                  currentPrefs.fontFamily === f
                    ? "bg-portal/10 border-portal text-portal font-bold"
                    : "bg-void border-neutral-800 text-neutral-400 hover:border-neutral-700"
                }`}
              >
                <span>
                  {f === "serif"
                    ? "Literata (Serif)"
                    : f === "sans"
                      ? "Rubik (Sans)"
                      : "System Mono"}
                </span>
                {currentPrefs.fontFamily === f && <Check size={8} />}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">
            Sizing Index
          </span>
          <div className="flex flex-col gap-1">
            {(["xs", "sm", "base", "lg", "xl"] as const).map((s) => (
              <button
                key={s}
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleUpdatePreference("fontSize", s)}
                className={`px-2 py-1 text-[10px] rounded border text-left flex items-center justify-between transition-all uppercase ${
                  currentPrefs.fontSize === s
                    ? "bg-portal/10 border-portal text-portal font-bold"
                    : "bg-void border-neutral-800 text-neutral-400 hover:border-neutral-700"
                }`}
              >
                <span>{s}</span>
                {currentPrefs.fontSize === s && <Check size={8} />}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">
            Line Spacing
          </span>
          <div className="flex flex-col gap-1">
            {(["snug", "normal", "relaxed", "loose"] as const).map(
              (l) => (
                <button
                  key={l}
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleUpdatePreference("lineHeight", l)}
                  className={`px-2 py-1 text-[10px] rounded border text-left flex items-center justify-between transition-all capitalize ${
                    currentPrefs.lineHeight === l
                      ? "bg-portal/10 border-portal text-portal font-bold"
                      : "bg-void border-neutral-800 text-neutral-400 hover:border-neutral-700"
                  }`}
                >
                  <span>{l}</span>
                  {currentPrefs.lineHeight === l && <Check size={8} />}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">
            Break Spacing
          </span>
          <div className="flex flex-col gap-1">
            {(["normal", "wide", "double"] as const).map((p) => (
              <button
                key={p}
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() =>
                  handleUpdatePreference("paragraphSpacing", p)
                }
                className={`px-2 py-1 text-[10px] rounded border text-left flex items-center justify-between transition-all capitalize ${
                  currentPrefs.paragraphSpacing === p
                    ? "bg-portal/10 border-portal text-portal font-bold"
                    : "bg-void border-neutral-800 text-neutral-400 hover:border-neutral-700"
                }`}
              >
                <span>{p}</span>
                {currentPrefs.paragraphSpacing === p && (
                  <Check size={8} />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">
            Ethereal Hue
          </span>
          <div className="flex flex-col gap-1">
            {(
              ["void", "crimson", "abyss", "sepia", "emerald"] as const
            ).map((t) => (
              <button
                key={t}
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleUpdatePreference("themeOverride", t)}
                className={`px-2 py-1 text-[10px] rounded border text-left flex items-center justify-between transition-all capitalize ${
                  currentPrefs.themeOverride === t
                    ? "bg-portal/10 border-portal text-portal font-bold"
                    : "bg-void border-neutral-800 text-neutral-400 hover:border-neutral-700"
                }`}
              >
                <span>{t}</span>
                {currentPrefs.themeOverride === t && (
                  <Check size={8} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Atmospheric Synthesizer Controls */}
      <div className="border-t border-neutral-900/60 mt-5 pt-4 max-w-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <span className="text-[10px] font-sc text-portal uppercase tracking-wider font-bold flex items-center justify-center md:justify-start gap-1.5">
            <Sliders size={11} className="text-portal" />
            Atmospheric Synthesis
          </span>
          <p className="text-[9px] text-neutral-500 mt-0.5">
            Generates generative background elements. Soundscapes evolve
            dynamically to reflect dramatic narrative spikes.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Mute button */}
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleMuteToggle(!isMuted)}
            className={`px-3 py-1.5 text-[10px] rounded border flex items-center gap-1.5 transition-all uppercase font-sc font-bold tracking-wider ${
              isMuted
                ? "bg-red-950/20 border-red-900/40 text-red-500 hover:bg-neutral-900"
                : "bg-portal/10 border-portal text-portal hover:brightness-110"
            }`}
            title={
              isMuted ? "Unmute sound synthesis" : "Mute sound synthesis"
            }
          >
            {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
            <span>{isMuted ? "Muted" : "Sound Active"}</span>
          </button>

          {/* Atmosphere selection */}
          <div className="flex items-center gap-1.5 bg-void border border-neutral-850 px-2 py-1 rounded">
            <span className="text-[9px] font-mono text-neutral-500 uppercase">
              Ambience:
            </span>
            <select
              value={atmosphere}
              disabled={isMuted}
              onChange={(e) => handleAtmosphereChange(e.target.value)}
              className="bg-transparent text-[10px] text-neutral-300 font-mono focus:outline-none focus:text-signal cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="none" className="bg-void">
                Silence
              </option>
              <option value="wind" className="bg-void">
                Howling Wind
              </option>
              <option value="rain" className="bg-void">
                Heavy Rain
              </option>
              <option value="temple" className="bg-void">
                Temple Bells
              </option>
            </select>
          </div>

          {/* Volume slider */}
          <div className="flex items-center gap-2 bg-void border border-neutral-850 px-2 py-1 rounded">
            <span className="text-[9px] font-mono text-neutral-500 uppercase">
              Vol:
            </span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={volume}
              disabled={isMuted}
              onChange={(e) =>
                handleVolumeChange(parseFloat(e.target.value))
              }
              className="w-16 hover:cursor-grab disabled:opacity-40 disabled:cursor-not-allowed accent-portal text-portal"
            />
            <span className="text-[9px] font-mono text-neutral-400 w-7 text-right">
              {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
            </span>
          </div>
        </div>
      </div>

      {onToggleLegend && (
        <div className="border-t border-neutral-900/60 mt-4 pt-3 max-w-2xl mx-auto flex justify-end">
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={onToggleLegend}
            className={`px-3 py-1 text-[10px] rounded border flex items-center gap-1.5 transition-all uppercase font-mono tracking-wider cursor-pointer ${
              showLegend
                ? "bg-portal/10 border-portal text-portal hover:bg-portal/20"
                : "bg-void border-neutral-800 text-neutral-400 hover:text-signal hover:border-neutral-700"
            }`}
          >
            <span>✦ {showLegend ? "Hide System Colors Legend" : "Show System Colors Legend"}</span>
          </button>
        </div>
      )}
    </motion.div>
  );
};
