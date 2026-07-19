import React, { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AudioLines,
  Check,
  ChevronDown,
  Eye,
  Music,
  Palette,
  RotateCcw,
  Sliders,
  Type,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ReaderPreferences } from '../types';
import { TRACK_LIBRARY } from '../lib/audio/musicResolver';
import { BGM_MAX_LEVEL, BGM_DEFAULT_LEVEL } from '../hooks/audio/useAtmosphericAudio';
import { getReaderTypography } from '../lib/readerTypography';

const SCORE_GROUPS = TRACK_LIBRARY.reduce<Record<string, typeof TRACK_LIBRARY>>((groups, track) => {
  const folder = track.url.split('/AUDIO/')[1]?.split('/')[0] || 'OTHER';
  (groups[folder] = groups[folder] || []).push(track);
  return groups;
}, {});

const FONT_OPTIONS = [
  { value: 'serif', label: 'Literata (Serif)' },
  { value: 'sans', label: 'Rubik (Sans)' },
  { value: 'mono', label: 'System Mono' },
] as const;

const SIZE_OPTIONS = ['xs', 'sm', 'base', 'lg', 'xl'] as const;
const THEME_OPTIONS = ['void', 'crimson', 'abyss', 'sepia', 'emerald'] as const;
const HIGHLIGHT_OPTIONS = [
  { value: 'full', label: 'Full Block' },
  { value: 'underline', label: 'Underline' },
  { value: 'tint', label: 'Soft Tint' },
] as const;

type NumericTypographyPreference =
  | 'lineHeightScale'
  | 'paragraphSpacingScale'
  | 'letterSpacing'
  | 'wordSpacing'
  | 'readingWidth';

const TYPOGRAPHY_CONTROLS: Array<{
  key: NumericTypographyPreference;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}> = [
  { key: 'lineHeightScale', label: 'Line height', min: 1.45, max: 1.9, step: 0.01, format: value => value.toFixed(2) },
  { key: 'paragraphSpacingScale', label: 'Paragraph gap', min: 0.5, max: 2.5, step: 0.05, format: value => `${value.toFixed(2)}em` },
  { key: 'letterSpacing', label: 'Letter spacing', min: -0.03, max: 0.08, step: 0.005, format: value => `${value.toFixed(3)}em` },
  { key: 'wordSpacing', label: 'Word spacing', min: -0.04, max: 0.08, step: 0.005, format: value => `${value.toFixed(3)}em` },
  { key: 'readingWidth', label: 'Reading width', min: 44, max: 76, step: 1, format: value => `${value}ch` },
];

const formatTrackName = (id: string) =>
  id.toLowerCase().split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

const choiceClass = (active: boolean) =>
  `flex min-h-9 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-[10px] font-mono uppercase tracking-[0.12em] transition-all ${
    active
      ? 'border-portal bg-portal/10 text-portal shadow-[inset_0_0_18px_rgba(4,172,255,0.05)]'
      : 'border-neutral-800 bg-black/25 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
  }`;

const shouldExpandByDefault = () =>
  typeof window === 'undefined'
  || typeof window.matchMedia !== 'function'
  || !window.matchMedia('(max-width: 767px)').matches;

