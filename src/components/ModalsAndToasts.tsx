import React, { useEffect, useRef, useState } from 'react';
import FocusLock from 'react-focus-lock';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Sliders, Award, Shield, Sparkles, Compass, Globe, Key, Zap, RefreshCw, Save } from 'lucide-react';
import { vibrate } from '../lib/vibration';
import { useAppStore } from '../store/useAppStore';
import { useStoryEngine } from '../hooks/useStoryEngine';
import { SearchableModelSelector } from './SearchableModelSelector';
import { secureStorage } from '../lib/encryption';
import { CelestialParticleShower } from './CelestialParticleShower';
import { SyncConflictModal } from './SyncConflictModal';

type RarityTheme = {
  glowColor: string; textColor: string; titleColor: string;
  dotClass: string; sparkleClass: string; borderGlow: string; buttonHover: string;
};

const NEUTRAL_THEME: RarityTheme = {
  glowColor: 'rgba(255,255,255,0.8)',
  textColor: 'text-neutral-200',
  titleColor: 'text-neutral-200',
  dotClass: 'bg-neutral-300 shadow-[0_0_5px_rgba(255,255,255,0.8)]',
  sparkleClass: 'text-neutral-500',
  borderGlow: 'border-neutral-300/30 shadow-[0_0_20px_rgba(255,255,255,0.1)]',
  buttonHover: 'hover:border-neutral-500/80',
};

