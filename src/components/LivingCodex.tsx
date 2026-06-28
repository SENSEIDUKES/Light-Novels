import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Network, Zap, Sword, 
  MapPin, ShieldAlert, 
  Compass, 
  BookMarked, Activity, History
} from 'lucide-react';
import { vibrate } from '../lib/vibration';
import { StoryMemory, Character, StoryArc, StoryWorld, Chapter, MultiModelRouting, GeneratedImage } from '../types';
import { secureStorage } from '../lib/encryption';
import { CodexProvider } from './codex/CodexContext';
import { LivingCodexCollage } from './codex/LivingCodexCollage';
import { LivingCodexCharacters } from './codex/LivingCodexCharacters';
import { LivingCodexRelations } from './codex/LivingCodexRelations';
import { LivingCodexPower } from './codex/LivingCodexPower';
import { LivingCodexGlossary } from './codex/LivingCodexGlossary';
import { LivingCodexMysteries } from './codex/LivingCodexMysteries';
import { LivingCodexTimeline } from './codex/LivingCodexTimeline';
import { LivingCodexArtifacts } from './codex/LivingCodexArtifacts';
import { LivingCodexFactions } from './codex/LivingCodexFactions';
import { LivingCodexDashboards } from './codex/LivingCodexDashboards';
import { LivingCodexFate } from './codex/LivingCodexFate';
import { DestinyChoicePanel } from './DestinyChoicePanel';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { checkAndConsumeImageQuota } from '../lib/quota';

interface LivingCodexProps {
  memory: StoryMemory;
  arcs: StoryArc[];
  onUpdateMemory: (updatedMemory: StoryMemory) => void;
  mcName: string;
  onJumpToChapter?: (chapterNumber: number) => void;
  onSwitchTab?: (tab: 'reader' | 'codex' | 'memory') => void;
  activeStory: StoryWorld;
  onUpdateStory: (updatedStory: StoryWorld) => void;
  routingConfig?: MultiModelRouting;
}

// 1. Static high-fidelity Chinese cultivation vocabulary (Glossary defaults)