interface PreferenceGroupProps {
  label: string;
  icon: React.ReactNode;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function PreferenceGroup({ label, icon, summary, defaultOpen, children }: PreferenceGroupProps) {
  const contentId = useId();
  const [isOpen, setIsOpen] = useState(() => defaultOpen ?? shouldExpandByDefault());

  return (
    <section>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen(open => !open)}
        className="flex min-h-9 w-full items-center gap-2 rounded-md text-left text-[10px] font-sans font-medium uppercase tracking-[0.16em] text-neutral-400 transition-colors hover:text-neutral-100"
      >
        <span className="text-portal/80">{icon}</span>
        <span>{label}</span>
        {summary ? (
          <span className="ml-auto max-w-[45%] truncate font-mono text-[9px] normal-case tracking-normal text-neutral-600">
            {summary}
          </span>
        ) : <span className="ml-auto" />}
        <ChevronDown size={14} className={`shrink-0 text-neutral-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            id={contentId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2.5">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

interface TypographySliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  displayValue: string;
  onChange: (value: number) => void;
}

function TypographySlider({ label, min, max, step, value, displayValue, onChange }: TypographySliderProps) {
  return (
    <label className="grid gap-2 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-400">
      <span>{label}</span>
      <span className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={event => onChange(Number(event.target.value))}
          className="w-full min-w-0 cursor-pointer accent-portal"
        />
        <output className="text-right font-mono text-[10px] normal-case tracking-normal text-neutral-500">
          {displayValue}
        </output>
      </span>
    </label>
  );
}

interface ReaderPreferencesPanelProps {
  currentPrefs: ReaderPreferences;
  handleUpdatePreference: <K extends keyof ReaderPreferences>(key: K, value: ReaderPreferences[K]) => void;
  onResetTypography: () => void;
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
  onResetTypography,
  isMuted,
  handleMuteToggle,
  atmosphere,
  handleAtmosphereChange,
  volume,
  handleVolumeChange,
  showLegend,
  onToggleLegend,
}) => {
  const typography = getReaderTypography(currentPrefs);
  const [showTypographySettings, setShowTypographySettings] = useState(shouldExpandByDefault);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('seihouse-bgm-volume') : null;
    const parsed = saved ? parseFloat(saved) : NaN;
    return Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, BGM_MAX_LEVEL)) : BGM_DEFAULT_LEVEL;
  });
  const [bgmTrackId, setBgmTrackId] = useState(() =>
    (typeof localStorage !== 'undefined' && localStorage.getItem('seihouse-bgm-track')) || 'auto',
  );

  useEffect(() => {
    const handleState = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail) return;
      if (typeof detail.bgmVolume === 'number') setBgmVolume(detail.bgmVolume);
      if (typeof detail.bgmTrackId === 'string') setBgmTrackId(detail.bgmTrackId);
    };
    window.addEventListener('seihouse-audio-state', handleState);
    return () => window.removeEventListener('seihouse-audio-state', handleState);
  }, []);

  const handleBgmVolumeChange = (value: number) => {
    setBgmVolume(value);
    window.dispatchEvent(new CustomEvent('seihouse-audio-control', { detail: { bgmVolume: value } }));
  };

  const handleBgmTrackChange = (id: string) => {
    setBgmTrackId(id);
    window.dispatchEvent(new CustomEvent('seihouse-audio-control', { detail: { bgmTrackId: id } }));
  };

  const handleTypographyChange = (key: NumericTypographyPreference, value: number) => {
    handleUpdatePreference(key, value);
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="relative overflow-hidden border-b border-neutral-800 bg-[#050709]/95 px-4 py-5 sm:px-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(4,172,255,0.06),transparent_38%)]" />
      <div className="relative mx-auto max-w-[1480px] space-y-4">
        <div className="flex items-center gap-3 border-b border-neutral-800/80 pb-4">
          <Sliders size={18} className="text-portal" />
          <h3 className="font-sans text-sm font-medium uppercase tracking-[0.2em] text-neutral-100 sm:text-base">
            Reader Chamber Controls
          </h3>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(190px,0.8fr)_minmax(190px,0.8fr)_minmax(0,2.6fr)]">
          <section className="space-y-6 rounded-xl border border-neutral-800 bg-[#070a0d]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
            <PreferenceGroup
              label="Aura Font"
              icon={<Type size={13} />}
              summary={FONT_OPTIONS.find(option => option.value === currentPrefs.fontFamily)?.label}
            >
              <div className="grid gap-1.5">
                {FONT_OPTIONS.map(option => (
                  <button key={option.value} type="button" onClick={() => handleUpdatePreference('fontFamily', option.value)} className={choiceClass(currentPrefs.fontFamily === option.value)}>
                    <span>{option.label}</span>
                    {currentPrefs.fontFamily === option.value ? <Check size={12} /> : null}
                  </button>
                ))}
              </div>
            </PreferenceGroup>

            <PreferenceGroup label="Atmospheric Hue" icon={<Palette size={13} />} summary={currentPrefs.themeOverride || 'void'}>
              <div className="grid gap-1.5">
                {THEME_OPTIONS.map(theme => (
                  <button key={theme} type="button" onClick={() => handleUpdatePreference('themeOverride', theme)} className={choiceClass((currentPrefs.themeOverride || 'void') === theme)}>
                    <span>{theme}</span>
                    {(currentPrefs.themeOverride || 'void') === theme ? <Check size={12} /> : null}
                  </button>
                ))}
              </div>
            </PreferenceGroup>
          </section>

          <section className="space-y-6 rounded-xl border border-neutral-800 bg-[#070a0d]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
            <PreferenceGroup label="Visual Scale" icon={<Sliders size={13} />} summary={currentPrefs.fontSize.toUpperCase()}>
              <div className="grid gap-1.5">
                {SIZE_OPTIONS.map(size => (
                  <button key={size} type="button" onClick={() => handleUpdatePreference('fontSize', size)} className={choiceClass(currentPrefs.fontSize === size)}>
                    <span>{size}</span>
                    {currentPrefs.fontSize === size ? <Check size={12} /> : null}
                  </button>
                ))}
              </div>
            </PreferenceGroup>

            <PreferenceGroup
              label="Visual Highlights"
              icon={<Eye size={13} />}
              summary={HIGHLIGHT_OPTIONS.find(option => option.value === (currentPrefs.highlightStyle || 'full'))?.label}
            >
              <div className="grid gap-1.5">
                {HIGHLIGHT_OPTIONS.map(option => (
                  <button key={option.value} type="button" onClick={() => handleUpdatePreference('highlightStyle', option.value)} className={choiceClass((currentPrefs.highlightStyle || 'full') === option.value)}>
                    <span>{option.label}</span>
                    {(currentPrefs.highlightStyle || 'full') === option.value ? <Check size={12} /> : null}
                  </button>
                ))}
              </div>
            </PreferenceGroup>

            {onToggleLegend ? (
              <button type="button" onClick={onToggleLegend} className={choiceClass(Boolean(showLegend))}>
                <span>System Color Legend</span>
                <span>{showLegend ? 'On' : 'Off'}</span>
              </button>
            ) : null}
          </section>

          <section className="rounded-xl border border-neutral-700/80 bg-[#070a0d]/85 p-5 shadow-[0_12px_50px_rgba(0,0,0,0.24)] sm:p-6">
            <div className={`flex items-center justify-between gap-4 ${showTypographySettings ? 'mb-7' : ''}`}>
              <button
                type="button"
                aria-expanded={showTypographySettings}
                aria-controls="reader-typography-settings"
                onClick={() => setShowTypographySettings(open => !open)}
                className="flex min-h-9 min-w-0 flex-1 items-center gap-2.5 text-left text-portal"
              >
                <Eye size={16} />
                <h4 className="font-sans text-[11px] font-semibold uppercase tracking-[0.17em]">Visual &amp; Text Settings</h4>
                <span className="ml-auto hidden truncate font-mono text-[9px] normal-case tracking-normal text-neutral-600 sm:block">
                  {typography.lineHeightScale.toFixed(2)} line · {typography.readingWidth}ch
                </span>
                <ChevronDown size={15} className={`shrink-0 text-neutral-600 transition-transform ${showTypographySettings ? 'rotate-180' : ''}`} />
              </button>
              <button type="button" onClick={onResetTypography} className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-[9px] font-mono uppercase tracking-[0.12em] text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-100">
                <RotateCcw size={12} />
                Reset Text
              </button>
            </div>

            <AnimatePresence initial={false}>
              {showTypographySettings ? (
                <motion.div
                  id="reader-typography-settings"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
                    {TYPOGRAPHY_CONTROLS.map(control => {
                      const value = typography[control.key];
                      return (
                        <TypographySlider
                          key={control.key}
                          label={control.label}
                          min={control.min}
                          max={control.max}
                          step={control.step}
                          value={value}
                          displayValue={control.format(value)}
                          onChange={nextValue => handleTypographyChange(control.key, nextValue)}
                        />
                      );
                    })}

                    <div className="grid gap-2 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-400">
                      <span>Text alignment</span>
                      <div className="grid max-w-xs grid-cols-2 gap-2">
                        {(['start', 'justify'] as const).map(alignment => (
                          <button key={alignment} type="button" onClick={() => handleUpdatePreference('textAlignment', alignment)} className={choiceClass(typography.textAlignment === alignment)}>
                            <span>{alignment}</span>
                            {typography.textAlignment === alignment ? <Check size={12} /> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border border-neutral-800 bg-[#070a0d]/80">
          <button
            type="button"
            aria-expanded={showAudioSettings}
            aria-controls="reader-audio-settings"
            onClick={() => setShowAudioSettings(open => !open)}
            className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.02] sm:px-5"
          >
            <AudioLines size={17} className="shrink-0 text-portal" />
            <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.17em] text-portal">Audio &amp; Atmosphere</span>
            <span className="ml-auto hidden truncate font-mono text-[9px] uppercase tracking-[0.1em] text-neutral-500 sm:block">
              {isMuted ? 'Muted' : `Sound active · ${atmosphere === 'none' ? 'Silence' : atmosphere} · ${bgmTrackId === 'auto' ? 'Auto score' : 'Pinned score'}`}
            </span>
            <ChevronDown size={16} className={`shrink-0 text-neutral-500 transition-transform ${showAudioSettings ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence initial={false}>
            {showAudioSettings ? (
              <motion.div
                id="reader-audio-settings"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid gap-4 border-t border-neutral-800 p-4 sm:p-5 lg:grid-cols-2">
                  <div className="rounded-lg border border-neutral-800 bg-black/20 p-4">
                    <PreferenceGroup
                      label="Atmospheric Synthesis"
                      icon={<Sliders size={15} />}
                      summary={isMuted ? 'Muted' : `${Math.round(volume * 100)}% · ${atmosphere === 'none' ? 'Silence' : atmosphere}`}
                    >
                      <p className="mb-4 text-[10px] leading-relaxed text-neutral-500">Generative soundscapes that follow the chapter mood.</p>
                      <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(150px,0.8fr)] sm:items-end">
                        <button type="button" onClick={() => handleMuteToggle(!isMuted)} className={`flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-[10px] font-mono font-semibold uppercase tracking-[0.12em] transition-all ${isMuted ? 'border-red-900/50 bg-red-950/20 text-red-400' : 'border-portal bg-portal/10 text-portal'}`}>
                          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          {isMuted ? 'Muted' : 'Sound Active'}
                        </button>
                        <label className="grid gap-1.5 text-[9px] font-sans uppercase tracking-[0.13em] text-neutral-500">
                          Ambience
                          <select value={atmosphere} disabled={isMuted} onChange={event => handleAtmosphereChange(event.target.value)} className="min-h-10 rounded-md border border-neutral-800 bg-black/40 px-3 font-mono text-[10px] normal-case tracking-normal text-neutral-300 focus:border-portal focus:outline-none disabled:opacity-40">
                            <option value="none">Silence</option>
                            <option value="wind">Howling Wind</option>
                            <option value="rain">Heavy Rain</option>
                            <option value="ocean">Ocean Waves</option>
                          </select>
                        </label>
                        <label className="grid gap-1.5 text-[9px] font-sans uppercase tracking-[0.13em] text-neutral-500">
                          Volume · {isMuted ? '0' : Math.round(volume * 100)}%
                          <input type="range" min="0.1" max="1" step="0.05" value={volume} disabled={isMuted} aria-label="Atmosphere volume" onChange={event => handleVolumeChange(Number(event.target.value))} className="min-h-10 w-full cursor-pointer accent-portal disabled:opacity-40" />
                        </label>
                      </div>
                    </PreferenceGroup>
                  </div>

                  <div className="rounded-lg border border-neutral-800 bg-black/20 p-4">
                    <PreferenceGroup
                      label="Scene Score"
                      icon={<Music size={15} />}
                      summary={`${isMuted ? 0 : Math.round(bgmVolume * 100)}% · ${bgmTrackId === 'auto' ? 'Auto' : 'Pinned'}`}
                    >
                      <p className="mb-4 text-[10px] leading-relaxed text-neutral-500">Automatically follows the narrative, or pins a track for this session.</p>
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(150px,0.75fr)] sm:items-end">
                        <label className="grid gap-1.5 text-[9px] font-sans uppercase tracking-[0.13em] text-neutral-500">
                          Score
                          <select value={bgmTrackId} disabled={isMuted} aria-label="Scene score track" onChange={event => handleBgmTrackChange(event.target.value)} className="min-h-10 rounded-md border border-neutral-800 bg-black/40 px-3 font-mono text-[10px] normal-case tracking-normal text-neutral-300 focus:border-portal focus:outline-none disabled:opacity-40">
                            <option value="auto">Auto (Scene-Based)</option>
                            {Object.entries(SCORE_GROUPS).map(([group, tracks]) => (
                              <optgroup key={group} label={group.charAt(0) + group.slice(1).toLowerCase()}>
                                {tracks.map(track => <option key={track.id} value={track.id}>{formatTrackName(track.id)}</option>)}
                              </optgroup>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1.5 text-[9px] font-sans uppercase tracking-[0.13em] text-neutral-500">
                          Music · {isMuted ? '0' : Math.round(bgmVolume * 100)}%
                          <input type="range" min="0" max={BGM_MAX_LEVEL} step="0.01" value={bgmVolume} disabled={isMuted} aria-label="Music volume" onChange={event => handleBgmVolumeChange(Number(event.target.value))} className="min-h-10 w-full cursor-pointer accent-portal disabled:opacity-40" />
                        </label>
                      </div>
                    </PreferenceGroup>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
      </div>
    </motion.div>
  );
};
