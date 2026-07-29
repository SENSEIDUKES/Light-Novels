import React, { useEffect, useRef, useState } from 'react';
import FocusLock from 'react-focus-lock';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { AlertCircle, X, Sliders, Award, Shield, Sparkles, Compass, Globe, Key, Zap, RefreshCw, Save } from 'lucide-react';
import { vibrate } from '../lib/vibration';
import { useAppStore } from '../store/useAppStore';
import { useStoryEngine } from '../hooks/useStoryEngine';
import { SearchableModelSelector } from './SearchableModelSelector';
import { secureStorage } from '../lib/encryption';
import { CelestialParticleShower } from './CelestialParticleShower';
import { SyncConflictModal } from './SyncConflictModal';

type RarityTheme = {
  /** Raw accent hex used for sigil strokes, auras, and glow. */
  hex: string;
  glowColor: string; textColor: string; titleColor: string;
  dotClass: string; sparkleClass: string; borderGlow: string; buttonHover: string;
};

const NEUTRAL_THEME: RarityTheme = {
  hex: '#e5e7eb',
  glowColor: 'rgba(255,255,255,0.8)',
  textColor: 'text-neutral-200',
  titleColor: 'text-neutral-200',
  dotClass: 'bg-neutral-300 shadow-[0_0_5px_rgba(255,255,255,0.8)]',
  sparkleClass: 'text-neutral-500',
  borderGlow: 'border-neutral-300/30 shadow-[0_0_20px_rgba(255,255,255,0.1)]',
  buttonHover: 'hover:border-neutral-500/80',
};

const RARITY_THEMES: Record<string, RarityTheme> = {
  Transcendent: { hex: "#22d3ee", glowColor: "rgba(34,211,238,0.7)", textColor: "text-cyan-200", titleColor: "text-cyan-100", dotClass: "bg-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.8)]", sparkleClass: "text-cyan-700/80", borderGlow: "border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]", buttonHover: "hover:border-cyan-500/60 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]" },
  Mythic: { hex: "#ef4444", glowColor: "rgba(239,68,68,0.7)", textColor: "text-red-200", titleColor: "text-red-100", dotClass: "bg-red-200 shadow-[0_0_8px_rgba(239,68,68,0.8)]", sparkleClass: "text-red-800/80", borderGlow: "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]", buttonHover: "hover:border-red-500/60 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]" },
  Legendary: { hex: "#f59e0b", glowColor: "rgba(245,158,11,0.7)", textColor: "text-amber-200", titleColor: "text-amber-100", dotClass: "bg-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.8)]", sparkleClass: "text-amber-700/60", borderGlow: "border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]", buttonHover: "hover:border-amber-500/60 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]" },
  Epic: { hex: "#a855f7", glowColor: "rgba(168,85,247,0.7)", textColor: "text-purple-200", titleColor: "text-purple-100", dotClass: "bg-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.8)]", sparkleClass: "text-purple-800/80", borderGlow: "border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]", buttonHover: "hover:border-purple-500/60 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]" },
  Rare: { hex: "#10b981", glowColor: "rgba(16,185,129,0.7)", textColor: "text-emerald-200", titleColor: "text-emerald-100", dotClass: "bg-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.8)]", sparkleClass: "text-emerald-800/80", borderGlow: "border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]", buttonHover: "hover:border-emerald-500/60 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]" },
  Common: { hex: "#9ca3af", glowColor: "rgba(156,163,175,0.55)", textColor: "text-neutral-300", titleColor: "text-neutral-200", dotClass: "bg-neutral-300 shadow-[0_0_6px_rgba(156,163,175,0.6)]", sparkleClass: "text-neutral-600", borderGlow: "border-neutral-500/30 shadow-[0_0_12px_rgba(156,163,175,0.08)]", buttonHover: "hover:border-neutral-400/50" },
};

/**
 * Per-rank atmosphere ladder. The card layout is identical for every rank;
 * only the ambient effects scale. Every flag renders as a pointer-events-none
 * overlay, and all of them are disabled under prefers-reduced-motion.
 */
type RelicRarityEffects = {
  /** Subtle colored halo behind the card. */
  halo: boolean;
  /** Soft shimmer sweeping softly across the card edge. */
  edgeShimmer: boolean;
  /** Slow pulse on the halo. */
  pulse: boolean;
  /** Number of slow-drifting motes floating around the card. */
  particles: number;
  /** Warm glow washing the space behind the full card. */
  warmGlow: boolean;
  /** Slightly brighter central seal. */
  brighterSeal: boolean;
  /** Brief one-shot flare the moment the relic is revealed. */
  revealFlare: boolean;
};

const NO_RELIC_EFFECTS: RelicRarityEffects = {
  halo: false, edgeShimmer: false, pulse: false, particles: 0,
  warmGlow: false, brighterSeal: false, revealFlare: false,
};

const RARITY_EFFECTS: Record<string, RelicRarityEffects> = {
  // Clean border, almost no particles.
  Common: { ...NO_RELIC_EFFECTS },
  // Soft edge shimmer plus a subtle colored halo.
  Rare: { ...NO_RELIC_EFFECTS, halo: true, edgeShimmer: true },
  // Slow pulse plus a few drifting particles.
  Epic: { ...NO_RELIC_EFFECTS, halo: true, pulse: true, particles: 3 },
  // Warm glow behind the full card, slightly brighter seal, brief reveal flare.
  Legendary: { ...NO_RELIC_EFFECTS, halo: true, pulse: true, particles: 5, warmGlow: true, brighterSeal: true, revealFlare: true },
  Mythic: { ...NO_RELIC_EFFECTS, halo: true, pulse: true, particles: 6, warmGlow: true, brighterSeal: true, revealFlare: true },
  Transcendent: { ...NO_RELIC_EFFECTS, halo: true, pulse: true, particles: 6, warmGlow: true, brighterSeal: true, revealFlare: true },
};

/** Deterministic drift-mote layout (no per-render randomness). */
const RELIC_DRIFT_MOTES = Array.from({ length: 6 }, (_, i) => ({
  left: `${10 + ((i * 67) % 78)}%`,
  top: `${28 + ((i * 41) % 58)}%`,
  size: 2.5 + (i % 3),
  duration: 7 + (i % 4) * 2.5,
  delay: (i * 1.7) % 8,
}));