export default function LivingCodex({ 
  memory: rawMemory = {} as StoryMemory, 
  arcs = [], 
  onUpdateMemory, 
  mcName = 'Main Character', 
  onJumpToChapter, 
  onSwitchTab,
  activeStory,
  onUpdateStory,
  routingConfig
}: LivingCodexProps) {
  const memory = {
    ...rawMemory,
    characters: rawMemory.characters || [],
    unresolvedPlotThreads: rawMemory.unresolvedPlotThreads || [],
    resolvedPlotThreads: rawMemory.resolvedPlotThreads || [],
    worldRules: rawMemory.worldRules || [],
    memoryWarnings: rawMemory.memoryWarnings || [],
    factions: rawMemory.factions || [],
    locations: rawMemory.locations || [],
    artifacts: rawMemory.artifacts || [],
    abilities: rawMemory.abilities || []
  };

  const [activePage, setActivePage] = useState<'portraits' | 'karma' | 'power' | 'artifacts' | 'fate' | 'lore'>('portraits');
  
  // Selection state for node inspection in Relationship Map & other grids
  const [selectedNodeChar, setSelectedNodeChar] = useState<Character | null>(null);

  // Toggle for Deep Memory / Dormant elements
  const [showDeepMemory, setShowDeepMemory] = useState(false);
  const [codexNotification, setCodexNotification] = useState<string | null>(null);
  const [selectedChartCharId, setSelectedChartCharId] = useState<string>('');
    
  useEffect(() => {
    if (!selectedChartCharId && memory.characters && memory.characters.length > 0) {
      setSelectedChartCharId(memory.characters[0].id);
    }
  }, [memory.characters, selectedChartCharId]);
  
  // Flatten written chapters with arc details for virtualized listing
  const flatChapters = useMemo(() => {
    const list: Array<{
      chapter: Chapter;
      arcTitle: string;
      arcIndex: number;
      isFirstInArc: boolean;
    }> = [];
    
    arcs.forEach((arc, aIdx) => {
      const written = (arc.chapters || []).filter(ch => ch.hasContent || !!ch.generatedContent);
      written.forEach((ch, cIndex) => {
        list.push({
          chapter: ch,
          arcTitle: arc.title || `Arc Vol ${aIdx + 1}`,
          arcIndex: aIdx,
          isFirstInArc: cIndex === 0,
        });
      });
    });
    
    return list;
  }, [arcs]);
  
  const powerTimeline = useMemo(() => {
    const list: Array<{
      chapterNumber: number;
      title: string;
      score: number;
      stageName: string;
      breakthrough: boolean;
      summary?: string;
      cuePayload?: any;
    }> = [];

    flatChapters.forEach((fc, idx) => {
      const ch = fc.chapter;
      let stageName = memory.currentPowerStage || 'Qi Condensation';
      
      const finalScoreRef = getPowerRankScore(memory.currentPowerStage).score;
      const initialScoreRef = 15;
      
      const text = `${ch.statsChangeMessage || ''} ${ch.summary || ''} ${ch.title || ''}`.toLowerCase();
      let estScore = initialScoreRef;
      let breakthrough = false;

      if (text.includes('nascent soul') || text.includes('nascent')) {
        estScore = 85;
        stageName = 'Nascent Soul';
        breakthrough = true;
      } else if (text.includes('core formation') || text.includes('grandmaster')) {
        estScore = 70;
        stageName = 'Core Formation';
        breakthrough = true;
      } else if (text.includes('foundation') || text.includes('establishment')) {
        estScore = 55;
        stageName = 'Foundation Establishment';
        breakthrough = true;
      } else if (text.includes('tier 7') || text.includes('tier 8') || text.includes('tier 9') || text.includes('tier 10')) {
        estScore = 45;
        stageName = 'Qi Refining Late Stage';
        breakthrough = true;
      } else if (text.includes('tier 4') || text.includes('tier 5') || text.includes('tier 6')) {
        estScore = 32;
        stageName = 'Qi Refining Mid Stage';
        breakthrough = true;
      } else if (text.includes('tier 1') || text.includes('tier 2') || text.includes('tier 3')) {
        estScore = 20;
        stageName = 'Qi Refining Early Stage';
      } else {
        const ratio = flatChapters.length > 1 ? idx / (flatChapters.length - 1) : 1;
        estScore = Math.round(initialScoreRef + (finalScoreRef - initialScoreRef) * ratio);
      }

      if (ch.cuePayload?.powerShift) {
        estScore += ch.cuePayload.powerShift;
        breakthrough = true;
      }

      list.push({
        chapterNumber: ch.number,
        title: ch.title,
        score: Math.min(100, Math.max(10, estScore)),
        stageName: stageName,
        breakthrough,
        summary: ch.summary || ch.statsChangeMessage || 'Sensing gradual increase in raw spiritual reserves.',
        cuePayload: ch.cuePayload
      });
    });

    return list;
  }, [flatChapters, memory.currentPowerStage]);

  const affinityTimelineOfChar = useMemo(() => {
    if (!selectedChartCharId) return [];
    const char = memory.characters.find(c => c.id === selectedChartCharId);
    if (!char) return [];

    const bond = activeStory.relationships?.find(
      r => r.sourceCharId === selectedChartCharId || r.targetCharId === selectedChartCharId
    );
    const targetAffinity = bond ? bond.affinity : 0;

    const relString = (char.relationshipToMC || '').toLowerCase();
    const startAff = relString.includes('hostil') || relString.includes('enemy')
      ? -45
      : relString.includes('friend') || relString.includes('ally') || relString.includes('mentor')
      ? 35
      : 0;

    const list: Array<{
      chapterNumber: number;
      title: string;
      affinity: number;
      eventSummary: string;
      hasInteraction: boolean;
    }> = [];

    const total = flatChapters.length;
    flatChapters.forEach((fc, idx) => {
      const ch = fc.chapter;
      const text = `${ch.generatedContent || ''} ${ch.summary || ''} ${ch.title || ''}`.toLowerCase();
      const hasInteraction = text.includes((char.name || '').toLowerCase());

      let baseInterpolated = startAff;
      if (total > 1) {
        baseInterpolated = startAff + (targetAffinity - startAff) * (idx / (total - 1));
      } else {
        baseInterpolated = targetAffinity;
      }

      let spike = 0;
      if (hasInteraction) {
        if (text.includes('attack') || text.includes('clash') || text.includes('betray') || text.includes('wound') || text.includes('mock')) {
          spike = -15;
        } else if (text.includes('save') || text.includes('trust') || text.includes('help') || text.includes('gift') || text.includes('reconcile')) {
          spike = 15;
        } else {
          spike = 5;
        }
      }

      const affinityVal = Math.min(100, Math.max(-100, Math.round(baseInterpolated + spike)));

      let summary = `${char.name} was not present in this chapter of the saga.`;
      if (hasInteraction) {
        if (spike < 0) {
          summary = `Hostility sparked: ${char.name} engaged in a tense conflict or clash of perspectives with ${mcName}.`;
        } else if (spike > 0) {
          summary = `Bonds strengthened: ${char.name} and ${mcName} shared an exchange of trust, assistance, or mutual protection.`;
        } else {
          summary = `${char.name} appeared, their active karma threads vibrating inside the chapter narrative.`;
        }
      }

      list.push({
        chapterNumber: ch.number,
        title: ch.title,
        affinity: affinityVal,
        eventSummary: summary,
        hasInteraction
      });
    });

    return list;
  }, [selectedChartCharId, flatChapters, memory.characters, activeStory.relationships, mcName]);

  const pushNotification = (msg: string) => {
    setCodexNotification(msg);
    setTimeout(() => setCodexNotification(null), 3000);
  };

  

  const handleDeleteCustomRelationship = (bondId: string) => {
    const currentBonds = activeStory.relationships || [];
    const currentActiveStory = useAppStore.getState().stories.find(s => s.id === activeStory.id) || activeStory;
    onUpdateStory({
      ...currentActiveStory,
      relationships: currentBonds.filter(b => b.id !== bondId)
    });
  };

  

  

  const handleDeleteFateNode = (fateId: string) => {
    const currentNodes = activeStory.karmaNodes || [];
    const currentActiveStory = useAppStore.getState().stories.find(s => s.id === activeStory.id) || activeStory;
    onUpdateStory({
      ...currentActiveStory,
      karmaNodes: currentNodes.filter(n => n.id !== fateId)
    });
  };

  // Active sub-navigation for Characters ("Detailed list" vs "Illustrated Canvas Cards")
  
  // Interactive state for visual generation triggers
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, { urls: string[], prompt: string, selectedIndex: number, type: 'character' | 'location' | 'artifact' | 'beast' }>>({});

  // Form states primitive handlers
  

  

  

  const getPowerStageLevel = (stageName?: string) => {
    // dummy helper if not defined elsewhere
    return { score: 1, title: stageName || '' };
  };

  

  // Local state for direct editing of Character abilities / power
  

  const [deletePrompt, setDeletePrompt] = useState<{
    id: string;
    type: 'faction' | 'artifact' | 'location' | 'relationship' | 'fate' | 'character' | 'memory';
    name?: string;
  } | null>(null);
  const [deleteInput, setDeleteInput] = useState('');

  

  

  // Assign numeric power rankings based on parsed cultivation stages
  function getPowerRankScore(powerStr: string | undefined): { score: number, title: string } {
    if (!powerStr) return { score: 10, title: 'Mortal Tier' };
    const p = powerStr.toLowerCase();
    
    if (p.includes('primordial') || p.includes('sovereign') || p.includes('god') || p.includes('ancestor') || p.includes('immortal emperor') || p.includes('grade 10') || p.includes('tier 10')) {
      return { score: 100, title: 'Primordial Sovereignty' };
    }
    if (p.includes('nascent') || p.includes('saint') || p.includes('sss') || p.includes('tribulation') || p.includes('grade 9') || p.includes('grade 8')) {
      return { score: 85, title: 'Nascent Saint Ascendancy' };
    }
    if (p.includes('formation') || p.includes('grandmaster') || p.includes('rank a') || p.includes('grade 6') || p.includes('grade 7')) {
      return { score: 70, title: 'Core Formation Grandmaster' };
    }
    if (p.includes('foundation') || p.includes('establishment') || p.includes('master') || p.includes('grade 4') || p.includes('grade 5')) {
      return { score: 55, title: 'Foundation Establishment' };
    }
    if (p.includes('qi') || p.includes('refining') || p.includes('condensation') || p.includes('disciple') || p.includes('grade 2') || p.includes('grade 3')) {
      return { score: 35, title: 'Qi Refining Tier' };
    }
    if (p.includes('crippled') || p.includes('mortal') || p.includes('disabled') || p.includes('grade 1')) {
      return { score: 12, title: 'Mortal Meridian Blockade' };
    }
    return { score: 40, title: 'Spiritual Adept' };
  }

  // Generate Image Card API trigger
  const handleRevertImage = (id: string, type: string, newUrl: string) => {
    let finalMemory = { ...memory };
    if (type === 'character' || type === 'beast') {
      const updated = memory.characters.map(c => c.id === id ? { ...c, imageUrl: newUrl } : c);
      finalMemory = { ...memory, characters: updated };
    } else if (type === 'location') {
      const updated = (memory.locations || []).map(l => l.id === id ? { ...l, imageUrl: newUrl } : l);
      finalMemory = { ...memory, locations: updated };
    } else if (type === 'artifact') {
      const updated = (memory.artifacts || []).map(a => a.id === id ? { ...a, imageUrl: newUrl } : a);
      finalMemory = { ...memory, artifacts: updated };
    }

    const updatedStoryHistory = activeStory.imageHistory ? activeStory.imageHistory.map(img => {
      if (img.entityId === id) {
        return { ...img, isCurrent: img.imageUrl === newUrl };
      }
      return img;
    }) : [];

    const currentActiveStory = useAppStore.getState().stories.find(s => s.id === activeStory.id) || activeStory;
    onUpdateStory({
      ...currentActiveStory,
      memory: finalMemory,
      imageHistory: updatedStoryHistory
    });
  };

  const renderImageHistoryGallery = (entityId: string, type: 'character' | 'location' | 'artifact' | 'beast', imageHistory: any[] | undefined) => {
    if (!imageHistory || imageHistory.length <= 1) return null;
    return (
      <div className="flex space-x-1 overflow-x-auto p-1.5 bg-neutral-950/80 custom-scrollbar border-b border-neutral-900 absolute top-0 w-full z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {imageHistory.map((img) => (
          <div 
            key={img.id} 
            className="relative flex-shrink-0 w-8 h-8 rounded-sm overflow-hidden border border-neutral-800 cursor-pointer hover:border-portal transition-colors shadow-lg" 
            onClick={() => handleRevertImage(entityId, type, img.imageUrl)}
            title={`Generated at Chapter ${img.chapterNumber || 'Unknown'}\nPrompt: ${img.promptUsed}`} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRevertImage(entityId, type, img.imageUrl); } }}
          >
            <img src={img.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
          </div>
        ))}
      </div>
    );
  };
  const handleAwakenCardImage = async (
    id: string, 
    type: 'character' | 'location' | 'artifact' | 'beast', 
    entity: any
  ) => {
    setGeneratingId(id);
    setGenerationError(null);

    const styleConfig = activeStory.blueprint?.styleBible || "Chinese light novel world aesthetic, xianxia / wuxia fantasy illustration, cinematic, mystical, premium webnovel art.";

    let targetPrompt = "";
    if (type === 'character') {
      targetPrompt = `Character image. Name: ${entity.name}. Visual description: ${entity.description}. Role: ${entity.role}. Current state/status: ${entity.status}. Power level / aura: ${entity.powerLevel || 'Unknown'}. Shared visual style: ${styleConfig}.`;
    } else if (type === 'beast') {
      targetPrompt = `Beast image. Name: ${entity.name}. Species/Type: ${entity.beastProfile?.bodyType || 'Unknown Beast'}. Visual description: ${entity.description}. Evolution state/Threat Tier: ${entity.beastProfile?.threatTier || 'Unknown'}. Aura / element style: ${entity.beastProfile?.element || 'Unknown'}. Shared visual style: ${styleConfig}.`;
    } else if (type === 'location') {
      targetPrompt = `Location image. Name: ${entity.name}. Visual description: ${entity.description}. Realm/Zone type: ${entity.realm || 'Unknown'}. Atmosphere/Safety: ${entity.safetyLevel || 'Unknown'}. Shared visual style: ${styleConfig}.`;
    } else if (type === 'artifact') {
      targetPrompt = `Artifact image. Name: ${entity.name}. Visual description: ${entity.description}. Tier/Rarity: ${entity.tier || 'Unknown'}. Aura/Energy style: visually striking. Shared visual style: ${styleConfig}.`;
    }

    try {
      const userProfile = useAppStore.getState().userProfile;
      const isHubStory = activeStory?.id ? (
        activeStory.id.startsWith('demo-matrix-') || 
        activeStory.id.startsWith('challenge-') || 
        activeStory.id.includes('demo-matrix-') || 
        activeStory.id.includes('challenge-')
      ) : false;
      const isFreeUser = !userProfile || !userProfile.premiumTier || userProfile.premiumTier === 'mortal';
      if (isFreeUser && isHubStory) {
        pushNotification("Ascend to the Inner Sect to customize hub story visual representations!");
        throw new Error("Mortal tier users cannot customize the original codex of hub stories.");
      }

      await checkAndConsumeImageQuota();

      const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const gemini = await secureStorage.getItem('@seihouse/api-key-gemini');
      const openrouter = await secureStorage.getItem('@seihouse/api-key-openrouter');
      const ollama = await secureStorage.getItem('@seihouse/api-key-ollama-host');
      if (gemini) apiHeaders['x-gemini-key'] = gemini;
      if (openrouter) apiHeaders['x-openrouter-key'] = openrouter;
      if (ollama) apiHeaders['x-ollama-host'] = ollama;

      const res = await fetch('/api/generate-card-image', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ prompt: targetPrompt, type, routingConfig })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Aetherial alignment gate failed to synchronize imagery.");
      }

      let newImageUrls = data.imageUrls;
      if (!newImageUrls && data.imageUrl) newImageUrls = [data.imageUrl];
      if (!newImageUrls && data.fallbackUrl) newImageUrls = [data.fallbackUrl];

      if (newImageUrls && newImageUrls.length > 0) {
        setPreviews(prev => ({ ...prev, [id]: { urls: newImageUrls, prompt: targetPrompt, selectedIndex: 0, type } }));
      } else {
        throw new Error("No imagery frames returned.");
      }

    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "Failed to trigger visual aura synthesis.");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleSaveEvolution = (id: string, type: 'character' | 'location' | 'artifact' | 'beast') => {
    const preview = previews[id];
    if (!preview) return;

    const selectedUrl = preview.urls[preview.selectedIndex];

    const newHistoryItem: GeneratedImage = {
      id: Math.random().toString(36).substring(2, 10),
      entityId: id,
      entityType: type,
      imageUrl: selectedUrl,
      promptUsed: preview.prompt,
      createdAt: new Date().toISOString(),
      isCurrent: true,
      chapterNumber: activeStory.currentChapterNumber
    };

    const currentStoryHistory = activeStory.imageHistory || [];
    const updatedStoryHistory: GeneratedImage[] = currentStoryHistory
      .map(img => img.entityId === id ? { ...img, isCurrent: false } : img)
      .concat(newHistoryItem);

    let finalMemory = { ...memory };

    if (type === 'character' || type === 'beast') {
      const updated = memory.characters.map(c => 
        c.id === id ? { ...c, imageUrl: selectedUrl, evolutionReady: false, availableVisualUpdate: false, lastImageChapter: activeStory.currentChapterNumber } : c
      );
      finalMemory = { ...memory, characters: updated };
    } else if (type === 'location') {
      const updated = (memory.locations || []).map(l => 
        l.id === id ? { ...l, imageUrl: selectedUrl, evolutionReady: false, availableVisualUpdate: false, lastImageChapter: activeStory.currentChapterNumber } : l
      );
      finalMemory = { ...memory, locations: updated };
    } else if (type === 'artifact') {
      const updated = (memory.artifacts || []).map(a => 
        a.id === id ? { ...a, imageUrl: selectedUrl, evolutionReady: false, availableVisualUpdate: false, lastImageChapter: activeStory.currentChapterNumber } : a
      );
      finalMemory = { ...memory, artifacts: updated };
    }

    const currentActiveStory = useAppStore.getState().stories.find(s => s.id === activeStory.id) || activeStory;
    onUpdateStory({
      ...currentActiveStory,
      memory: finalMemory,
      imageHistory: updatedStoryHistory
    });

    setPreviews(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    pushNotification("Evolution successfully bonded to entity record.");
  };

  const handleDiscardPreview = (id: string) => {
    setPreviews(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Action: Add Faction
  

  // Action: Delete Faction
  const handleDeleteFaction = (id: string) => {
    const currentFactions = memory.factions || [];
    onUpdateMemory({
      ...memory,
      factions: currentFactions.filter(f => f.id !== id)
    });
  };

  // Action: Add Artifact
  

  // Action: Delete Artifact
  const handleDeleteArtifact = (id: string) => {
    const currentArtifacts = memory.artifacts || [];
    onUpdateMemory({
      ...memory,
      artifacts: currentArtifacts.filter(a => a.id !== id)
    });
  };

  // Action: Add Location
  



  // Action: Delete Location
  const handleDeleteLocation = (id: string) => {
    const currentLocations = memory.locations || [];
    onUpdateMemory({
      ...memory,
      locations: currentLocations.filter(l => l.id !== id)
    });
  };

  // Action: Add MC Ability
  

  // Action: Delete MC Ability
  

  // Action: Save character edit overlay content
  

  
  const activePreviewId = Object.keys(previews)[0];
  const activePreview = activePreviewId ? previews[activePreviewId] : null;

  // Memory Temperature Filtering
  const allChars = memory.characters || [];
  const dormantChars = allChars.filter(c => c.relevanceState === 'dormant' || c.relevanceState === 'archived');
  const charsToRender = showDeepMemory ? allChars : allChars.filter(c => !c.relevanceState || c.relevanceState === 'active' || c.relevanceState === 'warm' || c.relevanceState === 'reactivated');

  const allLocs = memory.locations || [];
  const dormantLocs = allLocs.filter(l => l.relevanceState === 'dormant' || l.relevanceState === 'archived');
  const locationsToRender = showDeepMemory ? allLocs : allLocs.filter(l => !l.relevanceState || l.relevanceState === 'active' || l.relevanceState === 'warm' || l.relevanceState === 'reactivated');

  const allFactions = memory.factions || [];
  const dormantFactions = allFactions.filter(f => f.relevanceState === 'dormant' || f.relevanceState === 'archived');
  const factionsToRender = showDeepMemory ? allFactions : allFactions.filter(f => !f.relevanceState || f.relevanceState === 'active' || f.relevanceState === 'warm' || f.relevanceState === 'reactivated');

  const allArtifacts = memory.artifacts || [];
  const dormantArtifacts = allArtifacts.filter(a => a.relevanceState === 'dormant' || a.relevanceState === 'archived');
  const artifactsToRender = showDeepMemory ? allArtifacts : allArtifacts.filter(a => !a.relevanceState || a.relevanceState === 'active' || a.relevanceState === 'warm' || a.relevanceState === 'reactivated');

  const hasDormantState = dormantChars.length > 0 || dormantLocs.length > 0 || dormantFactions.length > 0 || dormantArtifacts.length > 0;

  return (
    <CodexProvider value={{     memory,
    arcs,
    activeStory,
    mcName,
    routingConfig,
    onUpdateMemory,
    onUpdateStory,
    pushNotification,
    getPowerRankScore,
    handleAwakenCardImage,
    previews,
    setPreviews,
    generatingId,
    renderImageHistoryGallery }}>
      <div className="bg-black border border-neutral-900 rounded-lg p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row gap-6 relative min-h-[690px] overflow-hidden" id="living-codex-container">
      <DestinyChoicePanel 
        isOpen={!!activePreview}
        imageUrls={activePreview?.urls || []}
        selectedIndex={activePreview?.selectedIndex || 0}
        onSelect={(index) => activePreviewId && setPreviews(prev => ({ ...prev, [activePreviewId]: { ...prev[activePreviewId], selectedIndex: index } }))}
        onApply={() => activePreviewId && handleSaveEvolution(activePreviewId, previews[activePreviewId].type)}
        onDiscard={() => activePreviewId && handleDiscardPreview(activePreviewId)}
        title="Evolution Preview"
        subtitle="Choose the form that will be bound to the Living Codex."
      />
      
      {/* Dynamic Portal aura line */}
      <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-portal via-human to-portal"></div>

      {codexNotification && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-neutral-900 border border-portal text-portal px-4 py-2 rounded shadow-2xl font-sc text-xs animate-fadeIn">
          {codexNotification}
        </div>
      )}

      {/* SIDEBAR NAVIGATION PAGES */}
      <div className="w-full md:w-60 flex-shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-neutral-900 pb-2 md:pb-0 md:pr-4" id="codex-side-nav">
        <div className="mb-2 md:mb-4">
          <span className="text-[9px] text-portal uppercase font-bold tracking-[0.2em] font-sc block">Divine Registry</span>
          <h2 className="font-display font-medium text-lg md:text-xl text-signal tracking-wider mt-0.5 flex items-center space-x-2">
            <span>The Living Codex</span>
          </h2>
          <p className="text-[10px] text-neutral-500 font-sans tracking-tight mt-1 leading-relaxed hidden md:block">
            Distilling structural power-charts, fate karma, spatial domains, and relational trees.
          </p>
        </div>

        {/* HORIZONTAL TABS ON MOBILE / VERTICAL SIDEBAR ON DESKTOP */}
        <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 gap-1.5 md:gap-1.5 md:space-y-1.5 no-scrollbar whitespace-nowrap w-full" id="codex-tab-scroller">
          {/* Portraits Link */}
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => { vibrate('softTap'); setActivePage('portraits'); }}
            className={`flex items-center space-x-2 md:space-x-3 px-4 py-2.5 md:px-3 md:py-2.5 rounded text-[10px] md:text-[11px] tracking-wider transition-all font-sc uppercase flex-shrink-0 ${
              activePage === 'portraits' 
                ? 'bg-neutral-950 text-signal border border-neutral-850 shadow shadow-portal/10' 
                : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-950/40'
            }`}
          >
            <Users size={14} className={activePage === 'portraits' ? 'text-human' : ''} />
            <span>Portraits</span>
          </button>

          {/* Karma Link */}
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
              vibrate('softTap');
              setActivePage('karma');
              setSelectedNodeChar(null);
            }}
            className={`flex items-center space-x-2 md:space-x-3 px-4 py-2.5 md:px-3 md:py-2.5 rounded text-[10px] md:text-[11px] tracking-wider transition-all font-sc uppercase flex-shrink-0 ${
              activePage === 'karma' 
                ? 'bg-neutral-950 text-signal border border-neutral-850 shadow shadow-portal/10' 
                : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-950/40'
            }`}
          >
            <Network size={14} className={activePage === 'karma' ? 'text-portal' : ''} />
            <span>Karma</span>
          </button>

          {/* Power Rankings Link */}
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => { vibrate('softTap'); setActivePage('power'); }}
            className={`flex items-center space-x-2 md:space-x-3 px-4 py-2.5 md:px-3 md:py-2.5 rounded text-[10px] md:text-[11px] tracking-wider transition-all font-sc uppercase flex-shrink-0 ${
              activePage === 'power' 
                ? 'bg-neutral-950 text-signal border border-neutral-850 shadow shadow-portal/10' 
                : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-950/40'
            }`}
          >
            <Zap size={14} className={activePage === 'power' ? 'text-yellow-500' : ''} />
            <span>Power Rankings</span>
          </button>

          {/* Artifacts Gallery Link */}
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => { vibrate('softTap'); setActivePage('artifacts'); }}
            className={`flex items-center space-x-2 md:space-x-3 px-4 py-2.5 md:px-3 md:py-2.5 rounded text-[10px] md:text-[11px] tracking-wider transition-all font-sc uppercase flex-shrink-0 ${
              activePage === 'artifacts' 
                ? 'bg-neutral-950 text-signal border border-neutral-850 shadow shadow-portal/10' 
                : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-950/40'
            }`}
          >
            <Sword size={14} className={activePage === 'artifacts' ? 'text-orange-500' : ''} />
            <span>Artifacts</span>
          </button>

          {/* Fate Panel Link */}
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => { vibrate('softTap'); setActivePage('fate'); }}
            className={`flex items-center space-x-2 md:space-x-3 px-4 py-2.5 md:px-3 md:py-2.5 rounded text-[10px] md:text-[11px] tracking-wider transition-all font-sc uppercase flex-shrink-0 ${
              activePage === 'fate' 
                ? 'bg-neutral-950 text-signal border border-neutral-850 shadow shadow-portal/10' 
                : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-950/40'
            }`}
          >
            <Compass size={14} className={activePage === 'fate' ? 'text-green-400' : ''} />
            <span>Fate</span>
          </button>

          {/* Lore Link */}
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => { vibrate('softTap'); setActivePage('lore'); }}
            className={`flex items-center space-x-1.5 md:space-x-3 px-3 py-1.5 md:py-2.5 rounded text-[10px] md:text-[11px] tracking-wider transition-all font-sc uppercase flex-shrink-0 ${
              activePage === 'lore' 
                ? 'bg-neutral-950 text-signal border border-neutral-850 shadow shadow-portal/10' 
                : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-950/40'
            }`}
          >
            <BookMarked size={12} className={activePage === 'lore' ? 'text-purple-400' : ''} />
            <span>Lore</span>
          </button>

          {/* Back navigation shortcut in horizontal list on mobile */}
          {onSwitchTab && onJumpToChapter && (
            <button
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => onSwitchTab('reader')}
              className="flex sm:hidden items-center space-x-1.5 px-3 py-1.5 rounded text-[10px] tracking-wider font-mono uppercase bg-void text-portal border border-portal/20 flex-shrink-0"
            >
              <span>← Reader</span>
            </button>
          )}
        </div>

        {/* Deep Memory Controls */}
        <div className="pt-4 border-t border-neutral-900 mt-4 hidden sm:block">
           <button
              tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowDeepMemory(!showDeepMemory)}
             className={`w-full flex items-center justify-between px-3 py-2 rounded text-[10px] font-mono tracking-wider transition-all border ${
               showDeepMemory
                 ? 'bg-portal/10 border-portal text-portal shadow-sm shadow-portal/20'
                 : 'bg-void border-neutral-900 text-neutral-500 hover:text-portal hover:border-portal'
             }`}
           >
             <span className="flex items-center gap-1.5 uppercase">
               <History size={12} />
               Deep Memory
             </span>
             {hasDormantState && (
               <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                 showDeepMemory ? 'bg-portal text-void' : 'bg-neutral-900 text-neutral-400'
               }`}>
                 {(dormantChars.length + dormantLocs.length + dormantFactions.length + dormantArtifacts.length)} Dormant
               </span>
             )}
           </button>
           <p className="mt-2 text-[8.5px] text-neutral-500 font-sans px-2 text-center italic">
             Toggle to unearth inactive karma threads, domains, and ancient artifacts.
           </p>
        </div>

        {/* Back navigation shortcut to active script reading (Desktop Only) */}
        {onSwitchTab && onJumpToChapter && (
          <div className="pt-4 border-t border-neutral-900 mt-4 hidden sm:block">
            <button
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                onSwitchTab('reader');
              }}
              className="w-full py-2 bg-void text-portal border border-portal/20 hover:border-portal/40 rounded text-[10px] uppercase font-mono tracking-widest flex items-center justify-center space-x-1"
            >
              <span>← Back to Script</span>
            </button>
          </div>
        )}

        {/* Map Pin Locations Indicator */}
        <div className="pt-4 border-t border-neutral-900 mt-auto hidden md:block">
          <div className="p-3 bg-neutral-950/80 border border-neutral-900 rounded text-[10px] space-y-1.5 leading-normal">
            <span className="text-portal tracking-widest font-sc font-bold uppercase flex items-center space-x-1">
              <MapPin size={10} className="text-portal animate-bounce" />
              <span>Dimensional Node</span>
            </span>
            <div className="text-neutral-400 font-sans">
              Linked to Han Feng's physical location of resonance inside the active Scripture timeline.
            </div>
          </div>
        </div>
      </div>

      {/* MAIN DYNAMIC CONTENT SPACE */}
      <div className="flex-1 overflow-y-auto px-1 max-h-[660px]" id="codex-main-display">
        
        {/* Error notification banner if image generation etc fails */}
        {generationError && (
          <div className="mb-4 p-3 bg-human/15 border border-human/30 rounded text-[11px] text-neutral-300 font-sans flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <ShieldAlert size={14} className="text-human" />
              <span>{generationError}</span>
            </span>
            <button  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setGenerationError(null)} className="text-neutral-500 hover:text-neutral-300 font-bold">×</button>
          </div>
        )}

        {/* Memory Linter Soft Warnings */}
        {memory.memoryWarnings && memory.memoryWarnings.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-950/20 border border-yellow-900/50 rounded space-y-2">
            <h4 className="flex items-center space-x-2 text-yellow-600 text-xs font-sc font-bold uppercase tracking-widest">
              <Activity size={12} />
              <span>Continuity Alerts ({memory.memoryWarnings.length})</span>
            </h4>
            <div className="space-y-1">
              {memory.memoryWarnings.map((warning, idx) => (
                <div key={idx} className="flex space-x-2 text-[10px] sm:text-xs text-neutral-400 font-sans group items-start justify-between">
                  <div className="flex space-x-2 flex-1">
                    <span className="text-yellow-600/70 mt-0.5">•</span>
                    <span>{warning}</span>
                  </div>
                  <button 
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                      const updatedWarnings = [...(memory.memoryWarnings || [])];
                      updatedWarnings.splice(idx, 1);
                      onUpdateMemory({ ...memory, memoryWarnings: updatedWarnings });
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[9px] uppercase font-mono tracking-wider text-neutral-500 hover:text-yellow-500 transition-all px-2 flex-shrink-0"
                    title="Dismiss Warning"
                  >
                    Resolve
                  </button>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <button 
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                  const updatedMemory = { ...memory, memoryWarnings: [] };
                  onUpdateMemory(updatedMemory);
                }}
                className="text-[9px] uppercase font-mono tracking-wider text-yellow-600/70 hover:text-yellow-500 transition-colors"
               >
                 Clear Alerts
               </button>
            </div>
          </div>
        )}

        {/* PAGE 1: PORTRAITS (Characters & Beasts, Locations, Timeline Recaps, Factions) */}
        {activePage === 'portraits' && (
          <div className="space-y-8 pb-8">
            {/* Chronicle Photo Memory Collage Album */}
            <LivingCodexCollage
              activeStory={activeStory}
              memory={memory}
              onJumpToChapter={onJumpToChapter}
              onSwitchTab={onSwitchTab}
            />

            <div className="border-t border-neutral-900 pt-6">
              <LivingCodexCharacters
                charsToRender={charsToRender}
                locationsToRender={locationsToRender}
                setDeletePrompt={setDeletePrompt}
                selectedNodeChar={selectedNodeChar}
                setSelectedNodeChar={setSelectedNodeChar}
              />
            </div>
            
            <div className="border-t border-neutral-900 pt-6">
              <LivingCodexFactions
                factionsToRender={factionsToRender}
                memoryCharacters={memory.characters}
                setDeletePrompt={setDeletePrompt}
              />
            </div>

            <div className="border-t border-neutral-900 pt-6">
              <h4 className="text-[11px] text-human tracking-widest font-sc font-bold uppercase mb-4 px-2">Visual Story Recaps</h4>
              <LivingCodexTimeline
                flatChapters={flatChapters}
                onJumpToChapter={onJumpToChapter}
              />
            </div>
          </div>
        )}
        
        {/* PAGE 2: KARMA (Relations Web & Mysteries / Threads) */}
        {activePage === 'karma' && (
          <div className="space-y-8 pb-8">
            <LivingCodexRelations
              charsToRender={charsToRender}
              setDeletePrompt={setDeletePrompt}
              selectedNodeChar={selectedNodeChar}
              setSelectedNodeChar={setSelectedNodeChar}
            />
            
            <div className="border-t border-neutral-900 pt-6">
              <h4 className="text-[11px] text-human tracking-widest font-sc font-bold uppercase mb-4 px-2">Karmic Threads & Plot Lines</h4>
              <LivingCodexMysteries memory={memory} />
            </div>
          </div>
        )}
        
        {/* PAGE 3: POWER RANKINGS */}
        {activePage === 'power' && (
          <div className="space-y-8 pb-8">
            <LivingCodexPower
              memory={memory}
              activeStory={activeStory}
              getPowerStageLevel={getPowerStageLevel}
              mcName={mcName}
              getPowerRankScore={getPowerRankScore}
              charsToRender={charsToRender}
            />

            <div className="border-t border-neutral-900 pt-6">
              <h4 className="text-[11px] text-human tracking-widest font-sc font-bold uppercase mb-4 px-2">Cultivation Analytics</h4>
              <LivingCodexDashboards
                memory={memory}
                activeStory={activeStory}
                flatChapters={flatChapters}
                charsToRender={charsToRender}
                affinityTimelineOfChar={affinityTimelineOfChar}
                powerTimeline={powerTimeline}
              />
            </div>
          </div>
        )}
        
        {/* PAGE 4: ARTIFACTS */}
        {activePage === 'artifacts' && (
          <LivingCodexArtifacts
            artifactsToRender={artifactsToRender}
            setDeletePrompt={setDeletePrompt}
          />
        )}
        
        {/* PAGE 5: FATE (User world molding controls) */}
        {activePage === 'fate' && (
          <LivingCodexFate />
        )}
        
        {/* PAGE 6: LORE (Glossary) */}
        {activePage === 'lore' && (
          <LivingCodexGlossary
            memory={memory}
            arcs={arcs}
            mcName={mcName}
            routingConfig={routingConfig}
          />
        )}
      </div>

      <AnimatePresence>
        {deletePrompt && (
          <motion.div
            key="delete-prompt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-red-900/50 rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl relative"
            >
              <h3 className="text-xl font-display font-bold text-signal mb-2">Delete {deletePrompt.type}?</h3>
              <p className="text-sm text-neutral-400 mb-4 font-serif">
                You can no longer see this fate or undo this karma severing.
                {deletePrompt.name && <span className="block mt-2 font-mono text-xs text-red-300 mx-1">{deletePrompt.name}</span>}
              </p>
              
              <div className="mb-6">
                <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono block mb-2" htmlFor="a11y-control-${labelCounter}">
                  Type <span className="text-red-400 font-bold">DELETE</span> to confirm{' '}
                  <button
                    type="button"
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setDeleteInput('DELETE')}
                    className="ml-2 inline-flex items-center px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-sc font-bold border border-portal/30 bg-portal/10 text-portal hover:bg-portal hover:text-black rounded transition-all duration-300 cursor-pointer"
                    title="Auto-fill delete text"
                  >
                    Auto-Fill
                  </button>
                </label>
                <input
                  type="text"
                  placeholder="DELETE"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  className="w-full bg-void text-xs text-signal border border-neutral-700 focus:border-red-500 p-2 rounded focus:outline-none font-mono placeholder:text-neutral-700" id="a11y-control-${labelCounter}"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                    setDeletePrompt(null);
                    setDeleteInput('');
                  }}
                  className="px-4 py-2 bg-void border border-neutral-700 text-neutral-300 rounded font-sc text-xs hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={deleteInput !== 'DELETE'}
                  onClick={() => {
                    if (deleteInput === 'DELETE') {
                      if (deletePrompt.type === 'faction') handleDeleteFaction(deletePrompt.id);
                      if (deletePrompt.type === 'artifact') handleDeleteArtifact(deletePrompt.id);
                      if (deletePrompt.type === 'location') handleDeleteLocation(deletePrompt.id);
                      if (deletePrompt.type === 'relationship') handleDeleteCustomRelationship(deletePrompt.id);
                      if (deletePrompt.type === 'fate') handleDeleteFateNode(deletePrompt.id);
                      
                      setDeletePrompt(null);
                      setDeleteInput('');
                    }
                  }}
                  className={`px-4 py-2 bg-red-900 border border-red-700 text-white rounded font-sc font-bold text-xs transition-colors ${deleteInput === 'DELETE' ? 'hover:bg-red-800' : 'opacity-50 cursor-not-allowed'}`}
                >
                  Sever Karma
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
    </CodexProvider>
  );
}
