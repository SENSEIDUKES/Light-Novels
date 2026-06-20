import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Sliders } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { SearchableModelSelector } from './SearchableModelSelector';
import { secureStorage } from '../lib/encryption';

const DEFAULT_PRESETS = {
  storyMaker: {
    gemini: ["gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite"],
    openrouter: [
      "meta-llama/llama-3-8b-instruct:free",
      "mistralai/mistral-7b-instruct:free",
      "google/gemma-2-9b-it:free",
      "google/gemini-2.5-flash",
      "openai/gpt-3.5-turbo"
    ],
    ollama: ["llama3", "gemma2", "mistral", "phi3"]
  },
  imageGenerator: {
    gemini: ["gemini-2.5-flash-image", "gemini-3.1-flash-image"],
    openrouter: ["stable-diffusion-xl", "playgroundai/playground-v2.5", "shuttle-ai/shuttle-3-diffusion"],
    ollama: ["local-sd-mortal", "local-sd-celestial"]
  }
};

export const ModalsAndToasts: React.FC = () => {
  const { 
    isSettingsOpen, setIsSettingsOpen, 
    routingConfig, setRoutingConfig,
    localGeminiKey, localOpenrouterKey, localOllamaHost,
    storyToDelete, cancelDeleteStory, confirmDeleteStory,
    appError, setAppError
  } = useAppStore();

  const [routingPresets, setRoutingPresets] = useState<any>(null);
  const [dynamicModels, setDynamicModels] = useState<{
    storyMaker: { gemini: string[]; openrouter: string[]; ollama: string[] };
    imageGenerator: { gemini: string[]; openrouter: string[]; ollama: string[] };
  }>({
    storyMaker: { gemini: [], openrouter: [], ollama: [] },
    imageGenerator: { gemini: [], openrouter: [], ollama: [] }
  });
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/router-presets')
      .then(res => res.json())
      .then(data => setRoutingPresets(data))
      .catch(() => {});
  }, []);

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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsSettingsOpen(false)}
            />
            
            <motion.div className="relative bg-[#050505] border border-neutral-900 rounded-xl shadow-2xl max-w-md w-full p-6 text-center z-10 font-sans max-h-[90dvh] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-neutral-800">
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
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['gemini', 'openrouter', 'ollama'] as const).map((prov) => (
                        <button
                          key={prov}
                          type="button"
                          onClick={() => handleUpdateProvider('imageGenerator', prov)}
                          className={`py-1 text-[9px] font-bold uppercase font-sc tracking-wider border rounded transition-all ${
                            routingConfig.imageGenerator.provider === prov
                              ? 'bg-human/10 border-human text-human'
                              : 'bg-void border-neutral-900 text-neutral-550 hover:border-neutral-800'
                          }`}
                        >
                          {prov === 'gemini' ? 'Gemini' : prov === 'openrouter' ? 'OpenRouter' : 'Ollama'}
                        </button>
                      ))}
                    </div>
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
                        <label className="text-[10px] font-mono text-neutral-400">Gemini Key Override</label>
                      </div>
                      <input
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
                        <label className="text-[10px] font-mono text-neutral-400">OpenRouter Key Override</label>
                      </div>
                      <input
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
                        <label className="text-[10px] font-mono text-neutral-400">Ollama Host Override</label>
                      </div>
                      <input
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
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {storyToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl relative"
            >
              <h3 className="text-xl font-display font-bold text-signal mb-2">Purge Novel Matrix</h3>
              <p className="text-sm text-neutral-400 mb-6 font-serif">
                Are you certain you wish to purge this serialized light novel matrix forever? This severed karma cannot be mended.
              </p>
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={cancelDeleteStory}
                  className="px-4 py-2 bg-void border border-neutral-700 text-neutral-300 rounded font-sc text-xs hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteStory}
                  className="px-4 py-2 bg-red-900 border border-red-700 text-white rounded font-sc font-bold text-xs hover:bg-red-800 transition-colors"
                >
                  Sever Karma
                </button>
              </div>
            </motion.div>
          </div>
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
    </>
  );
};
