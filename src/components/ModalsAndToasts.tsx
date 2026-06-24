import React, { useEffect, useState } from 'react';
import FocusLock from 'react-focus-lock';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Sliders, Award, Shield, Sparkles, Compass, Globe, Key, Zap, RefreshCw, Save } from 'lucide-react';
import { vibrate } from '../lib/vibration';
import { useAppStore } from '../store/useAppStore';
import { useStoryEngine } from '../hooks/useStoryEngine';
import { SearchableModelSelector } from './SearchableModelSelector';
import { secureStorage } from '../lib/encryption';
import { CelestialParticleShower } from './CelestialParticleShower';

const DEFAULT_PRESETS = {
  storyMaker: {
    gemini: ["gemini-3.5-flash", "gemini-3.5-pro", "google/gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro"],
    openrouter: [
      "google/gemini-3.5-flash",
      "google/gemini-2.5-flash-lite",
      "meta-llama/llama-3-8b-instruct:free",
      "mistralai/mistral-7b-instruct:free",
      "google/gemma-2-9b-it:free",
      "google/gemini-2.5-flash",
      "openai/gpt-3.5-turbo"
    ],
    ollama: ["llama3", "gemma2", "mistral", "phi3"]
  },
  imageGenerator: {
    gemini: ["google/gemini-3.1-flash-image", "imagen-3.0-generate-002"],
    openrouter: ["google/gemini-3.1-flash-image", "stable-diffusion-xl", "playgroundai/playground-v2.5", "shuttle-ai/shuttle-3-diffusion"],
    ollama: ["local-sd-mortal", "local-sd-celestial"]
  }
};