const RELIC_SIGIL_CSS = `
  .relic-sigil-spin { transform-box: view-box; transform-origin: 120px 120px; animation: relic-sigil-rotate 90s linear infinite; }
  .relic-sigil-spin-rev { transform-box: view-box; transform-origin: 120px 120px; animation: relic-sigil-rotate-rev 60s linear infinite; }
  @keyframes relic-sigil-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes relic-sigil-rotate-rev { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
  .relic-twinkle { animation: relic-twinkle 2.8s ease-in-out infinite; }
  @keyframes relic-twinkle { 0%, 100% { opacity: 0.15; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1.15); } }
  .relic-breathe { animation: relic-breathe 4.5s ease-in-out infinite; }
  @keyframes relic-breathe { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
  .relic-halo-pulse { animation: relic-halo-pulse 5.5s ease-in-out infinite; }
  @keyframes relic-halo-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.95; } }
  .relic-shimmer-band { animation: relic-shimmer-sweep 7s ease-in-out infinite; }
  @keyframes relic-shimmer-sweep { 0% { transform: translateX(-140%) skewX(-16deg); } 55%, 100% { transform: translateX(340%) skewX(-16deg); } }
  .relic-drift { animation-name: relic-drift; animation-timing-function: linear; animation-iteration-count: infinite; }
  @keyframes relic-drift { 0% { transform: translateY(10px) scale(0.6); opacity: 0; } 15% { opacity: 0.8; } 80% { opacity: 0.45; } 100% { transform: translateY(-52px) scale(1); opacity: 0; } }
  .relic-reveal-flare { animation: relic-reveal-flare 1.2s ease-out 1 both; }
  @keyframes relic-reveal-flare { 0% { opacity: 0.85; transform: scale(0.65); } 100% { opacity: 0; transform: scale(1.4); } }
  .relic-claim-btn { transition: box-shadow 0.5s ease, filter 0.5s ease; }
  .relic-claim-btn:hover { box-shadow: 0 0 30px var(--relic-hex-glow, rgba(255,255,255,0.25)); filter: brightness(1.12); }
  .relic-claim-btn:focus-visible { outline: 2px solid var(--relic-hex-glow, rgba(255,255,255,0.4)); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) {
    .relic-sigil-spin, .relic-sigil-spin-rev, .relic-twinkle, .relic-breathe, .relic-halo-pulse, .relic-shimmer-band, .relic-drift, .relic-reveal-flare { animation: none; }
  }
`;

const RELIC_TICKS = Array.from({ length: 36 }, (_, i) => {
  const a = (i * 10 * Math.PI) / 180;
  const long = i % 9 === 0;
  const r1 = long ? 84 : 88;
  return (
    <line
      key={i}
      x1={120 + Math.cos(a) * r1}
      y1={120 + Math.sin(a) * r1}
      x2={120 + Math.cos(a) * 92}
      y2={120 + Math.sin(a) * 92}
      strokeWidth={long ? 0.8 : 0.4}
      opacity={long ? 0.7 : 0.45}
    />
  );
});

const RELIC_ICON_MAP: Array<{ keywords: string[]; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }> = [
  { keywords: ['medallion', 'badge'], Icon: Award },
  { keywords: ['seal', 'signet'], Icon: Shield },
  { keywords: ['gourd', 'nectar', 'cauldron', 'potion'], Icon: Zap },
  { keywords: ['spindle', 'thread', 'matrix'], Icon: RefreshCw },
  { keywords: ['pen', 'brush', 'scribe'], Icon: Save },
  { keywords: ['crown', 'circlet', 'tiara'], Icon: Sliders },
  { keywords: ['compass'], Icon: Compass },
  { keywords: ['mirror'], Icon: Globe },
  { keywords: ['key'], Icon: Key },
];

function getRelicIcon(relicName?: string): React.ComponentType<{ size?: number; strokeWidth?: number }> {
  const name = (relicName ?? '').toLowerCase();
  const match = RELIC_ICON_MAP.find(entry => entry.keywords.some(kw => name.includes(kw)));
  return match ? match.Icon : Compass;
}

