import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Cloud, ArrowRight } from 'lucide-react';
import { IntakeData, WorldBlueprint } from '../types';
import { useAppStore } from '../store/useAppStore';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { AGENTS } from '../lib/agents';

// Feature components
import { FormSectionId } from '../features/creation/components/FormSection';
import { CoreSeedForm } from '../features/creation/components/CoreSeedForm';
import { WorldSettingForm } from '../features/creation/components/WorldSettingForm';
import { CharacterSetupForm } from '../features/creation/components/CharacterSetupForm';
import { CustomCharactersForm } from '../features/creation/components/CustomCharactersForm';
import { CustomFactionsForm } from '../features/creation/components/CustomFactionsForm';
import { PowerSystemForm } from '../features/creation/components/PowerSystemForm';
import { PlotControlForm } from '../features/creation/components/PlotControlForm';
import { MakeItWorkForm } from '../features/creation/components/MakeItWorkForm';
import { ImportPanel } from '../features/creation/components/ImportPanel';
import { BlueprintReview } from '../features/creation/components/BlueprintReview';

import { PREMISE_SUGGESTIONS } from '../features/creation/constants';

interface CreationPortalProps {
  onStartStory: (intake: IntakeData, blueprint: WorldBlueprint, chapterCount: number) => Promise<void>;
  onGenerateBlueprint: (intake: IntakeData) => Promise<WorldBlueprint>;
  isGenerating: boolean;
  error: string | null;
}

const getRandomName = () => {
  const names = ['Ye Chen', 'Xiao Yan', 'Lin Dong', 'Wang Lin', 'Meng Hao', 'Bai Xiaochun', 'Su Ming', 'Li Qiye', 'Chu Feng', 'Ji Ning'];
  return names[Math.floor(Math.random() * names.length)];
};