export const ModalsAndToasts: React.FC = () => {
  const { 
    isSettingsOpen, setIsSettingsOpen, 
    routingConfig, setRoutingConfig,
    localGeminiKey, localOpenrouterKey, localOllamaHost, localDeepinfraKey,
    storyToDelete, cancelDeleteStory, confirmDeleteStory,
    appError, setAppError,
    draftRecoverySession, setDraftRecoverySession,
    setActiveStoryId, setSelectedChapterNum, setCurrentScreen, setIsGenerating, setGeneratingChapterNum
  } = useAppStore();

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
  const [isArtifactRevealed, setIsArtifactRevealed] = useState(false);

  useEffect(() => {
    if (!storyToDelete) {
      setDeleteText('');
    }
  }, [storyToDelete]);

  useEffect(() => {
    let revealTimer: NodeJS.Timeout;
    let dismissTimer: NodeJS.Timeout;

    if (unlockedArtifactAlert) {
      if (!isArtifactRevealed) {
        revealTimer = setTimeout(() => {
          vibrate('heavy');
          setIsArtifactRevealed(true);
        }, 3000);
      } else {
        dismissTimer = setTimeout(() => {
          setUnlockedArtifactAlert(null);
        }, 5000);
      }
    }

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(dismissTimer);
    };
  }, [unlockedArtifactAlert, isArtifactRevealed]);

  useEffect(() => {
    const handleArtifactUnlocked = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.artifact) {
        setIsArtifactRevealed(false);
        setUnlockedArtifactAlert(customEvent.detail.artifact);
        vibrate('success');
      }
    };
    window.addEventListener('seihouse-artifact-unlocked', handleArtifactUnlocked);
    return () => {
      window.removeEventListener('seihouse-artifact-unlocked', handleArtifactUnlocked);
    };
  }, []);

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

  const fetchDynamicModels = async (route: 'storyMaker' | 'imageGenerator', provider: 'gemini' | 'openrouter' | 'ollama') => {
    const key = `${route}-${provider}`;
    setLoadingModels(prev => ({ ...prev, [key]: true }));
    try {
      let reqKey = '';
      if (provider === 'gemini') {
        reqKey = localGeminiKey;
      } else if (provider === 'openrouter') {
        reqKey = localOpenrouterKey;
      }
      
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          host: provider === 'ollama' ? localOllamaHost : undefined,
          key: reqKey || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.models)) {
          setDynamicModels(prev => ({
            ...prev,
            [route]: {
              ...prev[route],
              [provider]: data.models
            }
          }));
        }
      }
    } catch (err) {
      console.error(`Failed to fetch dynamic models for ${route}/${provider}:`, err);
    } finally {
      setLoadingModels(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleUpdateProvider = (route: 'storyMaker' | 'imageGenerator', provider: 'gemini' | 'openrouter' | 'ollama') => {
    const presets = routingPresets || DEFAULT_PRESETS;
    const availableModels = presets[route][provider] || [];
    const model = availableModels[0] || '';
    setRoutingConfig({
      ...routingConfig,
      [route]: { provider, model }
    });
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
                          onClick={() => handleUpdateProvider('storyMaker', prov)}
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
                          onClick={() => handleUpdateProvider('imageGenerator', prov)}
                          className={`py-1.5 px-0.5 text-[9px] font-bold uppercase font-sc tracking-wider border rounded transition-all leading-tight ${
                            routingConfig.imageGenerator.provider === prov
                              ? 'bg-human/10 border-human text-human'
                              : 'bg-void border-neutral-900 text-neutral-550 hover:border-neutral-800'
                          }`}
                        >
                          {prov === 'gemini' 
                            ? 'Gemini' 
                            : prov === 'openrouter' 
                              ? 'Preview Fallback' 
                              : 'Free Placeholder'}
                        </button>
                      ))}
                    </div>
                    {routingConfig.imageGenerator.provider !== 'gemini' && (
                      <p className="text-[10px] font-mono text-neutral-500 italic mt-1 px-1 text-center leading-normal">
                        ★ Standard {routingConfig.imageGenerator.provider === 'openrouter' ? 'OpenRouter' : 'Ollama'} handles text-only; image requests default to our <span className="text-human font-bold font-sans">Free Visual Placeholder</span>.
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
                  onClick={() => setIsSettingsOpen(false)}
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
                <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono block mb-2" htmlFor="a11y-control-${labelCounter}">
                  Type <span className="text-red-400 font-bold">DELETE</span> to confirm{' '}
                  <button
                    type="button"
                    onClick={() => {
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
                  placeholder="DELETE"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  className="w-full bg-void text-xs text-signal border border-neutral-700 focus:border-red-500 p-2 rounded focus:outline-none font-mono placeholder:text-neutral-700" id="a11y-control-${labelCounter}"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDeleteStory}
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
                  setUnlockedArtifactAlert(null);
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
                  initial={{ scale: 0.8, y: 50, opacity: 0, rotateY: 180 }}
                  animate={{ scale: 1, y: 0, opacity: 1, rotateY: 180 }}
                  exit={{ scale: 1.1, opacity: 0, rotateY: 90 }}
                  transition={{ type: "spring", damping: 20, stiffness: 100 }}
                  className="relative group cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    vibrate('heavy');
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
                  initial={{ scale: 0.9, rotateY: -90, opacity: 0 }}
                  animate={{ scale: 1, rotateY: 0, opacity: 1 }}
                  transition={{ type: "spring", damping: 25, stiffness: 180 }}
                  className="relative bg-neutral-950 border border-amber-500/30 rounded-3xl p-8 max-w-md w-full text-center z-10 shadow-[0_0_80px_rgba(245,158,11,0.25)] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                {/* Aura border glow based on rarity */}
                <div className={`absolute top-0 inset-x-0 h-[4px] ${
                  unlockedArtifactAlert.rarity === 'Transcendent' 
                    ? 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.5)]' 
                    : unlockedArtifactAlert.rarity === 'Mythic' 
                    ? 'bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                    : unlockedArtifactAlert.rarity === 'Legendary' 
                    ? 'bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                    : unlockedArtifactAlert.rarity === 'Epic'
                    ? 'bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                    : unlockedArtifactAlert.rarity === 'Rare'
                    ? 'bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                    : 'bg-gradient-to-r from-transparent via-neutral-500 to-transparent'
                }`}></div>

                {/* Sparkling Background Grid effect */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] bg-[size:24px_24px] opacity-30 pointer-events-none"></div>

                <div className="space-y-6 relative z-10">
                  {/* Event Title */}
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase font-bold tracking-[0.25em] text-amber-400 font-sc block animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">
                      ☯ You've been Rewarded by The Dao ☯
                    </span>
                    <h2 className="font-display text-2xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white via-neutral-200 to-neutral-400 leading-tight uppercase tracking-wide">
                      Cosmic Relic Unlocked
                    </h2>
                  </div>

                  {/* Pulsing Central Portal displaying the relic */}
                  <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                    {/* Ring auras */}
                    <div className="absolute inset-0 rounded-full border border-neutral-900 animate-spin" style={{ animationDuration: '20s' }}></div>
                    <div className="absolute inset-2 rounded-full border border-dashed border-neutral-850 animate-spin" style={{ animationDuration: '10s' }}></div>
                    <div className="absolute inset-4 bg-black/80 rounded-full border border-neutral-900 flex items-center justify-center shadow-inner">
                      {(() => {
                        const name = unlockedArtifactAlert.name.toLowerCase();
                        const rarity = unlockedArtifactAlert.rarity;
                        const size = 38;
                        let className = "";
                        
                        if (rarity === 'Transcendent') className = "text-cyan-400 animate-pulse drop-shadow-[0_0_12px_rgba(6,182,212,0.7)]";
                        else if (rarity === 'Mythic') className = "text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(220,38,38,0.6)]";
                        else if (rarity === 'Legendary') className = "text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]";
                        else if (rarity === 'Epic') className = "text-purple-400";
                        else if (rarity === 'Rare') className = "text-emerald-400";
                        else className = "text-neutral-500";

                        if (name.includes('medallion') || name.includes('badge')) return <Award size={size} className={className} />;
                        if (name.includes('seal') || name.includes('signet')) return <Shield size={size} className={className} />;
                        if (name.includes('gourd') || name.includes('nectar') || name.includes('cauldron') || name.includes('potion')) return <Zap size={size} className={className} />;
                        if (name.includes('spindle') || name.includes('thread') || name.includes('matrix')) return <RefreshCw size={size} className={className} />;
                        if (name.includes('pen') || name.includes('brush') || name.includes('scribe')) return <Save size={size} className={className} />;
                        if (name.includes('crown') || name.includes('circlet') || name.includes('tiara')) return <Sliders size={size} className={className} />;
                        if (name.includes('compass')) return <Compass size={size} className={className} />;
                        if (name.includes('mirror')) return <Globe size={size} className={className} />;
                        if (name.includes('key')) return <Key size={size} className={className} />;
                        return <Sparkles size={size} className={className} />;
                      })()}
                    </div>
                  </div>

                  {/* Relic Name & Rarity tag */}
                  <div className="space-y-2">
                    <span className={`inline-block text-[9px] uppercase font-bold tracking-widest font-mono px-3 py-1 rounded-full border ${
                      unlockedArtifactAlert.rarity === 'Transcendent' 
                        ? 'text-cyan-400 border-cyan-950 bg-cyan-950/20' 
                        : unlockedArtifactAlert.rarity === 'Mythic' 
                        ? 'text-red-400 border-red-950 bg-red-950/20' 
                        : unlockedArtifactAlert.rarity === 'Legendary' 
                        ? 'text-amber-400 border-amber-950 bg-amber-950/20'
                        : unlockedArtifactAlert.rarity === 'Epic'
                        ? 'text-purple-400 border-purple-950 bg-purple-950/20'
                        : unlockedArtifactAlert.rarity === 'Rare'
                        ? 'text-emerald-400 border-emerald-950 bg-emerald-950/20'
                        : 'text-neutral-400 border-neutral-900 bg-neutral-900/30'
                    }`}>
                      {unlockedArtifactAlert.rarity} Relic
                    </span>
                    <h3 className="font-sans font-semibold text-lg text-signal">
                      {unlockedArtifactAlert.name}
                    </h3>
                  </div>

                  {/* Lore / Story description */}
                  <div className="bg-black/60 border border-neutral-950 p-4 rounded-2xl relative">
                    <p className="text-xs font-serif text-neutral-400 leading-relaxed italic">
                      "{unlockedArtifactAlert.description}"
                    </p>
                  </div>

                  {/* Meridian Attribute Boost */}
                  <div className="bg-neutral-950/40 border border-neutral-900/60 p-3.5 rounded-xl flex items-center justify-between">
                    <div className="text-left">
                      <span className="text-[8px] uppercase font-bold tracking-wider text-neutral-500 font-sc">Karmic Resonance</span>
                      <p className="text-[10px] text-neutral-400 font-sans mt-0.5">Soul-meridian boost added</p>
                    </div>
                    <div className="px-3 py-1.5 bg-portal/10 border border-portal/30 rounded-lg text-xs font-bold font-mono text-portal animate-pulse flex items-center gap-1">
                      <Sparkles size={11} />
                      <span>{unlockedArtifactAlert.attributeBoost}</span>
                    </div>
                  </div>

                  {/* Milestone Origin */}
                  {unlockedArtifactAlert.sourceStoryTitle && (
                    <p className="text-[10px] text-neutral-500 font-mono">
                      Catalyst: {unlockedArtifactAlert.milestoneName} in <span className="text-neutral-400 font-sans">{unlockedArtifactAlert.sourceStoryTitle}</span>
                    </p>
                  )}

                  {/* Actions */}
                  <button
                    type="button"
                    onClick={() => {
                      setUnlockedArtifactAlert(null);
                      vibrate('softTap');
                    }}
                    className="w-full py-3 bg-portal/10 border border-portal/40 text-portal font-sc font-bold uppercase tracking-widest text-xs rounded-full hover:bg-portal hover:text-void transition-all duration-300 shadow-[0_0_20px_rgba(4,172,255,0.15)] hover:shadow-[0_0_30px_rgba(4,172,255,0.3)]"
                  >
                    Merge Relic with Soul-Meridian
                  </button>
                </div>
              </motion.div>
              )}
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appError && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-neutral-900 border border-human/60 border-b-2 border-b-human shadow-2xl p-4 pr-12 rounded z-[100] max-w-lg w-[calc(100%-2rem)] md:w-full overflow-hidden"
          >
            <div className="flex items-start">
              <div className="pt-1 pr-3 text-human">
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
              onClick={() => setAppError(null)}
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
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-neutral-900 border border-portal/60 border-b-2 border-b-portal shadow-2xl p-4 pr-12 rounded z-[100] max-w-lg w-[calc(100%-2rem)] md:w-full overflow-hidden"
          >
            <div className="flex items-start">
              <div className="pt-1 pr-3 text-portal">
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
                    onClick={() => {
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
    </>
  );
};
