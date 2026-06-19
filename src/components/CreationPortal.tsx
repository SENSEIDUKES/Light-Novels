import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldAlert, Award } from 'lucide-react';
import { motion } from 'motion/react';

interface CreationPortalProps {
  onStartStory: (mcName: string, genre: string, premise: string, chapterCount: number) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
}

const GENRE_PRESETS = [
  {
    id: 'Xianxia',
    name: 'Xianxia (Immortal Cultivation)',
    concept: 'Grand celestial laws, Dao seeking, flying swords, Core Formation, and overcoming the merciless Heavenly Tribulation.',
    icon: '⚔️',
    motto: '“My life is mine to control, not heaven’s!”'
  },
  {
    id: 'Xuanhuan',
    name: 'Xuanhuan (Mystic Fantasy)',
    concept: 'Savage martial paths, awakened bloodlines, supreme refining cauldrons, face-slapping arrogant heirs, and sovereign ascensions.',
    icon: '🔥',
    motto: '“If the Gods block me, I shall slaughter the Gods!”'
  },
  {
    id: 'LitRPG / System',
    name: 'System / Cultivation Interface',
    concept: 'A neon-glowing holographic system panel grants stats, inventory slots, skill points, and quest alerts in a cruel world.',
    icon: '⚡',
    motto: '“[System Alert: You have slain the Primeval Viper. EXP +500,000!]”'
  },
  {
    id: 'Regression',
    name: 'Regression / Reborn Sovereign',
    concept: 'Reborn in your younger, crippled body with 10,000 years of future memories. Front-load rare treasures, take revenge early.',
    icon: '⏳',
    motto: '“In my past life, you ruined me. In this life, I am your apocalypse.”'
  },
  {
    id: 'Urban Cultivation',
    name: 'Urban Cultivation Sage',
    concept: 'Ancient secret sects hiding in neon modern skyscrapers. Wealthy CEOs bowing to high school students who are secret sages.',
    icon: '🌃',
    motto: '“You may have billions of dollars, but I can shatter mountains with a flick.”'
  }
];

const PREMISE_SUGGESTIONS = [
  "Awakening a mysterious black tripod cauldron inside the family trash heap that grinds low-grade herbs into peerless tier-9 celestial elixirs.",
  "Dying in a grand sect betrayal only to regress 10 years to the moment of spiritual root measurement, choosing the forbidden Demonic Scripture.",
  "The world gets integrated into a cosmic tower system, but a bug grants me a hidden attribute: Infinite Comprehension Speed index.",
  "A quiet apprentice librarian finds a forgotten manual containing the diary of the first Primordial Creator, which talks back and demands snacks.",
  "Being the cripple son of a great General who finds out his 'broken' meridians are actually the legendary ancient Dragon-Phoenix Meridian body."
];