export default function CreationPortal({ onStartStory, onGenerateBlueprint, isGenerating: isGeneratingProp, error }: CreationPortalProps) {
  const { isGenerating: storeIsGenerating, activeAgentId, currentUser } = useAppStore();
  const isGenerating = isGeneratingProp || storeIsGenerating;
  const [stage, setStage] = useState<'intake' | 'blueprint'>('intake');
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [blueprint, setBlueprint] = useState<WorldBlueprint | null>(null);
  const [chapterCount, setChapterCount] = useState(10);
  const [activeSection, setActiveSection] = useState<FormSectionId>('core');

  const [intake, setIntake] = useState<IntakeData>(() => ({
    novelTitle: '',
    mcName: getRandomName(),
    genrePath: 'Fate Survival',
    corePremise: PREMISE_SUGGESTIONS[0],
    desiredPlotDirection: '',
    storyTags: [],
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
    mcBio: '',
    customCharacters: [],
    customFactions: [],
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
    fatePressure: 'Balanced',
    makeItWorkInstruction: '',
  }));

  const updateIntake = (field: keyof IntakeData, value: any) => {
    setIntake(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleImport = (parsedBlueprint: WorldBlueprint) => {
    setBlueprint(parsedBlueprint);
    setStage('blueprint');
    setShowImportPanel(false);
  };

  const handleGenerateBlueprintClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating || useAppStore.getState().isGenerating) return;
    if (!intake.corePremise?.trim() || !intake.genrePath) return;
    try {
      const bp = await onGenerateBlueprint(intake);
      setBlueprint(bp);
      setStage('blueprint');
    } catch (err) {
      // Error handled in parent
    }
  };

  const handleStartStoryClick = async () => {
    if (isGenerating || useAppStore.getState().isGenerating) return;
    if (!blueprint) return;
    const cleanBlueprint = {
      ...blueprint,
      majorFactions: (blueprint.majorFactions || []).map(f => f.trim()).filter(Boolean),
      initialCharacters: (blueprint.initialCharacters || []).map(f => f.trim()).filter(Boolean),
      majorMysteries: (blueprint.majorMysteries || []).map(f => f.trim()).filter(Boolean),
      unresolvedPlotThreads: (blueprint.unresolvedPlotThreads || []).map(f => f.trim()).filter(Boolean),
    };
    await onStartStory(intake, cleanBlueprint, chapterCount);
  };

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto pb-20 pt-20 text-center" id="creation-portal-root">
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-signal tracking-tight mb-4">
          Authentication Required
        </h1>
        <p className="font-sans font-light text-neutral-400 text-sm mx-auto leading-relaxed mb-8">
          You must link your spirit to the matrix before forging a new destiny. Anonymous creation is sealed to prevent celestial authorization breaches.
        </p>
        <button
           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleLogin}
          className="font-sc px-8 py-3 rounded text-sm uppercase tracking-widest font-bold inline-flex items-center space-x-2 bg-human text-signal border border-human hover:bg-void hover:text-human hover:border-human shadow-[0_0_15px_rgba(139,0,0,0.3)] transition-all"
        >
          <Cloud size={18} />
          <span>Sync Spirit (Sign In)</span>
        </button>
      </div>
    );
  }

  if (stage === 'blueprint' && blueprint) {
    return (
      <BlueprintReview
        blueprint={blueprint}
        setBlueprint={setBlueprint}
        onBack={() => setStage('intake')}
        onStartStory={handleStartStoryClick}
        isGenerating={isGenerating}
      />
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
        <p className="font-sans font-light text-neutral-400 text-sm max-w-xl mx-auto leading-relaxed mb-6">
          Provide as much or as little detail as you want. Empty fields will be intelligently extrapolated using Chinese light-novel logic. We will first generate a World Blueprint for your review.
        </p>

        {/* Import Trigger Button */}
        <div className="flex justify-center">
          <button
            type="button"
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowImportPanel(!showImportPanel)}
            className="font-sc px-5 py-2.5 rounded text-xs uppercase tracking-widest font-bold flex items-center space-x-2 bg-neutral-950 text-portal border border-neutral-900 hover:border-portal hover:bg-portal/5 transition-all shadow-[0_0_12px_rgba(4,172,255,0.05)] cursor-pointer"
          >
            <Copy size={14} />
            <span>Import World Seed / Blueprint</span>
          </button>
        </div>
      </div>

      <ImportPanel 
        show={showImportPanel} 
        onClose={() => setShowImportPanel(false)} 
        onImport={handleImport} 
      />

      <form onSubmit={handleGenerateBlueprintClick} className="space-y-4">
        <CoreSeedForm intake={intake} updateIntake={updateIntake} activeSection={activeSection} setActiveSection={setActiveSection} />
        <WorldSettingForm intake={intake} updateIntake={updateIntake} activeSection={activeSection} setActiveSection={setActiveSection} />
        <CharacterSetupForm intake={intake} updateIntake={updateIntake} activeSection={activeSection} setActiveSection={setActiveSection} />
        <CustomCharactersForm intake={intake} updateIntake={updateIntake} activeSection={activeSection} setActiveSection={setActiveSection} />
        <CustomFactionsForm intake={intake} updateIntake={updateIntake} activeSection={activeSection} setActiveSection={setActiveSection} />
        <PowerSystemForm intake={intake} updateIntake={updateIntake} activeSection={activeSection} setActiveSection={setActiveSection} />
        <PlotControlForm intake={intake} updateIntake={updateIntake} activeSection={activeSection} setActiveSection={setActiveSection} />
        <MakeItWorkForm intake={intake} updateIntake={updateIntake} activeSection={activeSection} setActiveSection={setActiveSection} />

        {error && (
          <div className="bg-red-900/20 border border-red-900 text-red-200 p-4 rounded text-sm text-center">
            {error}
          </div>
        )}

        <div className="flex justify-end pt-8">
          <button
            type="submit"
            disabled={isGenerating || !intake.corePremise?.trim()}
            className="font-sc px-8 py-4 rounded text-sm uppercase tracking-widest font-bold inline-flex items-center space-x-2 bg-human text-signal border border-human hover:bg-void hover:text-human hover:border-human shadow-[0_0_15px_rgba(139,0,0,0.3)] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isGenerating ? (
              <>
                {activeAgentId === 'versa' ? (
                  <img src={AGENTS.VERSA.logoUrl} className="w-5 h-5 object-contain animate-pulse" alt="VERSA" />
                ) : (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full" />
                )}
                <span>{activeAgentId === 'versa' ? 'VERSA is drafting...' : 'Generating Blueprint...'}</span>
              </>
            ) : (
              <>
                <span>Forge World Blueprint</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
