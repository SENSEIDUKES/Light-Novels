import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldAlert, ChevronDown, ChevronUp, BookOpen, Layers, Target, Users, Zap, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IntakeData, WorldBlueprint } from '../types';

const renderSafeString = (val: any): React.ReactNode => {
  if (val === undefined || val === null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      return val.map((item, idx) => (
        <div key={idx} className="mb-1">
          {typeof item === 'object' ? JSON.stringify(item) : String(item)}
        </div>
      ));
    }
    return (
      <div className="space-y-1 bg-void/50 p-3 rounded border border-neutral-950 mt-1 font-sans">
        {Object.entries(val).map(([k, v]) => {
          const formattedKey = k
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .replace(/^\w/, c => c.toUpperCase());
          return (
            <div key={k} className="text-xs flex flex-col sm:flex-row sm:items-start pb-1 border-b border-neutral-900 last:border-0 last:pb-0">
              <strong className="text-portal font-semibold mr-1.5 min-w-[100px] shrink-0">{formattedKey}:</strong>
              <span className="text-neutral-300 whitespace-pre-wrap">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return String(val);
};

interface CreationPortalProps {
  onStartStory: (intake: IntakeData, blueprint: WorldBlueprint, chapterCount: number) => Promise<void>;
  onGenerateBlueprint: (intake: IntakeData) => Promise<WorldBlueprint>;
  isGenerating: boolean;
  error: string | null;
}

const GENRE_PRESETS = [
  { id: 'Xianxia', name: 'Xianxia', icon: '⚔️' },
  { id: 'Xuanhuan', name: 'Xuanhuan', icon: '🔥' },
  { id: 'LitRPG / System', name: 'System', icon: '⚡' },
  { id: 'Regression', name: 'Regression', icon: '⏳' },
  { id: 'Urban Cultivation', name: 'Urban Cultivation', icon: '🌃' }
];

const PREMISE_SUGGESTIONS = [
  "Awakening a mysterious black tripod cauldron inside the family trash heap that grinds low-grade herbs into peerless tier-9 celestial elixirs.",
  "Dying in a grand sect betrayal only to regress 10 years to the moment of spiritual root measurement, choosing the forbidden Demonic Scripture.",
  "The world gets integrated into a cosmic tower system, but a bug grants me a hidden attribute: Infinite Comprehension Speed index.",
  "A quiet apprentice librarian finds a forgotten manual containing the diary of the first Primordial Creator, which talks back and demands snacks.",
  "Being the cripple son of a great General who finds out his 'broken' meridians are actually the legendary ancient Dragon-Phoenix Meridian body."
];

interface FormSectionProps {
  id: 'core' | 'world' | 'mc' | 'power' | 'plot';
  title: string;
  icon: React.ReactNode;
  activeSection: 'core' | 'world' | 'mc' | 'power' | 'plot';
  setActiveSection: (id: 'core' | 'world' | 'mc' | 'power' | 'plot') => void;
  children: React.ReactNode;
}

const FormSection = ({ id, title, icon, activeSection, setActiveSection, children }: FormSectionProps) => {
  const isActive = activeSection === id;
  return (
    <div className="border border-neutral-900 rounded-lg overflow-hidden bg-void transition-colors mb-4">
      <button
        type="button"
        onClick={() => setActiveSection(isActive ? id : id)}
        className={`w-full flex items-center justify-between p-4 px-6 text-left transition-colors ${isActive ? 'bg-neutral-900/50 text-signal border-b border-neutral-900' : 'bg-void text-neutral-400 hover:bg-neutral-950 hover:text-neutral-200'}`}
      >
        <div className="flex items-center space-x-3">
          <span className={isActive ? 'text-portal' : 'text-neutral-500'}>{icon}</span>
          <span className="font-sc font-bold uppercase tracking-widest text-sm">{title}</span>
        </div>
        {isActive ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-6 space-y-6"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function CreationPortal({ onStartStory, onGenerateBlueprint, isGenerating, error }: CreationPortalProps) {
  const [stage, setStage] = useState<'intake' | 'blueprint'>('intake');
  const [blueprint, setBlueprint] = useState<WorldBlueprint | null>(null);
  
  const [intake, setIntake] = useState<IntakeData>({
    novelTitle: '',
    mcName: 'Han Feng',
    genrePath: 'Xianxia',
    corePremise: PREMISE_SUGGESTIONS[0],
    desiredPlotDirection: '',
    worldType: '',
    startingLocation: '',
    societyStructure: '',
    dangerLevel: '',
    generalAtmosphere: '',
    startingIdentity: '',
    personality: '',
    mainFlaw: '',
    secretAdvantage: '',
    startingWeakness: '',
    moralAlignment: '',
    startingPowerConcept: '',
    powerFlavor: '',
    powerPace: '',
    knownRanks: '',
    uniquePath: '',
    longTermGoal: '',
    firstMajorConflict: '',
    mainAntagonistPressure: '',
    romanceLevel: '',
    faceSlappingLevel: '',
    comedyLevel: '',
    tournamentArcPreference: '',
    haremPreference: '',
    betrayalLevel: '',
    thingsToAvoid: '',
    mustIncludeElements: '',
  });

  const [chapterCount, setChapterCount] = useState(10);
  const [activeSection, setActiveSection] = useState<'core' | 'world' | 'mc' | 'power' | 'plot'>('core');

  const updateIntake = (field: keyof IntakeData, value: string) => {
    setIntake(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateBlueprintClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intake.corePremise?.trim() || !intake.genrePath) return;
    try {
      const bp = await onGenerateBlueprint(intake);
      setBlueprint(bp);
      setStage('blueprint');
    } catch (err) {
      // Error is handled in parent and passed as prop
    }
  };

  const handleStartStoryClick = async () => {
    if (!blueprint) return;
    await onStartStory(intake, blueprint, chapterCount);
  };

  if (stage === 'blueprint' && blueprint) {
    return (
      <div className="max-w-4xl mx-auto pb-20" id="creation-portal-root">
        <div className="text-center mb-10">
          <span className="font-sc text-portal tracking-[0.2em] text-sm uppercase block mb-2">World Blueprint Generated</span>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-signal tracking-tight mb-4">
            {renderSafeString(blueprint.title)}
          </h1>
          <p className="font-sans font-light text-neutral-400 text-sm max-w-xl mx-auto leading-relaxed">
            {renderSafeString(blueprint.logline)}
          </p>
        </div>

        <div className="bg-neutral-950/80 border border-portal/30 p-6 sm:p-10 rounded-lg shadow-[0_0_30px_rgba(4,172,255,0.05)] relative space-y-8">
          <div>
            <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm mb-2">World Overview</h3>
            <div className="text-neutral-300 font-sans text-sm leading-relaxed">{renderSafeString(blueprint.worldOverview)}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm mb-2 flex items-center space-x-2"><Layers size={14} className="text-portal"/><span>Society & Factions</span></h3>
              <div className="text-neutral-400 font-sans text-xs mb-3">{renderSafeString(blueprint.societyStructure)}</div>
              <ul className="space-y-2">
                {blueprint.majorFactions?.map((f, i) => (
                  <li key={i} className="text-neutral-300 text-xs font-sans bg-void border border-neutral-800 p-2 rounded">{renderSafeString(f)}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm mb-2 flex items-center space-x-2"><Zap size={14} className="text-portal"/><span>Power System</span></h3>
              <div className="text-neutral-300 font-sans text-sm leading-relaxed whitespace-pre-wrap">{renderSafeString(blueprint.powerSystemOutline)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm mb-2 flex items-center space-x-2"><Users size={14} className="text-portal"/><span>Main Character</span></h3>
              <div className="text-neutral-300 font-sans text-sm leading-relaxed whitespace-pre-wrap">{renderSafeString(blueprint.mcProfile)}</div>
            </div>
            <div>
              <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm mb-2 flex items-center space-x-2"><Target size={14} className="text-portal"/><span>First Arc Promise</span></h3>
              <div className="text-neutral-300 font-sans text-sm leading-relaxed">{renderSafeString(blueprint.firstArcPromise)}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-neutral-900 gap-4">
            <button
              type="button"
              onClick={() => setStage('intake')}
              disabled={isGenerating}
              className="text-neutral-400 hover:text-signal text-xs font-sc uppercase tracking-widest"
            >
              ← Refine Details
            </button>

            <button
              type="button"
              onClick={handleStartStoryClick}
              disabled={isGenerating}
              className="w-full sm:w-auto font-sc px-6 py-3 rounded text-sm uppercase tracking-widest font-bold flex items-center justify-center space-x-2 bg-human text-signal border border-human hover:bg-void hover:text-human hover:border-human shadow-[0_0_15px_rgba(139,0,0,0.3)] transition-all"
            >
              {isGenerating ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full" />
                  <span>Generating...</span>
                </>
              ) : (
                <><span>Accept Blueprint & Start Matrix</span><ArrowRight size={16} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20" id="creation-portal-root">
      {/* Header section */}
      <div className="text-center mb-10">
        <span className="font-sc text-human tracking-[0.2em] text-sm uppercase block mb-2">SEIHouse Archive Matrix</span>
        <h1 className="font-display font-bold text-4xl sm:text-5xl text-signal tracking-tight mb-4">
          Story Seed Intake
        </h1>
        <p className="font-sans font-light text-neutral-400 text-sm max-w-xl mx-auto leading-relaxed">
          Provide as much or as little detail as you want. Empty fields will be intelligently extrapolated using Chinese light-novel logic. We will first generate a World Blueprint for your review.
        </p>
      </div>

      <form onSubmit={handleGenerateBlueprintClick} className="space-y-4">
        
        <FormSection id="core" title="1. Core Seed" icon={<BookOpen size={18} />} activeSection={activeSection} setActiveSection={setActiveSection}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Optional Novel Title</label>
              <input type="text" value={intake.novelTitle} onChange={(e) => updateIntake('novelTitle', e.target.value)} placeholder="Will be generated if empty" className="w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded px-4 py-2 text-sm" />
            </div>
            <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Main Character Name</label>
              <input type="text" value={intake.mcName} onChange={(e) => updateIntake('mcName', e.target.value)} placeholder="e.g., Lin Fan" className="w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded px-4 py-2 text-sm" />
            </div>
          </div>
          
          <div>
            <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Genre Path</label>
            <div className="flex flex-wrap gap-2">
              {GENRE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => updateIntake('genrePath', p.id)}
                  className={`px-3 py-1.5 rounded border text-xs font-sans transition-colors ${intake.genrePath === p.id ? 'bg-neutral-900 border-portal text-signal' : 'bg-transparent border-neutral-800 text-neutral-500 hover:text-neutral-300'}`}
                >
                  {p.icon} {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest">Core Premise / Secret Catalyst *</label>
              <div className="flex gap-1">
                {PREMISE_SUGGESTIONS.map((_, idx) => (
                  <button key={idx} type="button" onClick={() => updateIntake('corePremise', PREMISE_SUGGESTIONS[idx])} className="bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-400 px-1.5 py-0.5 rounded font-mono">#{idx + 1}</button>
                ))}
              </div>
            </div>
            <textarea required value={intake.corePremise} onChange={(e) => updateIntake('corePremise', e.target.value)} rows={3} placeholder="The main hook or cheat..." className="w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded p-3 text-sm resize-none" />
          </div>

          <div>
            <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Desired General Plot Direction (Optional)</label>
            <textarea value={intake.desiredPlotDirection} onChange={(e) => updateIntake('desiredPlotDirection', e.target.value)} rows={2} placeholder="e.g. Revenge focused, slow sect building, kingdom conquering..." className="w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded p-3 text-sm resize-none" />
          </div>
        </FormSection>

        <FormSection id="world" title="2. World Setting" icon={<Layers size={18} />} activeSection={activeSection} setActiveSection={setActiveSection}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">World Type</label>
              <input type="text" value={intake.worldType} onChange={(e) => updateIntake('worldType', e.target.value)} placeholder="e.g., Ancient sect world, tower system..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Starting Location</label>
              <input type="text" value={intake.startingLocation} onChange={(e) => updateIntake('startingLocation', e.target.value)} placeholder="e.g., Outer sect labor camp, mortal city slum..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Society Structure</label>
              <input type="text" value={intake.societyStructure} onChange={(e) => updateIntake('societyStructure', e.target.value)} placeholder="e.g., Sect-led, feudal, corporate..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Danger Level & Atmosphere</label>
              <input type="text" value={intake.dangerLevel} onChange={(e) => updateIntake('dangerLevel', e.target.value)} placeholder="e.g., Cutthroat, grimdark, mystical..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
            </div>
          </div>
        </FormSection>

        <FormSection id="mc" title="3. Main Character Setup" icon={<Users size={18} />} activeSection={activeSection} setActiveSection={setActiveSection}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Starting Identity</label>
              <input type="text" value={intake.startingIdentity} onChange={(e) => updateIntake('startingIdentity', e.target.value)} placeholder="e.g., Crippled young master, modern transmigrator..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Personality & Alignment</label>
              <input type="text" value={intake.personality} onChange={(e) => updateIntake('personality', e.target.value)} placeholder="e.g., Ruthless but protective, chaotic neutral..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Secret Advantage / Cheat</label>
              <input type="text" value={intake.secretAdvantage} onChange={(e) => updateIntake('secretAdvantage', e.target.value)} placeholder="e.g., System interface, primeval bloodline..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Main Flaw / Starting Weakness</label>
              <input type="text" value={intake.startingWeakness} onChange={(e) => updateIntake('startingWeakness', e.target.value)} placeholder="e.g., Destroyed meridians, demonic curse..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
            </div>
          </div>
        </FormSection>

        <FormSection id="power" title="4. Power System Seed" icon={<Zap size={18} />} activeSection={activeSection} setActiveSection={setActiveSection}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Starting Power Concept</label>
              <input type="text" value={intake.startingPowerConcept} onChange={(e) => updateIntake('startingPowerConcept', e.target.value)} placeholder="e.g., Qi Condensation Tier 1, Feng Shui Level 1..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Power Flavor</label>
              <input type="text" value={intake.powerFlavor} onChange={(e) => updateIntake('powerFlavor', e.target.value)} placeholder="e.g., Martial arts, Daoist, Demonic, Sword..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Known Ranks & Unique Path</label>
              <textarea value={intake.knownRanks} onChange={(e) => updateIntake('knownRanks', e.target.value)} rows={2} placeholder="Optional. If partial, AI will extrapolate a full wuxia/xianxia ladder." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2 resize-none" />
            </div>
          </div>
        </FormSection>

        <FormSection id="plot" title="5. Plot & Trope Control" icon={<Target size={18} />} activeSection={activeSection} setActiveSection={setActiveSection}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
             <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-1">Face-Slapping</label>
              <select value={intake.faceSlappingLevel} onChange={e => updateIntake('faceSlappingLevel', e.target.value)} className="w-full bg-void border border-neutral-800 text-signal text-sm rounded px-2 py-1.5 focus:outline-none">
                <option value="">AI Default</option><option value="High">High</option><option value="Moderate">Moderate</option><option value="Low">Low</option>
              </select>
            </div>
             <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-1">Romance / Harem</label>
              <select value={intake.romanceLevel} onChange={e => updateIntake('romanceLevel', e.target.value)} className="w-full bg-void border border-neutral-800 text-signal text-sm rounded px-2 py-1.5 focus:outline-none">
                <option value="">AI Default</option><option value="None">None</option><option value="Single">Single Heroine/Hero</option><option value="Harem">Harem</option>
              </select>
            </div>
             <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-1">Pacing</label>
              <select value={intake.powerPace} onChange={e => updateIntake('powerPace', e.target.value)} className="w-full bg-void border border-neutral-800 text-signal text-sm rounded px-2 py-1.5 focus:outline-none">
                <option value="">AI Default</option><option value="Fast">Fast</option><option value="Balanced">Balanced</option><option value="Slow">Slow</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Long-term Goal</label>
              <input type="text" value={intake.longTermGoal} onChange={(e) => updateIntake('longTermGoal', e.target.value)} placeholder="e.g., Shatter the heavens..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">First Major Conflict</label>
              <input type="text" value={intake.firstMajorConflict} onChange={(e) => updateIntake('firstMajorConflict', e.target.value)} placeholder="e.g., Sect tournament..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Must-Include Elements</label>
              <input type="text" value={intake.mustIncludeElements} onChange={(e) => updateIntake('mustIncludeElements', e.target.value)} placeholder="e.g., Hidden auction halls..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Things to Avoid</label>
              <input type="text" value={intake.thingsToAvoid} onChange={(e) => updateIntake('thingsToAvoid', e.target.value)} placeholder="e.g., No sci-fi logic..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
            </div>
          </div>
        </FormSection>

        {/* Generate Button */}
        <div className="pt-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
             <div className="flex flex-col">
              <label htmlFor="chapter-count" className="block font-sc text-[10px] text-neutral-500 uppercase tracking-widest mb-1">
                First Arc Chapters ({chapterCount})
              </label>
              <input
                id="chapter-count"
                type="range"
                min="5"
                max="10"
                value={chapterCount}
                onChange={(e) => setChapterCount(Number(e.target.value))}
                disabled={isGenerating}
                className="w-32 accent-portal bg-neutral-900 h-1 rounded-lg"
              />
            </div>
            <div className="hidden sm:block text-[10px] uppercase text-neutral-500 max-w-[200px] leading-tight">
              A deeper intake yields richer generated universes.
            </div>
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
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full" />
                <span>Weaving Destiny...</span>
              </>
            ) : (
              <><span>Generate World Blueprint</span><ArrowRight size={16} /></>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