const RARITY_THEMES: Record<string, RarityTheme> = {
  Transcendent: { glowColor: "rgba(34,211,238,0.7)", textColor: "text-cyan-200", titleColor: "text-cyan-100", dotClass: "bg-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.8)]", sparkleClass: "text-cyan-700/80", borderGlow: "border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]", buttonHover: "hover:border-cyan-500/60 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]" },
  Mythic: { glowColor: "rgba(239,68,68,0.7)", textColor: "text-red-200", titleColor: "text-red-100", dotClass: "bg-red-200 shadow-[0_0_8px_rgba(239,68,68,0.8)]", sparkleClass: "text-red-800/80", borderGlow: "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]", buttonHover: "hover:border-red-500/60 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]" },
  Legendary: { glowColor: "rgba(245,158,11,0.7)", textColor: "text-amber-200", titleColor: "text-amber-100", dotClass: "bg-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.8)]", sparkleClass: "text-amber-700/60", borderGlow: "border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]", buttonHover: "hover:border-amber-500/60 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]" },
  Epic: { glowColor: "rgba(168,85,247,0.7)", textColor: "text-purple-200", titleColor: "text-purple-100", dotClass: "bg-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.8)]", sparkleClass: "text-purple-800/80", borderGlow: "border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]", buttonHover: "hover:border-purple-500/60 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]" },
  Rare: { glowColor: "rgba(16,185,129,0.7)", textColor: "text-emerald-200", titleColor: "text-emerald-100", dotClass: "bg-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.8)]", sparkleClass: "text-emerald-800/80", borderGlow: "border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]", buttonHover: "hover:border-emerald-500/60 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]" },
};

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
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
              onClick={() => {
                if (isArtifactRevealed) {
                  dismissArtifactAlert();
                }
              }}
            >
              {/* Immersive interactive canvas celestial particle shower */}
              <CelestialParticleShower />

              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Floating particle ambient glow */}
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gold-accent/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-portal/10 rounded-full blur-[120px] animate-pulse"></div>
              </div>

              {!isArtifactRevealed ? (
                <motion.div
                  key="mystery-relic"
                  initial={{ scale: 0.8, y: 50, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 1.1, opacity: 0, rotateY: 90 }}
                  transition={{ type: "spring", damping: 20, stiffness: 100 }}
                  className="relative group cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    vibrate('heavyTap');
                    setIsArtifactRevealed(true);
                  }}
                >
                  {/* Glowing aura around mystery card */}
                  <div className="absolute -inset-4 bg-portal/30 rounded-full blur-2xl group-hover:bg-portal/50 transition-colors duration-500 animate-pulse" />
                  
                  <div className="relative w-64 h-96 bg-neutral-950 border border-portal/50 rounded-2xl shadow-[0_0_50px_rgba(4,172,255,0.3)] flex flex-col items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] bg-[size:12px_12px] opacity-20" />
                    <Sparkles className="text-portal w-16 h-16 mb-6 animate-pulse" />
                    <span className="font-sc font-bold text-portal text-xl uppercase tracking-widest animate-pulse drop-shadow-[0_0_8px_rgba(4,172,255,0.8)]">
                      Claim Relic
                    </span>
                    <p className="text-neutral-500 font-mono text-xs mt-4 uppercase tracking-widest opacity-60">Tap to Reveal</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="revealed-relic"
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 180 }}
                  className="relative bg-[#09090b] border border-neutral-800/80 rounded-[2rem] p-8 max-w-[400px] w-full text-center z-10 shadow-2xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(() => {
                    const rarity = unlockedArtifactAlert.rarity;
                    const { glowColor, textColor, titleColor, dotClass, sparkleClass, borderGlow, buttonHover } = RARITY_THEMES[rarity] ?? NEUTRAL_THEME;

                    return (
                      <>
                        {/* Subtle Top Gradient for depth */}
                        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-neutral-800/20 to-transparent pointer-events-none" />
                        
                        {/* Subtle starry background inside modal */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_80%)] pointer-events-none" />

                        <div className="space-y-6 relative z-10 flex flex-col items-center">
                          
                          {/* 1. Rarity Label */}
                          <div className="flex items-center justify-center gap-3">
                            <Sparkles size={10} className={sparkleClass} strokeWidth={1.5} />
                            <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-serif">
                              {rarity ? `${rarity} Relic` : 'Relic'}
                            </span>
                            <Sparkles size={10} className={sparkleClass} strokeWidth={1.5} />
                          </div>

                          {/* 2. Center Geometric Emblem */}
                          <div className="relative w-56 h-56 mx-auto flex items-center justify-center my-6">
                            {/* Cross hairs */}
                            <div className="absolute w-[1px] h-full bg-gradient-to-b from-transparent via-neutral-600/40 to-transparent" />
                            <div className="absolute h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-600/40 to-transparent" />
                            
                            {/* Outer Circle */}
                            <div className="absolute w-full h-full rounded-full border border-neutral-700/30" />
                            {/* Inner Circles */}
                            <div className="absolute w-44 h-44 rounded-full border-[0.5px] border-neutral-500/40" />
                            <div className="absolute w-32 h-32 rounded-full border-[0.5px] border-neutral-400/50" />
                            <div className={`absolute w-20 h-20 rounded-full border ${borderGlow}`} />
                            
                            {/* The Diamond */}
                            <div className="absolute w-32 h-32 border border-neutral-400/40 rotate-45" />
                            
                            {/* Glowing nodes on the diamond */}
                            <div className={`absolute top-[2.75rem] w-1 h-1 rounded-full ${dotClass}`} />
                            <div className={`absolute bottom-[2.75rem] w-1 h-1 rounded-full ${dotClass}`} />
                            <div className={`absolute left-[2.75rem] w-1 h-1 rounded-full ${dotClass}`} />
                            <div className={`absolute right-[2.75rem] w-1 h-1 rounded-full ${dotClass}`} />

                            {/* Sparkles around outer circle */}
                            <Sparkles size={10} className={`absolute top-0 ${sparkleClass}`} />
                            <Sparkles size={10} className={`absolute bottom-0 ${sparkleClass}`} />
                            <Sparkles size={10} className={`absolute left-0 ${sparkleClass}`} />
                            <Sparkles size={10} className={`absolute right-0 ${sparkleClass}`} />

                            {/* The Icon */}
                            <div 
                              className={`relative z-10 flex items-center justify-center ${textColor}`}
                              style={{ filter: `drop-shadow(0 0 12px ${glowColor})` }}
                            >
                              {(() => {
                                const name = (unlockedArtifactAlert.name ?? '').toLowerCase();
                                const size = 32;
                                if (name.includes('medallion') || name.includes('badge')) return <Award size={size} strokeWidth={1} />;
                                if (name.includes('seal') || name.includes('signet')) return <Shield size={size} strokeWidth={1} />;
                                if (name.includes('gourd') || name.includes('nectar') || name.includes('cauldron') || name.includes('potion')) return <Zap size={size} strokeWidth={1} />;
                                if (name.includes('spindle') || name.includes('thread') || name.includes('matrix')) return <RefreshCw size={size} strokeWidth={1} />;
                                if (name.includes('pen') || name.includes('brush') || name.includes('scribe')) return <Save size={size} strokeWidth={1} />;
                                if (name.includes('crown') || name.includes('circlet') || name.includes('tiara')) return <Sliders size={size} strokeWidth={1} />;
                                if (name.includes('compass')) return <Compass size={size} strokeWidth={1} />;
                                if (name.includes('mirror')) return <Globe size={size} strokeWidth={1} />;
                                if (name.includes('key')) return <Key size={size} strokeWidth={1} />;
                                return <Compass size={size} strokeWidth={1} />; // Default to compass
                              })()}
                            </div>
                          </div>

                          {/* 3. Title & Description */}
                          <div className="text-center space-y-4 px-2 w-full pt-2">
                            <h3 className={`font-serif text-[26px] tracking-wide font-normal ${titleColor}`}>
                              {unlockedArtifactAlert.name}
                            </h3>
                            
                            <div className="w-16 h-[1px] bg-neutral-700/80 mx-auto my-2" />
                            
                            <p className="text-xs font-serif text-neutral-400 leading-relaxed px-4 opacity-90">
                              {unlockedArtifactAlert.description || "Records marked by the Library are never truly forgotten."}
                            </p>
                          </div>

                          {/* 4. The Stats Box (Qi + Unlock) */}
                          <div className="w-full bg-neutral-950/80 border border-neutral-800/60 rounded-[1.25rem] p-4 flex items-center justify-between mt-4 shadow-inner">
                            <div className="flex items-center gap-3 w-1/2 justify-center border-r border-neutral-800/80">
                              <Sparkles size={14} className={sparkleClass} />
                              <span className="text-sm text-neutral-300 font-serif tracking-wide">+{unlockedArtifactAlert.rewardValueQi ?? 10} Qi</span>
                            </div>
                            
                            <div className="flex items-center gap-3 w-1/2 justify-center pl-2">
                              {/* Custom Arch Icon */}
                              <svg className={sparkleClass + " w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M5 22v-8a7 7 0 0 1 14 0v8M12 7v5" strokeLinecap="round" strokeLinejoin="round"/>
                                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                                <path d="M3 22h18" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <span className="text-xs text-neutral-400 font-serif tracking-wide truncate pr-2">
                                {(() => {
                                  const unlock = unlockedArtifactAlert.specialUnlock;
                                  if (typeof unlock === 'object' && unlock?.label) return unlock.label;
                                  if (typeof unlock === 'string') return unlock;
                                  return "Archived in Relic Cave";
                                })()}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <button
                            type="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                            onClick={() => {
                              dismissArtifactAlert();
                              vibrate('softTap');
                            }}
                            className={`w-full relative mt-4 py-3.5 bg-gradient-to-b from-neutral-800/80 to-[#0e0e11] border border-neutral-700/60 rounded-full group transition-all duration-500 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.5)] ${buttonHover}`}
                          >
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="flex items-center justify-center gap-6 relative z-10">
                              <Sparkles size={12} className={`${sparkleClass} group-hover:text-neutral-200 transition-colors`} />
                              <span className="font-serif uppercase tracking-[0.2em] text-xs text-neutral-300 group-hover:text-neutral-100 transition-colors">
                                Claim Relic
                              </span>
                              <Sparkles size={12} className={`${sparkleClass} group-hover:text-neutral-200 transition-colors`} />
                            </div>
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              )}
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