export default function CreationPortal({ onStartStory, isGenerating, error }: CreationPortalProps) {
  const [mcName, setMcName] = useState('Han Feng');
  const [selectedGenre, setSelectedGenre] = useState('Xianxia');
  const [customPremise, setCustomPremise] = useState(PREMISE_SUGGESTIONS[0]);
  const [chapterCount, setChapterCount] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcName.trim() || !customPremise.trim()) return;
    onStartStory(mcName.trim(), selectedGenre, customPremise.trim(), chapterCount);
  };

  return (
    <div className="max-w-4xl mx-auto" id="creation-portal-root">
      {/* Header section (Alegreya) */}
      <div className="text-center mb-10">
        <span className="font-sc text-human tracking-[0.2em] text-sm uppercase block mb-2">SEIHouse Archive Matrix</span>
        <h1 className="font-display font-bold text-4xl sm:text-5xl text-signal tracking-tight mb-4">
          Aetherial Narrative Portal
        </h1>
        <p className="font-sans font-light text-neutral-400 text-sm max-w-xl mx-auto leading-relaxed">
          Create a private, deeply serialized story matrix. Your narrative state is persistently bound into your own consciousness, powered by real-time LLM genesis.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-void border border-neutral-900 p-6 sm:p-10 rounded-lg shadow-2xl relative">
        {/* Glow Element */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-1 bg-gradient-to-r from-transparent via-portal/50 to-transparent"></div>

        {/* MC Name & Chapter Count */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="mc-name" className="block font-sc text-sm text-neutral-300 uppercase tracking-widest mb-2">
              Main Character Name
            </label>
            <input
              id="mc-name"
              type="text"
              value={mcName}
              onChange={(e) => setMcName(e.target.value)}
              placeholder="e.g., Lin Fan"
              disabled={isGenerating}
              className="w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded px-4 py-3 text-base transition-all"
              required
            />
            <p className="text-xs text-neutral-500 mt-2 font-sans">
              Choose a brave cultivator name. They will bear the burden of ascension.
            </p>
          </div>

          <div>
            <label htmlFor="chapter-count" className="block font-sc text-sm text-neutral-300 uppercase tracking-widest mb-2">
              Story Arc Chapters (5 - 10)
            </label>
            <div className="flex items-center space-x-4">
              <input
                id="chapter-count"
                type="range"
                min="5"
                max="10"
                value={chapterCount}
                onChange={(e) => setChapterCount(Number(e.target.value))}
                disabled={isGenerating}
                className="w-full accent-portal bg-neutral-900 h-1 rounded-lg"
              />
              <span className="font-mono text-portal text-lg bg-neutral-950 px-3 py-1 rounded border border-neutral-850 font-bold min-w-14 text-center">
                {chapterCount}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-2 font-sans">
              Determines the length and pacing depth of the generated chronicle.
            </p>
          </div>
        </div>

        {/* Genre Selection Grid */}
        <div id="genre-grid-selection">
          <label className="block font-sc text-sm text-neutral-300 uppercase tracking-widest mb-4">
            Select Narrative Genesis Genre
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GENRE_PRESETS.map((preset) => {
              const belongs = preset.id === selectedGenre;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedGenre(preset.id)}
                  disabled={isGenerating}
                  className={`text-left p-4 rounded border transition-all relative overflow-hidden group ${
                    belongs 
                      ? 'bg-neutral-950 border-portal text-signal shadow-[0_0_12px_rgba(4,172,255,0.15)]' 
                      : 'bg-neutral-950/20 border-neutral-900 text-neutral-400 hover:border-neutral-800 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xl">{preset.icon}</span>
                    <span className="font-sans font-medium text-sm text-signal group-hover:text-portal transition-colors">
                      {preset.name}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2 leading-relaxed text-neutral-400 font-sans font-light">
                    {preset.concept}
                  </p>
                  <div className="mt-2 text-[10px] italic text-human font-sans uppercase font-medium">
                    {preset.motto}
                  </div>
                  {belongs && (
                    <div className="absolute right-1 bottom-1 w-2 h-2 rounded-full bg-portal"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Premise Selection & Input */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <label htmlFor="premise-input" className="block font-sc text-sm text-neutral-300 uppercase tracking-widest">
              Core Premise & Secret Catalysts
            </label>
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] text-neutral-500 font-sans self-center mr-1">Suggestions:</span>
              {PREMISE_SUGGESTIONS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCustomPremise(PREMISE_SUGGESTIONS[idx])}
                  disabled={isGenerating}
                  className="bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 px-2 py-0.5 rounded transition-all font-mono"
                >
                  #{idx + 1}
                </button>
              ))}
            </div>
          </div>
          <textarea
            id="premise-input"
            rows={4}
            value={customPremise}
            onChange={(e) => setCustomPremise(e.target.value)}
            disabled={isGenerating}
            placeholder="Type your unique cheat item, cultivation secret, tragedy, or cosmic blessing..."
            className="w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded p-4 text-sm leading-relaxed transition-all resize-none"
            required
          />
          <p className="text-xs text-neutral-500 mt-2 font-sans font-light">
            Keep it focused on light novel tropes. It serves as the primary seed prompt for generating your characters, world building, and the 20-30 chapter summaries.
          </p>
        </div>

        {/* Generate / Action Button */}
        <div className="pt-4 border-t border-neutral-950 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs text-neutral-400 font-sans max-w-sm">
            <ShieldAlert size={16} className="text-human flex-shrink-0" />
            <span>
              This is a private storyteller. Built for the reader's pure personal art immersion, strictly respecting human authors.
            </span>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className={`w-full sm:w-auto font-sc px-6 py-3 rounded text-sm uppercase tracking-widest font-bold flex items-center justify-center space-x-2 transition-all ${
              isGenerating
                ? 'bg-neutral-900 border border-neutral-850 text-neutral-500 cursor-not-allowed'
                : 'bg-human text-signal border border-human hover:bg-void hover:text-human hover:border-human shadow-[0_0_15px_rgba(139,0,0,0.3)]'
            }`}
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full"
                />
                <span>Aligning Cosmic Meridians...</span>
              </>
            ) : (
              <>
                <span>Awaken Chronicle Matrix</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-human/10 border border-human/30 rounded text-xs text-neutral-300 font-sans flex items-center space-x-3 mt-4">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <strong className="text-human block mb-0.5">Heavenly Detonation Warning:</strong>
              {error}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