const DEFAULT_PRESETS = {
  storyMaker: {
    gemini: ["google/gemini-3.1-flash-lite", "google/gemini-2.5-flash-lite", "google/gemini-3.1-flash-lite-preview", "gemini-3.1-flash-lite-preview", "gemini-3.5-flash", "gemini-3.5-pro", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro"],
    openrouter: [
      "@preset/light-novel-story",
      "google/gemini-3.1-flash-lite-preview",
      "google/gemini-3.5-flash",
      "google/gemini-3.1-flash-lite",
      "meta-llama/llama-3-8b-instruct:free",
      "mistralai/mistral-7b-instruct:free",
      "google/gemma-2-9b-it:free",
      "google/gemini-2.5-flash",
      "openai/gpt-3.5-turbo"
    ],
    ollama: ["llama3", "gemma2", "mistral", "phi3"]
  },
  imageGenerator: {
    gemini: ["gemini-3.1-flash-lite-image", "google/gemini-3.1-flash-lite-image", "gemini-2.5-flash-image", "google/gemini-3.1-flash-lite-image-preview", "gemini-3.1-flash-lite-image-preview", "google/gemini-3.1-flash-image", "imagen-3.0-generate-002"],
    openrouter: ["@preset/library-pictures", "google/gemini-3.1-flash-lite-image-preview", "google/gemini-3.1-flash-image", "stable-diffusion-xl", "playgroundai/playground-v2.5", "shuttle-ai/shuttle-3-diffusion"],
    ollama: ["local-sd-mortal", "local-sd-celestial"]
  }
};

export const ModalsAndToasts: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const isSettingsOpen = useAppStore(state => state.isSettingsOpen);
    const setIsSettingsOpen = useAppStore(state => state.setIsSettingsOpen);
    const routingConfig = useAppStore(state => state.routingConfig);
    const setRoutingConfig = useAppStore(state => state.setRoutingConfig);
    const localGeminiKey = useAppStore(state => state.localGeminiKey);
    const localOpenrouterKey = useAppStore(state => state.localOpenrouterKey);
    const localOllamaHost = useAppStore(state => state.localOllamaHost);
    const localDeepinfraKey = useAppStore(state => state.localDeepinfraKey);
    const storyToDelete = useAppStore(state => state.storyToDelete);
    const cancelDeleteStory = useAppStore(state => state.cancelDeleteStory);
    const confirmDeleteStory = useAppStore(state => state.confirmDeleteStory);
    const appError = useAppStore(state => state.appError);
    const setAppError = useAppStore(state => state.setAppError);
    const draftRecoverySession = useAppStore(state => state.draftRecoverySession);
    const setDraftRecoverySession = useAppStore(state => state.setDraftRecoverySession);
    const setActiveStoryId = useAppStore(state => state.setActiveStoryId);
    const setSelectedChapterNum = useAppStore(state => state.setSelectedChapterNum);
    const setCurrentScreen = useAppStore(state => state.setCurrentScreen);
    const setIsGenerating = useAppStore(state => state.setIsGenerating);
    const setGeneratingChapterNum = useAppStore(state => state.setGeneratingChapterNum);

  const storyEngine = useStoryEngine();

  const [routingPresets, setRoutingPresets] = useState<any>(null);
  const [dynamicModels, setDynamicModels] = useState<{
    storyMaker: { gemini: string[]; openrouter: string[]; ollama: string[] };
    imageGenerator: { gemini: string[]; openrouter: string[]; ollama: string[] };
  }>({
    storyMaker: { gemini: [], openrouter: [], ollama: [] },
    imageGenerator: { gemini: [], openrouter: [], ollama: [] }
  });
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({});
  const [deleteText, setDeleteText] = useState('');
  const [unlockedArtifactAlert, setUnlockedArtifactAlert] = useState<any | null>(null);
  const activeArtifactAlertRef = useRef<any | null>(null);
  const [isArtifactRevealed, setIsArtifactRevealed] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected' | 'idle'>('idle');

  useEffect(() => {
    if (!storyToDelete) {
      setDeleteText('');
    }
  }, [storyToDelete]);

  useEffect(() => {
    let revealTimer: NodeJS.Timeout;

    if (unlockedArtifactAlert) {
      if (!isArtifactRevealed) {
        revealTimer = setTimeout(() => {
          vibrate('heavyTap');
          setIsArtifactRevealed(true);
        }, 3000);
      }
    }

    return () => {
      clearTimeout(revealTimer);
    };
  }, [unlockedArtifactAlert, isArtifactRevealed]);

  const dismissArtifactAlert = () => {
    activeArtifactAlertRef.current = null;
    setUnlockedArtifactAlert(null);
  };

  // Handle live artifact unlock events with Reader timing awareness
  useEffect(() => {
    const handleArtifactUnlocked = (e: Event) => {
      const customEvent = e as CustomEvent;
      const artifact = customEvent.detail?.artifact;
      if (!artifact) return;

      const state = useAppStore.getState();
      const isReader = state.currentScreen === 'reader';
      const allowedInReader = state.canShowRelicInReader;

      if (activeArtifactAlertRef.current || (isReader && !allowedInReader)) {
        state.enqueueRelicReveal(artifact);
      } else {
        activeArtifactAlertRef.current = artifact;
        setIsArtifactRevealed(false);
        setUnlockedArtifactAlert(artifact);
        vibrate('success');
      }
    };

    window.addEventListener('seihouse-artifact-unlocked', handleArtifactUnlocked);
    return () => {
      window.removeEventListener('seihouse-artifact-unlocked', handleArtifactUnlocked);
    };
  }, []);

  // Flush pending relic queue when unlockedArtifactAlert is cleared and reader allows reveal
  const currentScreen = useAppStore(state => state.currentScreen);
  const canShowRelicInReader = useAppStore(state => state.canShowRelicInReader);
  const popPendingRelic = useAppStore(state => state.popPendingRelic);
  const pendingRelicCount = useAppStore(state => state.pendingRelicQueue.length);

  useEffect(() => {
    if (!activeArtifactAlertRef.current && pendingRelicCount > 0) {
      const isReader = currentScreen === 'reader';
      if (!isReader || canShowRelicInReader) {
        const nextArtifact = popPendingRelic();
        if (nextArtifact) {
          activeArtifactAlertRef.current = nextArtifact;
          setIsArtifactRevealed(false);
          setUnlockedArtifactAlert(nextArtifact);
          vibrate('success');
        }
      }
    }
  }, [unlockedArtifactAlert, currentScreen, canShowRelicInReader, popPendingRelic, pendingRelicCount]);

  useEffect(() => {
    fetch('/api/router-presets')
      .then(res => res.json())
      .then(data => setRoutingPresets(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.message) {
        setAppError(customEvent.detail.message);
      }
    };
    window.addEventListener('seihouse-toast', handleToast);
    return () => {
      window.removeEventListener('seihouse-toast', handleToast);
    };
  }, [setAppError]);

  const checkOllamaConnection = async (hostUrl: string) => {
    if (!hostUrl) {
      setOllamaStatus('idle');
      return;
    }
    setOllamaStatus('checking');
    try {
      // Direct client-side fetch from user's machine (always works if they are on localhost)
      const res = await fetch(`${hostUrl}/api/tags`);
      if (res.ok) {
        const data = await res.json();
        setOllamaStatus('connected');
        if (data && Array.isArray(data.models)) {
          const names = data.models.map((m: any) => m.name);
          setDynamicModels(prev => ({
            ...prev,
            storyMaker: { ...prev.storyMaker, ollama: names },
            imageGenerator: { ...prev.imageGenerator, ollama: names }
          }));
        }
        return;
      }
    } catch (e) {
      console.warn("Direct client-side Ollama tag fetch failed, trying server-side proxy...", e);
    }

    // Try server-side check if direct client fetch fails
    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'ollama', host: hostUrl })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error && Array.isArray(data.models)) {
          setOllamaStatus('connected');
          setDynamicModels(prev => ({
            ...prev,
            storyMaker: { ...prev.storyMaker, ollama: data.models },
            imageGenerator: { ...prev.imageGenerator, ollama: data.models }
          }));
          return;
        }
      }
    } catch (err) {
      console.error("Server-side Ollama connection proxy failed:", err);
    }
    setOllamaStatus('disconnected');
  };

  const fetchDynamicModels = async (route: 'storyMaker' | 'imageGenerator', provider: 'gemini' | 'openrouter' | 'ollama') => {
    const key = `${route}-${provider}`;
    setLoadingModels(prev => ({ ...prev, [key]: true }));
    try {
      let models: string[] = [];
      let success = false;

      const currentOllamaHost = useAppStore.getState().localOllamaHost || localOllamaHost;

      if (provider === 'ollama') {
        const hostUrl = currentOllamaHost || 'http://localhost:11434';
        try {
          const clientRes = await fetch(`${hostUrl}/api/tags`);
          if (clientRes.ok) {
            const data = await clientRes.json();
            if (data && Array.isArray(data.models)) {
              models = data.models.map((m: any) => m.name);
              success = true;
            }
          }
        } catch (clientErr) {
          console.warn("Direct client-side Ollama model fetch failed, trying server-side proxy...", clientErr);
        }
      }

      if (!success) {
        let reqKey = '';
        if (provider === 'gemini') {
          reqKey = useAppStore.getState().localGeminiKey || localGeminiKey;
        } else if (provider === 'openrouter') {
          reqKey = useAppStore.getState().localOpenrouterKey || localOpenrouterKey;
        }
        
        const res = await fetch('/api/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider,
            host: provider === 'ollama' ? (currentOllamaHost || undefined) : undefined,
            key: reqKey || undefined
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.models)) {
            models = data.models;
            success = true;
          }
        }
      }

      if (success && models.length > 0) {
        setDynamicModels(prev => ({
          ...prev,
          [route]: {
            ...prev[route],
            [provider]: models
          }
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch dynamic models for ${route}/${provider}:`, err);
    } finally {
      setLoadingModels(prev => ({ ...prev, [key]: false }));
    }
  };

  // Load keys from secure storage on mount and configure initial connection checks
  useEffect(() => {
    const loadKeys = async () => {
      const gKey = await secureStorage.getItem('@seihouse/api-key-gemini') || '';
      const orKey = await secureStorage.getItem('@seihouse/api-key-openrouter') || '';
      const ollHost = await secureStorage.getItem('@seihouse/api-key-ollama-host') || '';
      const diKey = await secureStorage.getItem('@seihouse/api-key-deepinfra') || '';

      useAppStore.setState({
        localGeminiKey: gKey,
        localOpenrouterKey: orKey,
        localOllamaHost: ollHost,
        localDeepinfraKey: diKey
      });

      if (ollHost) {
        checkOllamaConnection(ollHost);
      }

      fetchDynamicModels('storyMaker', routingConfig.storyMaker.provider as any);
      fetchDynamicModels('imageGenerator', routingConfig.imageGenerator.provider as any);
    };

    loadKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatically watch localOllamaHost and run a debounced check to verify connection
  useEffect(() => {
    if (localOllamaHost) {
      const timer = setTimeout(() => {
        checkOllamaConnection(localOllamaHost);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setOllamaStatus('idle');
    }
  }, [localOllamaHost]);

  const handleUpdateProvider = (route: 'storyMaker' | 'imageGenerator', provider: 'gemini' | 'openrouter' | 'ollama') => {
    const presets = routingPresets || DEFAULT_PRESETS;
    const availableModels = presets[route][provider] || [];
    const model = availableModels[0] || '';
    setRoutingConfig({
      ...routingConfig,
      [route]: { provider, model }
    });
    fetchDynamicModels(route, provider);
  };

  const handleUpdateModel = (route: 'storyMaker' | 'imageGenerator', model: string) => {
    setRoutingConfig({
      ...routingConfig,
      [route]: { ...routingConfig[route], model }
    });
  };

  return (
    <>
      <AnimatePresence>
        {isSettingsOpen && (
          <FocusLock>
            <motion.div
              key="settings-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsSettingsOpen(false)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsSettingsOpen(false); } }}
              aria-label="Close Settings"
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="relative bg-[#050505] border border-neutral-900 rounded-xl shadow-2xl max-w-md w-full p-6 text-center z-10 font-sans max-h-[90dvh] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-neutral-800"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-human via-portal to-gold-accent opacity-50 rounded-t-xl"></div>
              
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-full text-neutral-400">
                  <Sliders size={24} />
                </div>
              </div>

              <h2 className="font-display font-bold text-2xl text-signal mb-1 tracking-wider uppercase">Aether Router</h2>
              <p className="text-xs text-neutral-500 font-mono mb-6 uppercase tracking-widest">Model Configurator</p>

              <div className="space-y-5">
                {/* ROUTE 1: STORY MAKER */}
                <div className="space-y-2.5 bg-black/40 border border-neutral-900/60 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-sc text-[11px] tracking-[0.1em] text-portal font-semibold block uppercase">Route: Story Maker</span>
                    <span className="text-[9px] font-mono text-neutral-500 uppercase">Chapters / Codex</span>
                  </div>

                  <div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['gemini', 'openrouter', 'ollama'] as const).map((prov) => (
                        <button
                          key={prov}
                          type="button"
                           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleUpdateProvider('storyMaker', prov)}
                          className={`py-1 text-[9px] font-bold uppercase font-sc tracking-wider border rounded transition-all ${
                            routingConfig.storyMaker.provider === prov
                              ? 'bg-portal/10 border-portal text-portal'
                              : 'bg-void border-neutral-900 text-neutral-550 hover:border-neutral-800'
                          }`}
                        >
                          {prov === 'gemini' ? 'Gemini' : prov === 'openrouter' ? 'OpenRouter' : 'Ollama'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <SearchableModelSelector
                    label="Story Maker Model Selection"
                    value={routingConfig.storyMaker.model}
                    onChange={(val) => handleUpdateModel('storyMaker', val)}
                    provider={routingConfig.storyMaker.provider as any}
                    route="storyMaker"
                    presets={(routingPresets || DEFAULT_PRESETS).storyMaker[routingConfig.storyMaker.provider] || []}
                    dynamicModelsList={dynamicModels.storyMaker[routingConfig.storyMaker.provider as any] || []}
                    isLoading={!!loadingModels[`storyMaker-${routingConfig.storyMaker.provider}`]}
                    onRefresh={() => fetchDynamicModels('storyMaker', routingConfig.storyMaker.provider as any)}
                    accentColorClass="portal"
                  />
                </div>

                {/* ROUTE 2: IMAGE GENERATOR */}
                <div className="space-y-2.5 bg-black/40 border border-neutral-900/60 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-sc text-[11px] tracking-[0.1em] text-human font-semibold block uppercase">Route: Image Generator</span>
                    <span className="text-[9px] font-mono text-neutral-500 uppercase">Illustration / covers</span>
                  </div>

                  <div>
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      {(['gemini', 'openrouter', 'ollama'] as const).map((prov) => (
                        <button
                          key={prov}
                          type="button"
                           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleUpdateProvider('imageGenerator', prov)}
                          className={`py-1.5 px-0.5 text-[9px] font-bold uppercase font-sc tracking-wider border rounded transition-all leading-tight ${
                            routingConfig.imageGenerator.provider === prov
                              ? 'bg-human/10 border-human text-human'
                              : 'bg-void border-neutral-900 text-neutral-550 hover:border-neutral-800'
                          }`}
                        >
                          {prov === 'gemini' 
                            ? 'Gemini' 
                            : prov === 'openrouter' 
                              ? 'OpenRouter' 
                              : 'Free Placeholder'}
                        </button>
                      ))}
                    </div>
                    {routingConfig.imageGenerator.provider !== 'gemini' && (
                      <p className="text-[10px] font-mono text-neutral-500 italic mt-1 px-1 text-center leading-normal">
                        {routingConfig.imageGenerator.provider === 'openrouter' ? (
                          <>
                            ★ <span className="text-human font-bold font-sans">OpenRouter</span> supports high-quality visual generation (using SD, Flux, or presets like <span className="text-portal font-semibold">@preset/library-pictures</span>).
                          </>
                        ) : (
                          <>
                            ★ Standard <span className="text-human font-bold font-sans">Ollama</span> handles text-only; image requests default to our <span className="text-human font-bold font-sans">Free Visual Placeholder</span>.
                          </>
                        )}
                      </p>
                    )}
                  </div>

                  <SearchableModelSelector
                    label="Image Generator Model Selection"
                    value={routingConfig.imageGenerator.model}
                    onChange={(val) => handleUpdateModel('imageGenerator', val)}
                    provider={routingConfig.imageGenerator.provider as any}
                    route="imageGenerator"
                    presets={(routingPresets || DEFAULT_PRESETS).imageGenerator[routingConfig.imageGenerator.provider] || []}
                    dynamicModelsList={dynamicModels.imageGenerator[routingConfig.imageGenerator.provider as any] || []}
                    isLoading={!!loadingModels[`imageGenerator-${routingConfig.imageGenerator.provider}`]}
                    onRefresh={() => fetchDynamicModels('imageGenerator', routingConfig.imageGenerator.provider as any)}
                    accentColorClass="human"
                  />
                </div>

                <div className="space-y-4 bg-black/40 border border-neutral-900/60 p-3 rounded text-left">
                  <div className="flex items-center justify-between border-b border-neutral-900/80 pb-2">
                    <span className="font-sc text-[11px] tracking-[0.12em] text-portal font-bold uppercase">Dynamic Aether Credentials</span>
                    <span className="text-[8px] font-mono text-neutral-500 uppercase">Input override</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label htmlFor="gemini-key-override" className="text-[10px] font-mono text-neutral-400">Gemini Key Override</label>
                      </div>
                      <input
                        id="gemini-key-override"
                        type="password"
                        placeholder="Paste your Gemini AI key..."
                        value={localGeminiKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          useAppStore.setState({ localGeminiKey: val });
                          secureStorage.setItem('@seihouse/api-key-gemini', val);
                        }}
                        className="w-full bg-void text-xs text-neutral-300 border border-neutral-900 focus:border-portal p-1.5 rounded focus:outline-none font-mono placeholder:text-neutral-700"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label htmlFor="openrouter-key-override" className="text-[10px] font-mono text-neutral-400">OpenRouter Key Override</label>
                      </div>
                      <input
                        id="openrouter-key-override"
                        type="password"
                        placeholder="Paste your OpenRouter key..."
                        value={localOpenrouterKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          useAppStore.setState({ localOpenrouterKey: val });
                          secureStorage.setItem('@seihouse/api-key-openrouter', val);
                        }}
                        className="w-full bg-void text-xs text-neutral-300 border border-neutral-900 focus:border-portal p-1.5 rounded focus:outline-none font-mono placeholder:text-neutral-700"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label htmlFor="ollama-host-override" className="text-[10px] font-mono text-neutral-400">Ollama Host Override</label>
                        {ollamaStatus === 'checking' && <span className="text-[8px] font-mono text-amber-500 animate-pulse">● TESTING</span>}
                        {ollamaStatus === 'connected' && <span className="text-[8px] font-mono text-emerald-500 font-bold">● CONNECTED</span>}
                        {ollamaStatus === 'disconnected' && <span className="text-[8px] font-mono text-rose-500 font-bold">● DISCONNECTED</span>}
                        {ollamaStatus === 'idle' && <span className="text-[8px] font-mono text-neutral-600">● NOT CONFIGURED</span>}
                      </div>
                      <input
                        id="ollama-host-override"
                        type="text"
                        placeholder="e.g. http://localhost:11434"
                        value={localOllamaHost}
                        onChange={(e) => {
                          const val = e.target.value;
                          useAppStore.setState({ localOllamaHost: val });
                          secureStorage.setItem('@seihouse/api-key-ollama-host', val);
                          if (val) {
                            setOllamaStatus('checking');
                          } else {
                            setOllamaStatus('idle');
                          }
                        }}
                        className="w-full bg-void text-xs text-neutral-300 border border-neutral-900 focus:border-portal p-1.5 rounded focus:outline-none font-mono placeholder:text-neutral-700"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label htmlFor="deepinfra-key-override" className="text-[10px] font-mono text-neutral-400">DeepInfra Key Override (Kokoro TTS)</label>
                      </div>
                      <input
                        id="deepinfra-key-override"
                        type="password"
                        placeholder="Paste your DeepInfra API key..."
                        value={localDeepinfraKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          useAppStore.setState({ localDeepinfraKey: val });
                          secureStorage.setItem('@seihouse/api-key-deepinfra', val);
                        }}
                        className="w-full bg-void text-xs text-neutral-300 border border-neutral-900 focus:border-portal p-1.5 rounded focus:outline-none font-mono placeholder:text-neutral-700"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setIsSettingsOpen(false)}
                  className="w-full py-2 bg-void border border-portal text-portal font-sc font-bold uppercase tracking-wider rounded hover:bg-portal hover:text-void transition-all text-xs"
                >
                  Align Router Meridian
                </button>
              </div>
            </motion.div>
          </motion.div>
          </FocusLock>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {storyToDelete && (
          <FocusLock>
            <motion.div
              key="delete-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-red-900/50 rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl relative"
            >
              <h3 className="text-xl font-display font-bold text-signal mb-2">Delete story?</h3>
              <p className="text-sm text-neutral-400 mb-4 font-serif">
                This will forever sever karma. Are you true in your intent?
              </p>
              
              <div className="mb-6">
                <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono block mb-2" htmlFor="delete-story-input">
                  Type <span className="text-red-400 font-bold">DELETE</span> to confirm{' '}
                  <button
                    type="button"
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                      vibrate('softTap');
                      setDeleteText('DELETE');
                    }}
                    className="ml-2 inline-flex items-center px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-sc font-bold border border-portal/30 bg-portal/10 text-portal hover:bg-portal hover:text-black rounded transition-all duration-300 cursor-pointer"
                    title="Auto-fill delete text"
                  >
                    Auto-Fill
                  </button>
                </label>
                <input
                  type="text"
                  id="delete-story-input"
                  placeholder="DELETE"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  className="w-full bg-void text-xs text-signal border border-neutral-700 focus:border-red-500 p-2 rounded focus:outline-none font-mono placeholder:text-neutral-700"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={cancelDeleteStory}
                  className="px-4 py-2 bg-void border border-neutral-700 text-neutral-300 rounded font-sc text-xs hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="confirm-burn-scroll"
                  disabled={deleteText !== 'DELETE'}
                  onClick={() => {
                    if (deleteText === 'DELETE') {
                      confirmDeleteStory();
                    }
                  }}
                  className={`px-4 py-2 bg-red-900 border border-red-700 text-white rounded font-sc font-bold text-xs transition-colors ${deleteText === 'DELETE' ? 'hover:bg-red-800' : 'opacity-50 cursor-not-allowed'}`}
                >
                  Sever Karma
                </button>
              </div>
            </motion.div>
          </motion.div>
          </FocusLock>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {unlockedArtifactAlert && (
            <motion.div
              key="artifact-celebration-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md"
              onClick={() => {
                if (isArtifactRevealed) {
                  dismissArtifactAlert();
                }
              }}
            >
              {/* Immersive interactive canvas celestial particle shower */}
              <CelestialParticleShower
                accent={(RARITY_THEMES[unlockedArtifactAlert.rarity] ?? NEUTRAL_THEME).hex}
              />

              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Floating particle ambient glow */}
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gold-accent/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-portal/10 rounded-full blur-[120px] animate-pulse"></div>
              </div>

              <div className="absolute inset-0 overflow-y-auto">
                <div className="relative min-h-full w-full flex items-center justify-center p-4">
                {!isArtifactRevealed ? (
                <motion.div
                  key="mystery-relic"
                  initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.8, y: 50, opacity: 0 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { scale: 1.1, opacity: 0, rotateY: 90 }}
                  transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", damping: 20, stiffness: 100 }}
                  className="relative group cursor-pointer"
                  data-celestial-foreground
                  onClick={(e) => {
                    e.stopPropagation();
                    vibrate('heavyTap');
                    setIsArtifactRevealed(true);
                  }}
                >
                  {/* Glowing aura around mystery card */}
                  <div className="absolute -inset-4 bg-portal/30 rounded-full blur-2xl group-hover:bg-portal/50 transition-colors duration-500 animate-pulse" />
                  
                  <div className="relative w-52 h-72 sm:w-56 sm:h-80 bg-neutral-950 border border-portal/50 rounded-2xl shadow-[0_0_50px_rgba(4,172,255,0.3)] flex flex-col items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] bg-[size:12px_12px] opacity-20" />
                    <Sparkles className="text-portal w-12 h-12 mb-4 animate-pulse" />
                    <span className="font-sc font-bold text-portal text-lg uppercase tracking-widest animate-pulse drop-shadow-[0_0_8px_rgba(4,172,255,0.8)]">
                      Claim Relic
                    </span>
                    <p className="text-neutral-500 font-mono text-[11px] mt-3 uppercase tracking-widest opacity-60">Tap to Reveal</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="revealed-relic"
                  initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0, rotateY: -55 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1, rotateY: 0 }}
                  transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", damping: 22, stiffness: 150 }}
                  className="relative max-w-[300px] sm:max-w-[340px] w-full z-10"
                  data-celestial-foreground
                  style={{ transformPerspective: 1200 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {(() => {
                    const rarity = unlockedArtifactAlert.rarity;
                    const theme = RARITY_THEMES[rarity] ?? NEUTRAL_THEME;
                    const fx = RARITY_EFFECTS[rarity] ?? NO_RELIC_EFFECTS;
                    const { hex, titleColor } = theme;

                    return (
                      <>
                        <style>{RELIC_SIGIL_CSS}</style>

                        {/* Legendary+: warm glow washing the space behind the full card */}
                        {fx.warmGlow && (
                          <div
                            aria-hidden
                            className="absolute -inset-16 pointer-events-none relic-halo-pulse"
                            style={{ background: `radial-gradient(ellipse at 50% 44%, ${hex}1f 0%, ${hex}0a 38%, transparent 66%)`, filter: 'blur(6px)' }}
                          />
                        )}

                        {/* Rarity aura bleeding out from behind the card */}
                        <div
                          aria-hidden
                          className={`absolute -inset-10 pointer-events-none ${fx.pulse ? 'relic-halo-pulse' : ''}`}
                          style={{ background: `radial-gradient(ellipse at 50% 36%, ${hex}${fx.halo ? '2e' : '10'} 0%, transparent 62%)` }}
                        />

                        {/* Legendary+: brief one-shot flare the moment the relic is revealed */}
                        {fx.revealFlare && !shouldReduceMotion && (
                          <div
                            aria-hidden
                            className="absolute -inset-10 pointer-events-none relic-reveal-flare"
                            style={{ background: `radial-gradient(circle at 50% 42%, ${hex}59 0%, transparent 60%)` }}
                          />
                        )}

                        {/* Epic+: a few slow-drifting motes around the card */}
                        {fx.particles > 0 && !shouldReduceMotion && (
                          <div aria-hidden className="absolute -inset-6 pointer-events-none">
                            {RELIC_DRIFT_MOTES.slice(0, fx.particles).map((mote, i) => (
                              <span
                                key={i}
                                className="absolute rounded-full relic-drift"
                                style={{
                                  left: mote.left,
                                  top: mote.top,
                                  width: mote.size,
                                  height: mote.size,
                                  background: hex,
                                  boxShadow: `0 0 6px ${hex}`,
                                  animationDuration: `${mote.duration}s`,
                                  animationDelay: `${mote.delay}s`,
                                }}
                              />
                            ))}
                          </div>
                        )}

                        <div
                          className="relative bg-[#060607]/95 rounded-[1.5rem] px-5 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5 text-center overflow-hidden"
                          style={{
                            border: `1px solid ${hex}45`,
                            boxShadow: `0 0 50px ${hex}26, inset 0 0 70px rgba(0,0,0,0.65)`,
                          }}
                        >
                          {/* Rare+: soft shimmer sweeping across the card edge */}
                          {fx.edgeShimmer && !shouldReduceMotion && (
                            <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden rounded-[1.5rem]">
                              <div
                                className="relic-shimmer-band absolute top-0 bottom-0 w-1/3"
                                style={{ background: `linear-gradient(to right, transparent, ${hex}12 42%, ${hex}24 50%, ${hex}12 58%, transparent)` }}
                              />
                            </div>
                          )}
                          {/* Inner hairline frame */}
                          <div aria-hidden className="absolute inset-[5px] rounded-[1.2rem] pointer-events-none" style={{ border: `1px solid ${hex}1c` }} />
                          {/* Top sheen */}
                          <div aria-hidden className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />

                          <div className="relative z-10 flex flex-col items-center">

                            {/* 1. Rarity label */}
                            <div className="flex items-center justify-center gap-2.5 w-full">
                              <div className="h-px w-7" style={{ background: `linear-gradient(to right, transparent, ${hex}66)` }} />
                              <Sparkles size={11} strokeWidth={1.5} style={{ color: hex, filter: `drop-shadow(0 0 5px ${hex})` }} />
                              <span
                                className="text-[10px] uppercase tracking-[0.35em] font-serif whitespace-nowrap"
                                style={{ color: `${hex}d9`, textShadow: `0 0 14px ${hex}66` }}
                              >
                                {rarity ? `${rarity} Relic` : 'Relic'}
                              </span>
                              <Sparkles size={11} strokeWidth={1.5} style={{ color: hex, filter: `drop-shadow(0 0 5px ${hex})` }} />
                              <div className="h-px w-7" style={{ background: `linear-gradient(to left, transparent, ${hex}66)` }} />
                            </div>

                            {/* 2. Ornate relic sigil */}
                            <motion.div
                              initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.55, opacity: 0 }}
                              animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                              transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.25, type: "spring", damping: 18, stiffness: 120 }}
                              className="relative w-36 h-36 sm:w-48 sm:h-48 my-3 sm:my-4 flex items-center justify-center"
                            >
                              {/* Halo behind the sigil */}
                              <div
                                aria-hidden
                                className="absolute inset-4 rounded-full relic-breathe"
                                style={{ background: `radial-gradient(circle, ${hex}21 0%, transparent 68%)` }}
                              />
                              {/* Horizontal flare beam */}
                              <div
                                aria-hidden
                                className="absolute -left-4 -right-4 top-1/2 h-px -translate-y-1/2"
                                style={{ background: `linear-gradient(to right, transparent, ${hex}59 22%, ${hex}59 78%, transparent)` }}
                              />

                              <svg
                                viewBox="0 0 240 240"
                                className="relative w-full h-full"
                                fill="none"
                                stroke="currentColor"
                                style={{ color: hex, filter: fx.brighterSeal ? `drop-shadow(0 0 14px ${hex}b3) brightness(1.18)` : `drop-shadow(0 0 9px ${hex}80)` }}
                                aria-hidden
                              >
                                {/* Slow-spinning outer assembly */}
                                <g className="relic-sigil-spin" opacity="0.6">
                                  <circle cx="120" cy="120" r="112" strokeWidth="0.5" strokeDasharray="1 7" />
                                  <circle cx="120" cy="120" r="103" strokeWidth="0.7" />
                                  <path d="M120 34 L206 120 L120 206 L34 120 Z" strokeWidth="0.8" opacity="0.85" />
                                  <circle cx="120" cy="34" r="2" fill="currentColor" stroke="none" />
                                  <circle cx="206" cy="120" r="2" fill="currentColor" stroke="none" />
                                  <circle cx="120" cy="206" r="2" fill="currentColor" stroke="none" />
                                  <circle cx="34" cy="120" r="2" fill="currentColor" stroke="none" />
                                </g>

                                {/* Counter-rotating tick ring */}
                                <g className="relic-sigil-spin-rev" opacity="0.55">
                                  <circle cx="120" cy="120" r="92" strokeWidth="0.4" />
                                  {RELIC_TICKS}
                                </g>

                                {/* Static core */}
                                <g opacity="0.9">
                                  {/* Axis hairlines */}
                                  <line x1="120" y1="10" x2="120" y2="58" strokeWidth="0.5" opacity="0.55" />
                                  <line x1="120" y1="182" x2="120" y2="230" strokeWidth="0.5" opacity="0.55" />
                                  <line x1="10" y1="120" x2="58" y2="120" strokeWidth="0.5" opacity="0.55" />
                                  <line x1="182" y1="120" x2="230" y2="120" strokeWidth="0.5" opacity="0.55" />
                                  {/* Axis crowns */}
                                  <circle cx="120" cy="20" r="3.2" strokeWidth="0.7" />
                                  <circle cx="120" cy="220" r="3.2" strokeWidth="0.7" />
                                  <circle cx="20" cy="120" r="3.2" strokeWidth="0.7" />
                                  <circle cx="220" cy="120" r="3.2" strokeWidth="0.7" />
                                  <circle cx="120" cy="20" r="1" fill="currentColor" stroke="none" />
                                  <circle cx="120" cy="220" r="1" fill="currentColor" stroke="none" />
                                  <circle cx="20" cy="120" r="1" fill="currentColor" stroke="none" />
                                  <circle cx="220" cy="120" r="1" fill="currentColor" stroke="none" />
                                  {/* Inner rings */}
                                  <circle cx="120" cy="120" r="58" strokeWidth="0.8" />
                                  <circle cx="120" cy="120" r="51" strokeWidth="0.45" strokeDasharray="3 2.5" opacity="0.7" />
                                  {/* Axis beads near the core */}
                                  <circle cx="120" cy="66" r="2.6" strokeWidth="0.7" />
                                  <circle cx="120" cy="174" r="2.6" strokeWidth="0.7" />
                                  <circle cx="66" cy="120" r="2.6" strokeWidth="0.7" />
                                  <circle cx="174" cy="120" r="2.6" strokeWidth="0.7" />
                                  {/* Eight-point compass star */}
                                  <path
                                    d="M120 74 L127.5 112.5 L166 120 L127.5 127.5 L120 166 L112.5 127.5 L74 120 L112.5 112.5 Z"
                                    strokeWidth="1"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M120 90 L126.6 113.4 L150 120 L126.6 126.6 L120 150 L113.4 126.6 L90 120 L113.4 113.4 Z"
                                    strokeWidth="0.5"
                                    opacity="0.65"
                                    transform="rotate(45 120 120)"
                                  />
                                </g>
                              </svg>

                              {/* Relic-type icon at the heart of the star */}
                              <div
                                className="absolute inset-0 flex items-center justify-center"
                                style={{ color: hex, filter: `drop-shadow(0 0 8px ${hex})` }}
                              >
                                {(() => {
                                  const RelicIcon = getRelicIcon(unlockedArtifactAlert.name);
                                  return <RelicIcon size={15} strokeWidth={1} />;
                                })()}
                              </div>

                              {/* Twinkling motes orbiting the sigil */}
                              <Sparkles size={9} className="absolute relic-twinkle" style={{ top: '2%', left: '47%', color: hex }} strokeWidth={1.5} />
                              <Sparkles size={7} className="absolute relic-twinkle" style={{ top: '26%', right: '-2%', color: hex, animationDelay: '0.9s' }} strokeWidth={1.5} />
                              <Sparkles size={8} className="absolute relic-twinkle" style={{ bottom: '8%', left: '-3%', color: hex, animationDelay: '1.6s' }} strokeWidth={1.5} />
                              <Sparkles size={6} className="absolute relic-twinkle" style={{ bottom: '0%', right: '24%', color: hex, animationDelay: '0.4s' }} strokeWidth={1.5} />
                            </motion.div>

                            {/* 3. Title & lore */}
                            <h3
                              className={`font-serif text-[17px] sm:text-[20px] leading-snug tracking-wide font-normal ${titleColor}`}
                              style={{ textShadow: `0 0 24px ${hex}45` }}
                            >
                              {unlockedArtifactAlert.name}
                            </h3>

                            <div className="flex items-center justify-center gap-2.5 my-3">
                              <div className="h-px w-12" style={{ background: `linear-gradient(to right, transparent, ${hex}59)` }} />
                              <div className="w-1.5 h-1.5 rotate-45" style={{ border: `1px solid ${hex}a6`, boxShadow: `0 0 7px ${hex}73` }} />
                              <div className="h-px w-12" style={{ background: `linear-gradient(to left, transparent, ${hex}59)` }} />
                            </div>

                            <p className="text-xs sm:text-[13px] font-serif italic text-neutral-400 leading-relaxed px-2 max-w-[260px] line-clamp-3">
                              {unlockedArtifactAlert.description || "Records marked by the Library are never truly forgotten."}
                            </p>

                            {/* 4. The Stats Box (Qi + Rarity) — compact VALUE | LABEL pairs that won't clip on mobile */}
                            <div
                              className="w-full mt-3 sm:mt-4 rounded-xl bg-black/50 flex items-stretch overflow-hidden"
                              style={{ border: `1px solid ${hex}30`, boxShadow: `inset 0 0 26px rgba(0,0,0,0.65), 0 0 18px ${hex}14` }}
                            >
                              <div className="flex-1 min-w-0 flex items-center justify-center py-2 sm:py-2.5 px-1" style={{ borderRight: `1px solid ${hex}24` }}>
                                <span className="text-[10px] sm:text-[11px] font-serif tracking-[0.12em] uppercase whitespace-nowrap text-neutral-200">
                                  +{unlockedArtifactAlert.rewardValueQi ?? 10}
                                  <span className="mx-1.5" style={{ color: `${hex}80` }}>|</span>
                                  <span style={{ color: `${hex}d9`, textShadow: `0 0 10px ${hex}55` }}>QI</span>
                                </span>
                              </div>
                              <div className="flex-1 min-w-0 flex items-center justify-center py-2 sm:py-2.5 px-1">
                                <span
                                  className="text-[10px] sm:text-[11px] font-serif tracking-[0.12em] uppercase whitespace-nowrap text-neutral-200"
                                >
                                  {rarity || 'Common'}
                                  <span className="mx-1.5" style={{ color: `${hex}80` }}>|</span>
                                  <span style={{ color: `${hex}d9`, textShadow: `0 0 10px ${hex}55` }}>Relic</span>
                                </span>
                              </div>
                            </div>

                            {/* 5. Claim */}
                            <button
                              type="button"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                              onClick={() => {
                                dismissArtifactAlert();
                                vibrate('softTap');
                              }}
                              className="relic-claim-btn w-full relative mt-3 sm:mt-4 py-2.5 rounded-full group overflow-hidden"
                              style={{
                                border: `1px solid ${hex}59`,
                                background: 'linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(0,0,0,0.45))',
                                boxShadow: `0 0 20px ${hex}1f`,
                                '--relic-hex-glow': `${hex}66`,
                              } as React.CSSProperties}
                            >
                              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                              <div className="flex items-center justify-center gap-4 relative z-10">
                                <Sparkles size={12} style={{ color: hex }} className="transition-transform duration-500 group-hover:scale-125" />
                                <span className="font-serif uppercase tracking-[0.28em] text-xs text-neutral-200 group-hover:text-white transition-colors">
                                  Claim Relic
                                </span>
                                <Sparkles size={12} style={{ color: hex }} className="transition-transform duration-500 group-hover:scale-125" />
                              </div>
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
                )}
                </div>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* System Feed Layer / Heavenly Notices */}
      <div className="fixed bottom-32 right-4 md:right-6 z-[100] flex flex-col-reverse gap-3 w-[calc(100%-2rem)] md:w-[380px] items-end pointer-events-none">
        <AnimatePresence>
          {appError && (
            <motion.div
              key="appError"
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="bg-neutral-900 border border-human/60 border-b-2 border-b-human shadow-2xl p-4 pr-12 rounded w-full overflow-hidden pointer-events-auto relative"
            >
              <div className="flex items-start">
                <div className="pt-1 pr-3 text-human shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="font-sc font-bold text-human tracking-[0.1em] text-xs uppercase mb-1 drop-shadow-md">
                    Celestial Disruption
                  </h4>
                  <p className="font-mono text-[11px] leading-relaxed text-neutral-300">
                    {appError}
                  </p>
                </div>
              </div>
              <button
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setAppError(null)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-signal transition-colors p-1 bg-black/20 rounded backdrop-blur"
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
              <div className="absolute top-0 right-0 w-32 h-32 bg-human/5 rounded-full blur-3xl pointer-events-none" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {draftRecoverySession && (
            <motion.div
              key="draftRecovery"
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="bg-neutral-900 border border-portal/60 border-b-2 border-b-portal shadow-2xl p-4 pr-12 rounded w-full overflow-hidden pointer-events-auto relative"
            >
              <div className="flex items-start">
                <div className="pt-1 pr-3 text-portal shrink-0">
                  <RefreshCw size={20} className="animate-spin-slow" />
                </div>
                <div>
                  <h4 className="font-sc font-bold text-portal tracking-[0.1em] text-xs uppercase mb-1 drop-shadow-md">
                    Unsaved Session Detected
                  </h4>
                  <p className="font-mono text-[11px] leading-relaxed text-neutral-300 mb-3">
                    An interrupted draft for Chapter {draftRecoverySession.generatingChapterNum} was found in the astral weave. Do you wish to restore it?
                  </p>
                  <div className="flex space-x-3">
                    <button
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                        setActiveStoryId(draftRecoverySession.activeStoryId);
                        setSelectedChapterNum(draftRecoverySession.generatingChapterNum);
                        setCurrentScreen('reader');
                        storyEngine.handleGenerateChapter(draftRecoverySession.generatingChapterNum);
                        setDraftRecoverySession(null);
                      }}
                      className="px-3 py-1.5 bg-portal/10 border border-portal/30 text-portal text-[10px] font-bold uppercase font-mono rounded hover:bg-portal hover:text-void transition-colors"
                    >
                      Restore Draft
                    </button>
                    <button
                      onClick={() => {
                        localStorage.removeItem('seihouse_active_generation');
                        setDraftRecoverySession(null);
                      }}
                      className="px-3 py-1.5 bg-void border border-neutral-700 text-neutral-400 text-[10px] uppercase font-mono rounded hover:bg-neutral-800 transition-colors"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('seihouse_active_generation');
                  setDraftRecoverySession(null);
                }}
                className="absolute top-4 right-4 text-neutral-500 hover:text-signal transition-colors p-1 bg-black/20 rounded backdrop-blur"
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
              <div className="absolute top-0 right-0 w-32 h-32 bg-portal/5 rounded-full blur-3xl pointer-events-none" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <SyncConflictModal />
    </>
  );
};
