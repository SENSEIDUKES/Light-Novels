import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Network, Zap, Shield, Sparkles, Sword, HelpCircle, 
  MapPin, Plus, Trash2, Heart, ShieldAlert, BookOpen, Clock, 
  Check, Eye, RefreshCcw, Search, Compass, Award, Image, 
  BookMarked, ArrowRight, ArrowLeftRight, Activity, History
} from 'lucide-react';
import { StoryMemory, Character, Faction, Location, Artifact, StoryArc, StoryWorld, CharacterRelationship, KarmaFateNode, Chapter, MultiModelRouting } from '../types';
import { secureStorage } from '../lib/encryption';
import { VirtualizedList } from './VirtualizedList';
import { AgentBadge } from './AgentBadge';
import { AGENTS } from '../lib/agents';
import { DestinyChoicePanel } from './DestinyChoicePanel';

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
const DEFAULT_CULTIVATION_GLOSSARY = [
  {
    term: "Qi (气)",
    category: "Vital Energy",
    definition: "The fundamental spiritual life energy flowing through all celestial creation. Cultivators refine raw worldly Qi inside their dantian to grow standard power."
  },
  {
    term: "Dantian (丹田)",
    category: "Anatomy",
    definition: "The spiritual elixir field located near the core of the physical body. It functions as the central crucible of alchemical cultivation storage."
  },
  {
    term: "Heavenly Tribulation (天劫)",
    category: "Cosmic Phenomenon",
    definition: "Savage, lightning-infused trials triggered by the Heavenly Tao when a cultivator breaks through critical tier thresholds, trying to disintegrate them for defying physical laws."
  },
  {
    term: "Jade Slip (玉简)",
    category: "Substance",
    definition: "Exquisite spiritual jade plates onto which supreme grandmaster mental brands are inscribed, utilized to safely store cultivation martial manuals."
  },
  {
    term: "Kowtow (叩头)",
    category: "Culture",
    definition: "Kneeling and knocking the forehead to the ground. A submissive form of showing utmost respect or pleading for grand master mercy."
  },
  {
    term: "Dao (道)",
    category: "Cosmic Law",
    definition: "The infinite, incomprehensible 'Way' or natural order governing absolute physical and spiritual dimensions. Cultivators seek total enlightenment of their chosen Dao paths."
  },
  {
    term: "Spiritual Meridians (经脉)",
    category: "Anatomy",
    definition: "The internal energetic high-speed channels of the body through which refined Qi flows. Blocked or destroyed meridians lead to crippled cultivation ruins."
  }
];

export default function LivingCodex({ 
  memory, 
  arcs, 
  onUpdateMemory, 
  mcName, 
  onJumpToChapter, 
  onSwitchTab,
  activeStory,
  onUpdateStory,
  routingConfig
}: LivingCodexProps) {
  const [activePage, setActivePage] = useState<'characters' | 'relations' | 'power' | 'factions' | 'artifacts' | 'timeline' | 'mysteries' | 'glossary' | 'dashboards'>('characters');
  
  // Selection state for node inspection in Relationship Map & other grids
  const [selectedNodeChar, setSelectedNodeChar] = useState<Character | null>(null);

  // Search filter for Glossary
  const [glossarySearch, setGlossarySearch] = useState('');
  
  // Custom API-generated story-specific glossary terms
  const [customGlossary, setCustomGlossary] = useState<Array<{term: string, category: string, definition: string}>>([]);
  const [isExtractingGlossary, setIsExtractingGlossary] = useState(false);
  const [glossaryError, setGlossaryError] = useState<string | null>(null);

  // Toggle for Deep Memory / Dormant elements
  const [showDeepMemory, setShowDeepMemory] = useState(false);

  // --- CUSTOM COMPONENT BINDING STATES (LOCAL-FIRST PERSISTENT MATRIX) ---
  const [bondSourceId, setBondSourceId] = useState('');
  const [bondTargetId, setBondTargetId] = useState('');
  const [bondAffinity, setBondAffinity] = useState<number>(0);
  const [bondDesc, setBondDesc] = useState('');

  const [fateSource, setFateSource] = useState('');
  const [fateTarget, setFateTarget] = useState('');
  const [fateSeverity, setFateSeverity] = useState<'Minor' | 'Major' | 'Cosmic'>('Minor');
  const [fateType, setFateType] = useState<'Debt' | 'Boon' | 'Enmity' | 'Destiny'>('Debt');
  const [fateDesc, setFateDesc] = useState('');
  
  const [codexNotification, setCodexNotification] = useState<string | null>(null);
  const [selectedChartCharId, setSelectedChartCharId] = useState<string>('');
  const [hoveredPowerPoint, setHoveredPowerPoint] = useState<any | null>(null);
  const [hoveredAffPoint, setHoveredAffPoint] = useState<any | null>(null);

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
      const written = arc.chapters.filter(ch => ch.hasContent || !!ch.generatedContent);
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

    const startAff = char.relationshipToMC.toLowerCase().includes('hostil') || char.relationshipToMC.toLowerCase().includes('enemy')
      ? -45
      : char.relationshipToMC.toLowerCase().includes('friend') || char.relationshipToMC.toLowerCase().includes('ally') || char.relationshipToMC.toLowerCase().includes('mentor')
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
      const hasInteraction = text.includes(char.name.toLowerCase());

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

  const handleAddCustomRelationship = () => {
    if (!bondSourceId || !bondTargetId) {
      pushNotification("Two sovereign characters are required to bind a causal relation.");
      return;
    }
    if (bondSourceId === bondTargetId) {
      pushNotification("A cultivator cannot bond with their own split soul.");
      return;
    }
    const sourceChar = memory.characters.find(c => c.id === bondSourceId);
    const targetChar = memory.characters.find(c => c.id === bondTargetId);
    if (!sourceChar || !targetChar) return;

    const newRelationship: CharacterRelationship = {
      id: `bond_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceCharId: bondSourceId,
      sourceCharName: sourceChar.name,
      targetCharId: bondTargetId,
      targetCharName: targetChar.name,
      affinity: bondAffinity,
      description: bondDesc || `${sourceChar.name} and ${targetChar.name} are bound through shared tribulation.`,
      updatedAt: new Date().toISOString()
    };

    const currentBonds = activeStory.relationships || [];
    onUpdateStory({
      ...activeStory,
      relationships: [newRelationship, ...currentBonds]
    });

    setBondSourceId('');
    setBondTargetId('');
    setBondDesc('');
    setBondAffinity(0);
    pushNotification(`Successfully bound a karma link between ${sourceChar.name} and ${targetChar.name}!`);
  };

  const handleDeleteCustomRelationship = (bondId: string) => {
    const currentBonds = activeStory.relationships || [];
    onUpdateStory({
      ...activeStory,
      relationships: currentBonds.filter(b => b.id !== bondId)
    });
  };

  const handleAddCustomFateNode = () => {
    if (!fateSource || !fateTarget || !fateDesc) {
      pushNotification("All decree fields (Source, Target, Description) are required to engrave karma fate nodes.");
      return;
    }

    const newFateNode: KarmaFateNode = {
      id: `fate_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceId: `src_${Date.now()}`,
      sourceName: fateSource,
      targetId: `tgt_${Date.now()}`,
      targetName: fateTarget,
      description: fateDesc,
      severity: fateSeverity,
      type: fateType,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    const currentNodes = activeStory.karmaNodes || [];
    onUpdateStory({
      ...activeStory,
      karmaNodes: [newFateNode, ...currentNodes]
    });

    setFateSource('');
    setFateTarget('');
    setFateDesc('');
    pushNotification("Fate decree successfully engraved into the Akasha tablet!");
  };

  const handleToggleFateNodeStatus = (fateId: string) => {
    const currentNodes = activeStory.karmaNodes || [];
    onUpdateStory({
      ...activeStory,
      karmaNodes: currentNodes.map(n => n.id === fateId ? { ...n, status: n.status === 'active' ? 'resolved' : 'active' } : n)
    });
  };

  const handleDeleteFateNode = (fateId: string) => {
    const currentNodes = activeStory.karmaNodes || [];
    onUpdateStory({
      ...activeStory,
      karmaNodes: currentNodes.filter(n => n.id !== fateId)
    });
  };

  // Active sub-navigation for Characters ("Detailed list" vs "Illustrated Canvas Cards")
  const [charViewStyle, setCharViewStyle] = useState<'cards' | 'profiles'>('cards');

  // Interactive state for visual generation triggers
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, { urls: string[], prompt: string, selectedIndex: number, type: 'character' | 'location' | 'artifact' | 'beast' }>>({});

  // Form states primitive handlers
  const [showAddFactionForm, setShowAddFactionForm] = useState(false);
  const [newFaction, setNewFaction] = useState({
    name: '',
    description: '',
    alignment: 'Neutral',
    headquarters: '',
    status: 'Active'
  });

  const [showAddArtifactForm, setShowAddArtifactForm] = useState(false);
  const [newArtifact, setNewArtifact] = useState({
    name: '',
    description: '',
    tier: 'Mortal',
    currentOwner: ''
  });

  const [showAddLocationForm, setShowAddLocationForm] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: '',
    description: '',
    realm: '',
    safetyLevel: 'Safe'
  });

  const [showAddAbilityForm, setShowAddAbilityForm] = useState(false);
  const [newAbility, setNewAbility] = useState('');

  // Local state for direct editing of Character abilities / power
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [editingCharData, setEditingCharData] = useState({
    powerLevel: '',
    abilitiesInput: '',
    faction: ''
  });

  // Load custom glossary on mount if existing in local storage
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`custom_glossary_${mcName}`);
      if (cached) {
        setCustomGlossary(JSON.parse(cached));
      }
    } catch (e) {
      console.error("Failed to read glossary cache", e);
    }
  }, [mcName]);

  // Save custom glossary
  const saveCustomGlossaryLocally = (terms: Array<{ term: string; category: string; definition: string; }>) => {
    setCustomGlossary(terms);
    localStorage.setItem(`custom_glossary_${mcName}`, JSON.stringify(terms));
  };

  // Assign numeric power rankings based on parsed cultivation stages
  const getPowerRankScore = (powerStr: string | undefined): { score: number, title: string } => {
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
  };

  // Generate Image Card API trigger
  const handleRevertImage = (id: string, type: string, newUrl: string) => {
    // 1. Update memory
    if (type === 'character' || type === 'beast') {
      const updated = memory.characters.map(c => c.id === id ? { ...c, imageUrl: newUrl } : c);
      onUpdateMemory({ ...memory, characters: updated });
    } else if (type === 'location') {
      const updated = (memory.locations || []).map(l => l.id === id ? { ...l, imageUrl: newUrl } : l);
      onUpdateMemory({ ...memory, locations: updated });
    } else if (type === 'artifact') {
      const updated = (memory.artifacts || []).map(a => a.id === id ? { ...a, imageUrl: newUrl } : a);
      onUpdateMemory({ ...memory, artifacts: updated });
    }

    // 2. Update activeStory image history isCurrent flags
    if (activeStory.imageHistory) {
      const updatedStoryHistory = activeStory.imageHistory.map(img => {
        if (img.entityId === id) {
          return { ...img, isCurrent: img.imageUrl === newUrl };
        }
        return img;
      });
      onUpdateStory({
        ...activeStory,
        imageHistory: updatedStoryHistory
      });
    }
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
            title={`Generated at Chapter ${img.chapterNumber || 'Unknown'}\nPrompt: ${img.promptUsed}`}
          >
            <img src={img.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
      const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const gemini = secureStorage.getItem('@seihouse/api-key-gemini');
      const openrouter = secureStorage.getItem('@seihouse/api-key-openrouter');
      const ollama = secureStorage.getItem('@seihouse/api-key-ollama-host');
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

    const newHistoryItem = {
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
    const updatedStoryHistory = currentStoryHistory
      .map(img => img.entityId === id ? { ...img, isCurrent: false } : img)
      .concat(newHistoryItem as any);

    if (type === 'character' || type === 'beast') {
      const updated = memory.characters.map(c => 
        c.id === id ? { ...c, imageUrl: selectedUrl, evolutionReady: false, availableVisualUpdate: false, lastImageChapter: activeStory.currentChapterNumber } : c
      );
      onUpdateMemory({ ...memory, characters: updated });
    } else if (type === 'location') {
      const updated = (memory.locations || []).map(l => 
        l.id === id ? { ...l, imageUrl: selectedUrl, evolutionReady: false, availableVisualUpdate: false, lastImageChapter: activeStory.currentChapterNumber } : l
      );
      onUpdateMemory({ ...memory, locations: updated });
    } else if (type === 'artifact') {
      const updated = (memory.artifacts || []).map(a => 
        a.id === id ? { ...a, imageUrl: selectedUrl, evolutionReady: false, availableVisualUpdate: false, lastImageChapter: activeStory.currentChapterNumber } : a
      );
      onUpdateMemory({ ...memory, artifacts: updated });
    }

    onUpdateStory({
      ...activeStory,
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

  // AI-powered dynamic glossary extraction trigger
  const handleGenerateCustomGlossary = async () => {
    setIsExtractingGlossary(true);
    setGlossaryError(null);

    try {
      const characterNames = memory.characters.map(c => c.name);
      const factionNames = (memory.factions || []).map(f => f.name);

      const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const gemini = secureStorage.getItem('@seihouse/api-key-gemini');
      const openrouter = secureStorage.getItem('@seihouse/api-key-openrouter');
      const ollama = secureStorage.getItem('@seihouse/api-key-ollama-host');
      if (gemini) apiHeaders['x-gemini-key'] = gemini;
      if (openrouter) apiHeaders['x-openrouter-key'] = openrouter;
      if (ollama) apiHeaders['x-ollama-host'] = ollama;

      const res = await fetch('/api/generate-custom-glossary', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          storyTitle: arcs[0]?.title || "Active Light Novel Matrix",
          mcName,
          genre: "Sovereign Cultivation path",
          customPremise: memory.powerSystem,
          characterNames,
          factionNames,
          routingConfig
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Vault scribe failed to distill lore.");
      }

      if (data.terms && Array.isArray(data.terms)) {
        saveCustomGlossaryLocally([...customGlossary, ...data.terms]);
      } else {
        throw new Error("Invalid format returned by scribe.");
      }
    } catch (err: any) {
      console.error(err);
      setGlossaryError(err.message || "Celestial archive records currently unstable.");
    } finally {
      setIsExtractingGlossary(false);
    }
  };

  // Action: Add Faction
  const handleAddFaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaction.name.trim()) return;

    const currentFactions = memory.factions || [];
    const factionObj: Faction = {
      id: `fct-${Date.now()}`,
      name: newFaction.name.trim(),
      description: newFaction.description.trim(),
      alignment: newFaction.alignment,
      headquarters: newFaction.headquarters.trim() || undefined,
      status: newFaction.status
    };

    onUpdateMemory({
      ...memory,
      factions: [...currentFactions, factionObj]
    });

    setNewFaction({ name: '', description: '', alignment: 'Neutral', headquarters: '', status: 'Active' });
    setShowAddFactionForm(false);
  };

  // Action: Delete Faction
  const handleDeleteFaction = (id: string) => {
    const currentFactions = memory.factions || [];
    onUpdateMemory({
      ...memory,
      factions: currentFactions.filter(f => f.id !== id)
    });
  };

  // Action: Add Artifact
  const handleAddArtifact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtifact.name.trim()) return;

    const currentArtifacts = memory.artifacts || [];
    const artifactObj: Artifact = {
      id: `art-${Date.now()}`,
      name: newArtifact.name.trim(),
      description: newArtifact.description.trim(),
      tier: newArtifact.tier,
      currentOwner: newArtifact.currentOwner.trim() || 'Unknown'
    };

    onUpdateMemory({
      ...memory,
      artifacts: [...currentArtifacts, artifactObj]
    });

    setNewArtifact({ name: '', description: '', tier: 'Mortal', currentOwner: '' });
    setShowAddArtifactForm(false);
  };

  // Action: Delete Artifact
  const handleDeleteArtifact = (id: string) => {
    const currentArtifacts = memory.artifacts || [];
    onUpdateMemory({
      ...memory,
      artifacts: currentArtifacts.filter(a => a.id !== id)
    });
  };

  // Action: Add Location
  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.name.trim()) return;

    const currentLocations = memory.locations || [];
    const locationObj: Location = {
      id: `loc-${Date.now()}`,
      name: newLocation.name.trim(),
      description: newLocation.description.trim(),
      realm: newLocation.realm.trim() || undefined,
      safetyLevel: newLocation.safetyLevel
    };

    onUpdateMemory({
      ...memory,
      locations: [...currentLocations, locationObj]
    });

    setNewLocation({ name: '', description: '', realm: '', safetyLevel: 'Safe' });
    setShowAddLocationForm(false);
  };

  // Action: Delete Location
  const handleDeleteLocation = (id: string) => {
    const currentLocations = memory.locations || [];
    onUpdateMemory({
      ...memory,
      locations: currentLocations.filter(l => l.id !== id)
    });
  };

  // Action: Add MC Ability
  const handleAddMCAbility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAbility.trim()) return;

    const currentAbilities = memory.abilities || [];
    if (!currentAbilities.includes(newAbility.trim())) {
      onUpdateMemory({
        ...memory,
        abilities: [...currentAbilities, newAbility.trim()]
      });
    }

    setNewAbility('');
    setShowAddAbilityForm(false);
  };

  // Action: Delete MC Ability
  const handleDeleteMCAbility = (abilityName: string) => {
    const currentAbilities = memory.abilities || [];
    onUpdateMemory({
      ...memory,
      abilities: currentAbilities.filter(ab => ab !== abilityName)
    });
  };

  // Action: Save character edit overlay content
  const handleSaveCharEdit = (charId: string) => {
    const updatedChars = memory.characters.map(char => {
      if (char.id === charId) {
        return {
          ...char,
          powerLevel: editingCharData.powerLevel.trim() || undefined,
          faction: editingCharData.faction.trim() || undefined,
          abilities: editingCharData.abilitiesInput.trim() 
            ? editingCharData.abilitiesInput.split(',').map(a => a.trim()).filter(Boolean) 
            : undefined
        };
      }
      return char;
    });

    onUpdateMemory({
      ...memory,
      characters: updatedChars
    });

    setEditingCharId(null);
  };

  // Search filtered glossary combining standard + generated options
  const compositeGlossary = [...DEFAULT_CULTIVATION_GLOSSARY, ...customGlossary];
  const filteredGlossary = compositeGlossary.filter(item => 
    item.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
    item.definition.toLowerCase().includes(glossarySearch.toLowerCase()) ||
    item.category.toLowerCase().includes(glossarySearch.toLowerCase())
  );

  const activePreviewId = Object.keys(previews)[0];
  const activePreview = activePreviewId ? previews[activePreviewId] : null;

  // Memory Temperature Filtering
  const allChars = memory.characters || [];
  const dormantChars = allChars.filter(c => c.relevanceState === 'dormant' || c.relevanceState === 'archived');
  const charsToRender = showDeepMemory ? allChars : allChars.filter(c => !c.relevanceState || c.relevanceState === 'active' || c.relevanceState === 'warm' || c.relevanceState === 'reactivated');

  const allLocs = memory.locations || [];
  const dormantLocs = allLocs.filter(l => l.relevanceState === 'dormant' || l.relevanceState === 'archived');
  const locsToRender = showDeepMemory ? allLocs : allLocs.filter(l => !l.relevanceState || l.relevanceState === 'active' || l.relevanceState === 'warm' || l.relevanceState === 'reactivated');

  const allFactions = memory.factions || [];
  const dormantFactions = allFactions.filter(f => f.relevanceState === 'dormant' || f.relevanceState === 'archived');
  const factionsToRender = showDeepMemory ? allFactions : allFactions.filter(f => !f.relevanceState || f.relevanceState === 'active' || f.relevanceState === 'warm' || f.relevanceState === 'reactivated');

  const allArtifacts = memory.artifacts || [];
  const dormantArtifacts = allArtifacts.filter(a => a.relevanceState === 'dormant' || a.relevanceState === 'archived');
  const artifactsToRender = showDeepMemory ? allArtifacts : allArtifacts.filter(a => !a.relevanceState || a.relevanceState === 'active' || a.relevanceState === 'warm' || a.relevanceState === 'reactivated');

  const hasDormantState = dormantChars.length > 0 || dormantLocs.length > 0 || dormantFactions.length > 0 || dormantArtifacts.length > 0;

  return (
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
          {/* Character/Location Profiles Link */}
          <button
            onClick={() => setActivePage('characters')}
            className={`flex items-center space-x-2 md:space-x-3 px-4 py-2.5 md:px-3 md:py-2.5 rounded text-[10px] md:text-[11px] tracking-wider transition-all font-sc uppercase flex-shrink-0 ${
              activePage === 'characters' 
                ? 'bg-neutral-950 text-signal border border-neutral-850 shadow shadow-portal/10' 
                : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-950/40'
            }`}
          >
            <Users size={14} className={activePage === 'characters' ? 'text-human' : ''} />
            <span>Sovereign Portals</span>
          </button>

          {/* Relationship Map Link */}
          <button
            onClick={() => {
              setActivePage('relations');
              setSelectedNodeChar(null);
            }}
            className={`flex items-center space-x-2 md:space-x-3 px-4 py-2.5 md:px-3 md:py-2.5 rounded text-[10px] md:text-[11px] tracking-wider transition-all font-sc uppercase flex-shrink-0 ${
              activePage === 'relations' 
                ? 'bg-neutral-950 text-signal border border-neutral-850 shadow shadow-portal/10' 
                : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-950/40'
            }`}
          >
            <Network size={14} className={activePage === 'relations' ? 'text-portal' : ''} />
            <span>Karma Web</span>
          </button>

          {/* Power ranking chart System Link */}
          <button
            onClick={() => setActivePage('power')}
            className={`flex items-center space-x-2 md:space-x-3 px-4 py-2.5 md:px-3 md:py-2.5 rounded text-[10px] md:text-[11px] tracking-wider transition-all font-sc uppercase flex-shrink-0 ${
              activePage === 'power' 
                ? 'bg-neutral-950 text-signal border border-neutral-850 shadow shadow-portal/10' 
                : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-950/40'
            }`}
          >
            <Zap size={14} className={activePage === 'power' ? 'text-yellow-500' : ''} />
            <span>Power Rankings</span>
          </button>

          {/* Progression Dashboards */}
          <button
            onClick={() => setActivePage('dashboards')}
            className={`flex items-center space-x-2 md:space-x-3 px-4 py-2.5 md:px-3 md:py-2.5 rounded text-[10px] md:text-[11px] tracking-wider transition-all font-sc uppercase flex-shrink-0 ${
              activePage === 'dashboards' 
                ? 'bg-neutral-950 text-signal border border-neutral-850 shadow shadow-portal/10' 
                : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-950/40'
            }`}
          >
            <Activity size={14} className={activePage === 'dashboards' ? 'text-cyan-400' : ''} />
            <span>Aether Dashboards</span>
          </button>

          {/* Factions & hierarchy Link */}
          <button
            onClick={() => setActivePage('factions')}
            className={`flex items-center space-x-2 md:space-x-3 px-4 py-2.5 md:px-3 md:py-2.5 rounded text-[10px] md:text-[11px] tracking-wider transition-all font-sc uppercase flex-shrink-0 ${
              activePage === 'factions' 
                ? 'bg-neutral-950 text-signal border border-neutral-850 shadow shadow-portal/10' 
                : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-950/40'
            }`}
          >
            <Shield size={14} className={activePage === 'factions' ? 'text-green-500' : ''} />
            <span>Faction Hierarchy</span>
          </button>

          {/* Artifacts Gallery Link */}
          <button
            onClick={() => setActivePage('artifacts')}
            className={`flex items-center space-x-2 md:space-x-3 px-4 py-2.5 md:px-3 md:py-2.5 rounded text-[10px] md:text-[11px] tracking-wider transition-all font-sc uppercase flex-shrink-0 ${
              activePage === 'artifacts' 
                ? 'bg-neutral-950 text-signal border border-neutral-850 shadow shadow-portal/10' 
                : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-950/40'
            }`}
          >
            <Sword size={14} className={activePage === 'artifacts' ? 'text-orange-500' : ''} />
            <span>Divine Relics</span>
          </button>

          {/* Timeline Scroll Link */}
          <button
            onClick={() => setActivePage('timeline')}
            className={`flex items-center space-x-2 md:space-x-3 px-4 py-2.5 md:px-3 md:py-2.5 rounded text-[10px] md:text-[11px] tracking-wider transition-all font-sc uppercase flex-shrink-0 ${
              activePage === 'timeline' 
                ? 'bg-neutral-950 text-signal border border-neutral-850 shadow shadow-portal/10' 
                : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-950/40'
            }`}
          >
            <Clock size={14} className={activePage === 'timeline' ? 'text-neutral-300' : ''} />
            <span>Chronicle Recaps</span>
          </button>

          {/* Unresolved Mysteries Link */}
          <button
            onClick={() => setActivePage('mysteries')}
            className={`flex items-center space-x-2 md:space-x-3 px-4 py-2.5 md:px-3 md:py-2.5 rounded text-[10px] md:text-[11px] tracking-wider transition-all font-sc uppercase flex-shrink-0 ${
              activePage === 'mysteries' 
                ? 'bg-neutral-950 text-signal border border-neutral-850 shadow shadow-portal/10' 
                : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-950/40'
            }`}
          >
            <HelpCircle size={12} className={activePage === 'mysteries' ? 'text-cyan-400' : ''} />
            <span>Karma Threads</span>
          </button>

          {/* Glossary Link (Newly integrated!) */}
          <button
            onClick={() => setActivePage('glossary')}
            className={`flex items-center space-x-1.5 md:space-x-3 px-3 py-1.5 md:py-2.5 rounded text-[10px] md:text-[11px] tracking-wider transition-all font-sc uppercase flex-shrink-0 ${
              activePage === 'glossary' 
                ? 'bg-neutral-950 text-signal border border-neutral-850 shadow shadow-portal/10' 
                : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-950/40'
            }`}
          >
            <BookMarked size={12} className={activePage === 'glossary' ? 'text-purple-400' : ''} />
            <span>Sovereign Glossary</span>
          </button>

          {/* Back navigation shortcut in horizontal list on mobile */}
          {onSwitchTab && onJumpToChapter && (
            <button
              onClick={() => onSwitchTab('reader')}
              className="flex sm:hidden items-center space-x-1.5 px-3 py-1.5 rounded text-[10px] tracking-wider font-mono uppercase bg-void text-portal border border-portal/20 flex-shrink-0"
            >
              <span>← Reader</span>
            </button>
          )}
        </div>

        {/* Deep Memory Controls */}
        <div className="pt-4 border-t border-neutral-900 mt-4 hidden sm:block">
           <button
             onClick={() => setShowDeepMemory(!showDeepMemory)}
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
              onClick={() => {
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
            <button onClick={() => setGenerationError(null)} className="text-neutral-500 hover:text-neutral-300 font-bold">×</button>
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
                <div key={idx} className="flex space-x-2 text-[10px] sm:text-xs text-neutral-400 font-sans">
                  <span className="text-yellow-600/70 mt-0.5">•</span>
                  <span>{warning}</span>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <button 
                onClick={() => {
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

        {/* PAGE 1: Character & Location Cards (Illustrated Profiles & Cards) */}
        {activePage === 'characters' && (
          <div className="space-y-6 animate-fadeIn" id="codex-characters-and-locations">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-3">
              <div>
                <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Sovereign Portrait Chambers</h3>
                <p className="text-[10px] text-neutral-500 font-sans">Toggle profiles and locations, awaken visual aura portraits directly from the Void.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCharViewStyle('cards')}
                  className={`px-3 py-1 text-[10px] font-mono rounded border capitalize transition-all ${
                    charViewStyle === 'cards' ? 'bg-portal/10 text-portal border-portal-300' : 'text-neutral-500 border-neutral-900 hover:text-neutral-300'
                  }`}
                >
                  Illustrated Cards
                </button>
                <button
                  onClick={() => setCharViewStyle('profiles')}
                  className={`px-3 py-1 text-[10px] font-mono rounded border capitalize transition-all ${
                    charViewStyle === 'profiles' ? 'bg-portal/10 text-portal border-portal-300' : 'text-neutral-500 border-neutral-900 hover:text-neutral-300'
                  }`}
                >
                  Detailed Lists
                </button>
              </div>
            </div>

            {/* Sub-section: CHARACTER ILLUSTRATED CARDS VIEW */}
            {charViewStyle === 'cards' ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[11px] text-human tracking-widest font-sc font-bold uppercase mb-3">Divine Character Cards</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Character Cards Loop */}
                    {charsToRender.map((char) => {
                      const isGenerating = generatingId === char.id;
                      const hasImage = !!char.imageUrl;
                      const cScore = getPowerRankScore(char.powerLevel);
                      const activePreview = previews[char.id];
                      const canGenerate = !hasImage || char.evolutionReady;
                      const displayedImage = activePreview ? activePreview.urls[activePreview.selectedIndex] : char.imageUrl;
                      
                      return (
                        <div 
                          key={char.id} 
                          className={`bg-neutral-950 border ${char.evolutionReady && !activePreview ? 'border-portal/50 shadow-[0_0_15px_rgba(4,172,255,0.15)]' : 'border-neutral-900'} hover:border-neutral-800 rounded-lg overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-lg relative`}
                        >
                          {/* Visual Stage illustration header */}
                          <div className="h-44 w-full bg-void relative flex items-center justify-center overflow-hidden border-b border-neutral-900 group">
                            {renderImageHistoryGallery(char.id, char.isBeast ? 'beast' : 'character', activeStory.imageHistory?.filter(img => img.entityId === char.id))}
                            {displayedImage ? (
                              <img 
                                src={displayedImage} 
                                alt={char.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 brightness-95"
                              />
                            ) : (
                              /* Abstract CSS Alchemical grid vector placeholder */
                              <div className="absolute inset-0 bg-gradient-to-b from-void via-human/10 to-void flex flex-col items-center justify-center p-4 text-center">
                                <div className="absolute inset-0 bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
                                <div className="w-14 h-14 rounded-full border border-neutral-800/60 bg-black flex items-center justify-center text-portal shadow-[0_0_15px_rgba(4,172,255,0.1)] relative mb-2">
                                  <Compass size={22} className="text-neutral-600 animate-spin-slow" />
                                  <div className="absolute inset-2 border border-dashed border-portal/20 rounded-full"></div>
                                </div>
                                <span className="text-[8px] text-neutral-500 font-mono tracking-widest uppercase">AURA UNMANIFESTED</span>
                              </div>
                            )}

                            {/* Status label floating top right */}
                            <div className="absolute top-2 right-2 flex space-x-1">
                              {char.relevanceState && char.relevanceState.toLowerCase() !== 'active' && (
                                <span className="text-[7.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900/80 text-neutral-400">
                                  {char.relevanceState}
                                </span>
                              )}
                              <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                                char.status === 'alive' ? 'bg-green-950/40 text-green-400 border-green-900' :
                                char.status === 'deceased' ? 'bg-red-950/40 text-human border-red-900' :
                                'bg-neutral-950 text-neutral-500 border-neutral-800'
                              }`}>
                                {char.status}
                              </span>
                            </div>

                            {/* Combat power ranking level index label floating top left */}
                            <div className="absolute top-2 left-2 flex items-center space-x-1 font-mono text-[8.5px] bg-black/80 px-1.5 py-0.5 rounded border border-neutral-850">
                              <Award size={10} className="text-yellow-500" />
                              <span className="text-neutral-300">Pwr:{cScore.score}</span>
                            </div>

                            {activePreview && (
                              <div className="absolute inset-x-0 bottom-0 bg-neutral-950/90 text-[9px] font-mono font-bold uppercase py-1 text-center text-gold-accent border-t border-gold-accent/30 tracking-widest z-10 animate-pulse">
                                Evolution Preview
                              </div>
                            )}
                          </div>

                          {/* Detail body */}
                          <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between">
                                <h5 className="font-sc font-medium text-signal text-sm">{char.name}</h5>
                                <span className="text-[9px] text-portal font-mono font-medium">{char.role.split(',')[0]}</span>
                              </div>
                              <p className="text-[10px] text-neutral-400 leading-normal font-sans italic mt-1 line-clamp-2">
                                "{char.description || 'Stature secrets kept by standard cause matrices.'}"
                              </p>
                              <div className="pt-2 text-[9.5px]">
                                <span className="text-neutral-500 block">Cultivation: <strong className="text-neutral-300 font-mono">{char.powerLevel || 'Ordinary'}</strong></span>
                                {char.faction && (
                                  <span className="text-neutral-500 block">Affiliation: <strong className="text-neutral-300 font-mono">{char.faction}</strong></span>
                                )}
                              </div>
                            </div>

                            {/* Action: Forge visual aura portrait */}
                            <div className="pt-3 border-t border-neutral-950 flex flex-col gap-2">
                              {char.evolutionReady && !activePreview && (
                                <div className="text-[9px] font-mono text-portal animate-pulse flex items-center gap-1.5 mb-1 px-1">
                                  <Sparkles size={8} />
                                  <span>Evolution Available: {char.evolutionReason || "New Breakthrough"}</span>
                                </div>
                              )}
                              <button
                                onClick={() => handleAwakenCardImage(char.id, char.isBeast ? 'beast' : 'character', char)}
                                disabled={isGenerating || !canGenerate}
                                className={`w-full py-1.5 rounded text-[9px] uppercase font-mono tracking-widest flex items-center justify-center space-x-1 border font-bold transition-all ${
                                  isGenerating
                                    ? 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-wait'
                                    : !canGenerate
                                    ? 'bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-75'
                                    : char.evolutionReady
                                    ? 'bg-portal border-portal text-void shadow-[0_0_10px_rgba(4,172,255,0.4)]'
                                    : 'bg-void border-portal/15 text-portal hover:border-portal hover:bg-portal/5 hover:shadow-[0_0_8px_rgba(4,172,255,0.2)]'
                                }`}
                                title={!canGenerate ? "Evolution requires further story progression." : ""}
                              >
                                  {isGenerating ? (
                                    <>
                                      <RefreshCcw size={10} className="animate-spin" />
                                      <span>VERSA is working...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Image size={10} className={char.evolutionReady ? 'text-void' : 'text-portal'} />
                                      <span>{char.evolutionReady ? 'Awaken Evolution' : hasImage ? 'Requires Progression' : 'Awaken Portrait'}</span>
                                    </>
                                  )}
                                </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-section: DYNAMIC GEOLOCATION / SCENERY CARDS */}
                <div>
                  <div className="flex items-center justify-between mb-3 border-t border-neutral-900 pt-5">
                    <h4 className="text-[11px] text-human tracking-widest font-sc font-bold uppercase">World Geolocation Vistas</h4>
                    <button
                      onClick={() => setShowAddLocationForm(!showAddLocationForm)}
                      className="px-2 py-1 bg-void hover:bg-neutral-900 font-sc font-bold border border-neutral-850 hover:border-neutral-700 text-neutral-400 hover:text-signal rounded text-[9px] uppercase tracking-wider flex items-center space-x-1"
                    >
                      <Plus size={10} />
                      <span>Formulate Domain</span>
                    </button>
                  </div>

                  {/* Form to manual add location */}
                  {showAddLocationForm && (
                    <form onSubmit={handleAddLocation} className="mb-6 p-4 bg-neutral-950 border border-neutral-900 rounded-lg space-y-3 animate-fadeIn text-xs max-w-lg">
                      <h4 className="font-sc font-extrabold text-xs text-human tracking-wider uppercase">Chart Unexplored domain node</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-1">Domain Name</label>
                          <input 
                            type="text"
                            value={newLocation.name}
                            onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                            placeholder="e.g. Primordial Fog Valley"
                            className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-1">Broader Realm</label>
                          <input 
                            type="text"
                            value={newLocation.realm}
                            onChange={(e) => setNewLocation({ ...newLocation, realm: e.target.value })}
                            placeholder="e.g. Heavenly Realm"
                            className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-1">Safety Index</label>
                          <select
                            value={newLocation.safetyLevel}
                            onChange={(e) => setNewLocation({ ...newLocation, safetyLevel: e.target.value })}
                            className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                          >
                            <option value="Safe">Safe Haven (Protected)</option>
                            <option value="Dangerous">Dangerous (Demons)</option>
                            <option value="Lethal">Lethal (Forbidden Zone)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-1 font-sc">Description Atmosphere</label>
                          <input 
                            type="text"
                            value={newLocation.description}
                            onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                            placeholder="e.g. Floating islands dripping celestial water..."
                            className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 pt-1">
                        <button type="button" onClick={() => setShowAddLocationForm(false)} className="text-neutral-500">Cancel</button>
                        <button type="submit" className="bg-portal text-void font-bold px-3 py-1 rounded font-sc uppercase text-[10px] tracking-wider">Formulate</button>
                      </div>
                    </form>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {!locsToRender || locsToRender.length === 0 ? (
                      <div className="col-span-3 text-center py-10 border border-dashed border-neutral-900 rounded bg-neutral-950/20 text-xs text-neutral-500 italic">
                        No geographic realms known. Continue reading or formulate a custom domain above!
                      </div>
                    ) : (
                      locsToRender.map((loc) => {
                        const isGenerating = generatingId === loc.id;
                        const hasImage = !!loc.imageUrl;
                        const activePreview = previews[loc.id];
                        const canGenerate = !hasImage || loc.evolutionReady;
                        const displayedImage = activePreview ? activePreview.urls[activePreview.selectedIndex] : loc.imageUrl;

                        return (
                          <div key={loc.id} className={`bg-neutral-950 border ${loc.evolutionReady && !activePreview ? 'border-portal/50 shadow-[0_0_15px_rgba(4,172,255,0.15)]' : 'border-neutral-900'} hover:border-neutral-800 rounded-lg overflow-hidden flex flex-col justify-between group transition-all duration-300`}>
                            {/* Location Scenery Header */}
                            <div className="h-36 w-full bg-void relative flex items-center justify-center overflow-hidden border-b border-neutral-900 group">
                              {renderImageHistoryGallery(loc.id, 'location', activeStory.imageHistory?.filter(img => img.entityId === loc.id))}
                              {displayedImage ? (
                                <img 
                                  src={displayedImage} 
                                  alt={loc.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 brightness-90"
                                />
                              ) : (
                                <div className="absolute inset-0 bg-gradient-to-b from-void via-portal/5 to-void flex flex-col items-center justify-center p-3 text-center">
                                  <div className="absolute inset-0 bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:12px_12px] opacity-40"></div>
                                  <Compass size={18} className="text-neutral-800 mb-1" />
                                  <span className="text-[7.5px] text-neutral-600 font-mono tracking-wider">LANDSCAPE GEOLOCK EMPTY</span>
                                </div>
                              )}

                              {/* Safety index rating badge */}
                              <span className={`absolute top-2 right-2 text-[7.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                                loc.safetyLevel === 'Safe' ? 'bg-green-950/30 text-green-400 border-green-900' :
                                loc.safetyLevel === 'Dangerous' ? 'bg-yellow-950/30 text-yellow-500 border-yellow-900' :
                                'bg-red-950/30 text-human border-red-900 animate-pulse'
                              }`}>
                                {loc.safetyLevel}
                              </span>

                              {/* Realm indicator top left */}
                              {loc.realm && (
                                <span className="absolute top-2 left-2 text-[7.5px] font-mono bg-black/80 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-850">
                                  {loc.realm}
                                </span>
                              )}

                              {activePreview && (
                                <div className="absolute inset-x-0 bottom-0 bg-neutral-950/90 text-[9px] font-mono font-bold uppercase py-1 text-center text-gold-accent border-t border-gold-accent/30 tracking-widest z-10 animate-pulse">
                                  Evolution Preview
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                              <div>
                                <h5 className="font-sc font-medium text-signal text-xs flex justify-between">
                                  <span>{loc.name}</span>
                                </h5>
                                <p className="text-[10px] text-neutral-400 leading-normal font-sans italic mt-1 line-clamp-2">
                                  "{loc.description || 'Spatial atmospheric arrays remain closed from investigation.'}"
                                </p>
                              </div>

                              <div className="pt-3 border-t border-neutral-950 flex flex-col gap-2">
                                {loc.evolutionReady && !activePreview && (
                                  <div className="text-[9px] font-mono text-portal animate-pulse flex items-center gap-1.5 mb-1 px-1">
                                    <Sparkles size={8} />
                                    <span>Evolution Available: {loc.evolutionReason || "Atmosphere Shift"}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    onClick={() => handleDeleteLocation(loc.id)}
                                    className="text-[9px] text-neutral-600 hover:text-human uppercase font-mono flex-shrink-0"
                                  >
                                    Purge Node
                                  </button>
                                  <button
                                    onClick={() => handleAwakenCardImage(loc.id, 'location', loc)}
                                    disabled={isGenerating || !canGenerate}
                                    className={`px-2 flex-grow py-1 rounded text-[8.5px] border uppercase font-mono tracking-wider flex items-center justify-center space-x-1 font-bold ${
                                      isGenerating
                                        ? 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-wait'
                                        : !canGenerate
                                        ? 'bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-75'
                                        : loc.evolutionReady
                                        ? 'bg-portal border-portal text-void shadow-[0_0_10px_rgba(4,172,255,0.4)]'
                                        : 'bg-void border-portal/15 text-portal hover:border-portal hover:bg-portal/5 hover:shadow-[0_0_8px_rgba(4,172,255,0.2)]'
                                    }`}
                                    title={!canGenerate ? "Progression required to awaken further vistas." : ""}
                                  >
                                        {isGenerating ? (
                                          <>
                                            <RefreshCcw size={8} className="animate-spin" />
                                            <span>VERSA...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Compass size={8} className={loc.evolutionReady ? 'text-void' : 'text-portal'} />
                                            <span>{loc.evolutionReady ? 'Awaken Evolution' : hasImage ? 'Requires Progression' : 'Awaken Vistas'}</span>
                                          </>
                                        )}
                                      </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Profiles Detailed loop fallback list */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {charsToRender.map((char) => {
                  const isEditing = editingCharId === char.id;
                  const charStatusColor = 
                    char.status === 'alive' ? 'text-green-400 border-green-950 bg-green-950/20' :
                    char.status === 'deceased' ? 'text-human border-red-950 bg-red-950/20 line-through' :
                    char.status === 'ascended' ? 'text-portal border-cyan-950 bg-cyan-950/20' :
                    'text-neutral-500 border-neutral-900 bg-neutral-950';

                  return (
                    <div key={char.id} className="bg-neutral-950/40 border border-neutral-900 p-4 rounded-lg flex flex-col justify-between relative">
                      <div className="absolute top-4 right-4 flex space-x-1 items-center">
                        {char.relevanceState && char.relevanceState.toLowerCase() !== 'active' && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900/50 text-neutral-400 font-mono uppercase">
                            {char.relevanceState}
                          </span>
                        )}
                        <span className={`text-[9px] px-2 py-0.5 rounded border font-mono ${charStatusColor}`}>
                          {char.status}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-sc font-medium text-signal text-sm">{char.name}</h4>
                        <span className="text-[10px] text-portal uppercase tracking-wider block">{char.role}</span>
                        <p className="text-[11px] text-neutral-400 font-sans italic mt-2 leading-relaxed">"{char.description}"</p>
                      </div>

                      {isEditing ? (
                        <div className="bg-black/95 absolute inset-0 p-4 rounded-lg flex flex-col justify-between z-10 text-xs text-neutral-300">
                          <div className="space-y-2">
                            <h5 className="font-sc font-bold uppercase text-portal">Refine {char.name}'s Soul Aura</h5>
                            <div>
                              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Cultivation Realm</label>
                              <input 
                                type="text"
                                value={editingCharData.powerLevel}
                                onChange={(e) => setEditingCharData({ ...editingCharData, powerLevel: e.target.value })}
                                className="bg-neutral-900 border border-neutral-850 p-1 w-full text-xs text-signal"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-neutral-500 uppercase block mb-0.5">Sect Affiliation</label>
                              <input 
                                type="text"
                                value={editingCharData.faction}
                                onChange={(e) => setEditingCharData({ ...editingCharData, faction: e.target.value })}
                                className="bg-neutral-900 border border-neutral-850 p-1 w-full text-xs text-signal"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2 pt-2">
                            <button onClick={() => setEditingCharId(null)} className="text-neutral-500">Abort</button>
                            <button onClick={() => handleSaveCharEdit(char.id)} className="bg-portal text-void px-2 py-0.5 rounded font-bold">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-neutral-900 mt-4 pt-3 flex justify-between items-center text-[10px]">
                          <span className="text-neutral-500">Relation to MC: <strong className="text-neutral-300 font-medium">{char.relationshipToMC || 'Neutral'}</strong></span>
                          <button
                            onClick={() => {
                              setEditingCharId(char.id);
                              setEditingCharData({
                                powerLevel: char.powerLevel || '',
                                faction: char.faction || '',
                                abilitiesInput: char.abilities ? char.abilities.join(', ') : ''
                              });
                            }}
                            className="text-neutral-500 hover:text-portal transition-colors font-sc uppercase"
                          >
                            Refine
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PAGE 2: Relationship Map (Karma Web Relationship Graph) */}
        {activePage === 'relations' && (
          <div className="space-y-6 animate-fadeIn" id="codex-relationships">
            <div className="border-b border-neutral-900 pb-3">
              <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">The Celestial Karma Web</h3>
              <p className="text-[10px] text-neutral-500 font-sans">Click on any Daoist node around {mcName}'s cosmic grid to inspect their physical alignment vectors.</p>
            </div>

            {charsToRender.length === 0 ? (
              <div className="text-center py-20 border border-neutral-900 rounded bg-neutral-950/20 text-xs text-neutral-500 italic">
                No active secondary nodes present. Mapping remains locked to the Void.
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Visual SVG Map block */}
                <div className="flex-1 bg-neutral-950/50 border border-neutral-900 rounded-lg p-4 flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
                  <div className="absolute top-2 left-2 text-[9px] px-2 py-0.5 bg-black border border-neutral-900 rounded font-mono text-neutral-500 uppercase">
                    Interactive Karma Interface
                  </div>

                  {/* SVG Mapping nodes */}
                  <svg className="w-full max-w-[420px] h-[340px]" viewBox="0 0 400 320">
                    <defs>
                      <filter id="glow-portal" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Draw connecting lines */}
                    {charsToRender.map((char, index) => {
                      const total = charsToRender.length;
                      const angle = (index * 2 * Math.PI) / total;
                      const radius = 100;
                      const cx = 200 + radius * Math.cos(angle);
                      const cy = 160 + radius * Math.sin(angle);

                      // Determine thread color based on attitude
                      const attitude = char.relationshipToMC?.toLowerCase() || '';
                      let strokeColor = '#4a4a4a'; // Default neutral gray
                      if (attitude.includes('enemy') || attitude.includes('host') || attitude.includes('hate') || attitude.includes('rival')) {
                        strokeColor = '#8B0000'; // Human Core Blood Red
                      } else if (attitude.includes('ally') || attitude.includes('friend') || attitude.includes('loyal') || attitude.includes('fiance')) {
                        strokeColor = '#04ACFF'; // Portal Cyan
                      } else if (attitude.includes('mentor') || attitude.includes('master') || attitude.includes('teacher') || attitude.includes('elder')) {
                        strokeColor = '#eab308'; // Gold
                      }

                      return (
                        <g key={`line-${char.id}`}>
                          <line 
                            x1="200" 
                            y1="160" 
                            x2={cx} 
                            y2={cy} 
                            stroke={strokeColor} 
                            strokeWidth={selectedNodeChar?.id === char.id ? "3.5" : "1.5"} 
                            opacity={selectedNodeChar ? (selectedNodeChar.id === char.id ? "1" : "0.3") : "0.75"}
                            className="transition-all duration-300"
                          />
                        </g>
                      );
                    })}

                    {/* Render Center Node representing MC */}
                    <g transform="translate(200, 160)" className="cursor-pointer">
                      <circle cx="0" cy="0" r="26" fill="#000000" stroke="#04ACFF" strokeWidth="2.5" filter="url(#glow-portal)" />
                      <circle cx="0" cy="0" r="22" fill="#000000" stroke="#8B0000" strokeWidth="1" />
                      <text 
                        x="0" 
                        y="3" 
                        textAnchor="middle" 
                        fill="#FAFAFA" 
                        className="font-sc text-[9px] font-bold tracking-widest pointer-events-none"
                      >
                        {mcName.split(' ')[0]}
                      </text>
                    </g>

                    {/* Render Circular character nodes */}
                    {charsToRender.map((char, index) => {
                      const total = charsToRender.length;
                      const angle = (index * 2 * Math.PI) / total;
                      const radius = 100;
                      const cx = 200 + radius * Math.cos(angle);
                      const cy = 160 + radius * Math.sin(angle);

                      const isSelected = selectedNodeChar?.id === char.id;
                      const attitude = char.relationshipToMC?.toLowerCase() || '';
                      let strokeColor = '#525252';
                      if (attitude.includes('enemy') || attitude.includes('host') || attitude.includes('hate') || attitude.includes('rival')) {
                        strokeColor = '#8B0000';
                      } else if (attitude.includes('ally') || attitude.includes('friend') || attitude.includes('loyal') || attitude.includes('fiance')) {
                        strokeColor = '#04ACFF';
                      } else if (attitude.includes('mentor') || attitude.includes('master')) {
                        strokeColor = '#eab308';
                      }

                      return (
                        <g 
                          key={`node-${char.id}`} 
                          transform={`translate(${cx}, ${cy})`}
                          className="cursor-pointer group"
                          onClick={() => setSelectedNodeChar(char)}
                        >
                          {/* Inner pulsing layer */}
                          <circle cx="0" cy="0" r={isSelected ? "17" : "13"} fill="#000000" stroke={strokeColor} strokeWidth={isSelected ? "3" : "1.5"} />
                          {char.status === 'deceased' && (
                            <line x1="-8" y1="-8" x2="8" y2="8" stroke="#8B0000" strokeWidth="2" opacity="0.8" />
                          )}
                          <text 
                            x="0" 
                            y="24" 
                            textAnchor="middle" 
                            fill={isSelected ? "#FAFAFA" : "#a3a3a3"} 
                            className="font-sans text-[8px] pointer-events-none font-bold tracking-tight"
                          >
                            {char.name.split(' ')[0]}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Inspect Card Profile Panel */}
                <div className="w-full lg:w-72 bg-neutral-950/80 border border-neutral-900 rounded-lg p-4 flex flex-col justify-between">
                  {selectedNodeChar ? (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="border-b border-neutral-900 pb-2 flex items-center justify-between">
                        <span className="text-[9px] text-portal font-mono uppercase font-bold tracking-widest">Active Resonance details</span>
                        <button 
                          onClick={() => setSelectedNodeChar(null)}
                          className="text-[9px] text-neutral-600 hover:text-neutral-400 capitalize"
                        >
                          Clear
                        </button>
                      </div>

                      {selectedNodeChar.imageUrl && (
                        <div className="h-28 w-full rounded overflow-hidden border border-neutral-900">
                          <img src={selectedNodeChar.imageUrl} alt={selectedNodeChar.name} className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      
                      <div>
                        <h4 className="font-sc font-bold text-signal text-sm">{selectedNodeChar.name}</h4>
                        <span className="text-[10px] text-neutral-500 font-sans block">{selectedNodeChar.role}</span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between p-1 px-2 bg-void border border-neutral-900 rounded">
                          <span className="text-neutral-600 text-[8.5px] uppercase tracking-wider font-mono">Bonds to MC:</span>
                          <span className="text-human font-semibold text-[10px]">{selectedNodeChar.relationshipToMC}</span>
                        </div>
                        <div className="flex items-center justify-between p-1 px-2 bg-void border border-neutral-900 rounded">
                          <span className="text-neutral-600 text-[8.5px] uppercase tracking-wider font-mono">Status:</span>
                          <span className="text-neutral-400 font-mono text-[9px] uppercase">{selectedNodeChar.status}</span>
                        </div>
                        {selectedNodeChar.powerLevel && (
                          <div className="flex items-center justify-between p-1 px-2 bg-void border border-neutral-900 rounded">
                            <span className="text-neutral-600 text-[8.5px] uppercase tracking-wider font-mono">Realm:</span>
                            <span className="text-yellow-500 font-mono text-[9.5px]">{selectedNodeChar.powerLevel}</span>
                          </div>
                        )}
                        {selectedNodeChar.faction && (
                          <div className="flex items-center justify-between p-1 px-2 bg-void border border-neutral-900 rounded">
                            <span className="text-neutral-600 text-[8.5px] uppercase tracking-wider font-mono">Sect Affiliation:</span>
                            <span className="text-neutral-400 text-[9.5px] truncate max-w-[130px]">{selectedNodeChar.faction}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] text-neutral-400 leading-normal italic font-serif">
                        "{selectedNodeChar.description}"
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <HelpCircle size={28} className="text-neutral-800 mb-2 animate-pulse" />
                      <h4 className="font-sc text-xs text-neutral-400 uppercase tracking-widest font-semibold">Sensor Idle</h4>
                      <p className="text-[9.5px] text-neutral-600 font-sans mt-1 max-w-xs mx-auto leading-relaxed">
                        Tap any spirit node in the cosmic geometry to inspect special causal relationship bindings.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Custom Interactive Karma Bonds Panel */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-neutral-900 bg-void/50 p-6 rounded-lg border border-neutral-900">
                
                {/* Form to Create Custom Bond */}
                <div className="md:col-span-1 space-y-4">
                  <div>
                    <h4 className="font-sc font-bold text-portal text-xs uppercase tracking-widest flex items-center space-x-1.5">
                      <ArrowLeftRight size={14} />
                      <span>Engrave Karma Bond Link</span>
                    </h4>
                    <p className="text-[10px] text-neutral-500 font-sans mt-1">
                      Forge a manual fate thread linking two sovereign souls together in the persistent cosmic matrix.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block mb-1">Source Character</label>
                      <select
                        value={bondSourceId}
                        onChange={(e) => setBondSourceId(e.target.value)}
                        className="w-full bg-black border border-neutral-800 text-xs text-neutral-300 rounded p-2 focus:outline-none"
                      >
                        <option value="">-- Choose Soul --</option>
                        {memory.characters.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block mb-1">Target Character</label>
                      <select
                        value={bondTargetId}
                        onChange={(e) => setBondTargetId(e.target.value)}
                        className="w-full bg-black border border-neutral-800 text-xs text-neutral-300 rounded p-2 focus:outline-none"
                      >
                        <option value="">-- Choose Soul --</option>
                        {memory.characters.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">Affinity Score</label>
                        <span className={`text-[10px] font-mono font-bold ${bondAffinity < 0 ? 'text-human' : bondAffinity > 0 ? 'text-portal' : 'text-neutral-500'}`}>
                          {bondAffinity > 0 ? `+${bondAffinity}` : bondAffinity}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={bondAffinity}
                        onChange={(e) => setBondAffinity(parseInt(e.target.value))}
                        className="w-full text-portal bg-neutral-900 rounded"
                      />
                      <div className="flex justify-between text-[8px] text-neutral-600 font-mono">
                        <span>Deadly Enemy (-100)</span>
                        <span>Neutral</span>
                        <span>Eternal Mirror (+100)</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block mb-1">Causal Narrative / Link Description</label>
                      <textarea
                        placeholder="e.g. Sworn companion, linked by the blood of the Azure Wyrm..."
                        value={bondDesc}
                        onChange={(e) => setBondDesc(e.target.value)}
                        className="w-full h-16 bg-black border border-neutral-800 text-xs text-neutral-300 rounded p-2 focus:outline-none resize-none font-serif"
                      />
                    </div>

                    <button
                      onClick={handleAddCustomRelationship}
                      className="w-full py-2 bg-portal text-void text-[10px] uppercase font-sc font-bold tracking-widest rounded hover:brightness-115 transition-all"
                    >
                      Bind Thread
                    </button>
                  </div>
                </div>

                {/* Display Active Relationships Ledger */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                    <h4 className="font-sc font-bold text-signal text-xs uppercase tracking-widest flex items-center space-x-1.5">
                      <Network size={14} />
                      <span>Active Custom Bonds Ledger</span>
                    </h4>
                    <span className="text-[10px] font-mono text-neutral-500">{(activeStory.relationships || []).length} registered threads</span>
                  </div>

                  <VirtualizedList
                    items={activeStory.relationships || []}
                    itemHeight={80} // Estimated height of each relationship bond card inside the grid list
                    containerHeight={300}
                    className="pr-2"
                    emptyPlaceholder={
                      <div className="h-full py-16 flex flex-col items-center justify-center text-center border border-dashed border-neutral-900 rounded">
                        <p className="font-serif italic text-neutral-500 text-xs">"No custom karma strands recorded. Link cultivators on your left."</p>
                      </div>
                    }
                    renderItem={(bond) => (
                      <div key={bond.id} className="p-3 bg-neutral-950 border border-neutral-900 rounded flex justify-between items-start gap-4">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-sc font-bold text-signal">{bond.sourceCharName}</span>
                            <span className="text-[9px] font-mono text-neutral-600">to</span>
                            <span className="text-xs font-sc font-bold text-signal">{bond.targetCharName}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono uppercase ${
                              bond.affinity < -40 ? 'bg-[#8B0000]/10 border border-[#8B0000]/25 text-human' : 
                              bond.affinity > 40 ? 'bg-portal/10 border border-portal/25 text-portal' :
                              'bg-neutral-900 border border-neutral-800 text-neutral-400'
                            }`}>
                              Affinity: {bond.affinity > 0 ? `+${bond.affinity}` : bond.affinity}%
                            </span>
                          </div>
                          <p className="text-[11px] font-serif text-neutral-400 italic">
                            "{bond.description}"
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteCustomRelationship(bond.id)}
                          className="p-1 px-1.5 text-neutral-500 hover:text-human hover:bg-neutral-900 rounded transition-colors"
                          title="Purge link"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  />
                </div>

              </div>

            </div>
          )}

        {/* PAGE 3: Power system (Sovereign Cultivation Power-Ranking Chart) */}
        {activePage === 'power' && (
          <div className="space-y-6 animate-fadeIn" id="codex-power-system-leadboard">
            <div className="border-b border-neutral-900 pb-3 flex justify-between items-end">
              <div>
                <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Sovereign Cultivation Leaderboard</h3>
                <p className="text-[10px] text-neutral-500 font-sans">Power rankings distill standard cultivation tiers into exact energetic indexes.</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 font-mono bg-neutral-950 border border-neutral-900 text-yellow-500 rounded">
                Active Tier: {memory.currentPowerStage}
              </span>
            </div>

            {/* Dynamic visual ranking bar charts */}
            <div className="space-y-5 bg-neutral-950/60 p-4 rounded-lg border border-neutral-900">
              <span className="text-[10px] font-mono tracking-widest uppercase text-portal font-semibold block">Combat Prowess Graph</span>
              
              <div className="space-y-3">
                {/* Always include Main Character Han Feng / MC at their current live rank */}
                {(() => {
                  const mcScore = getPowerRankScore(memory.currentPowerStage);
                  
                  return (
                    <div className="space-y-1 bg-void/50 p-2.5 rounded border border-portal/20">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-[9.5px] px-1.5 bg-portal/10 text-portal font-mono rounded">MC</span>
                          <strong className="text-signal">{mcName} (You)</strong>
                        </div>
                        <span className="text-portal font-mono font-bold text-[11px]">Rank Index: {mcScore.score}/100</span>
                      </div>
                      <div className="h-2 bg-neutral-900 rounded overflow-hidden relative">
                        <div className="bg-gradient-to-r from-portal via-cyan-400 to-signal h-full rounded transition-all duration-1000" style={{ width: `${mcScore.score}%` }}></div>
                        <div className="absolute inset-y-0 right-0 w-[1.5px] bg-white animate-pulse"></div>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-neutral-500 font-mono">
                        <span>Min Stage</span>
                        <span>{memory.currentPowerStage} ({mcScore.title})</span>
                        <span>Max Sovereign</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Secondary characters in order of power level */}
                {charsToRender
                  .map(c => ({ char: c, stats: getPowerRankScore(c.powerLevel) }))
                  .sort((a, b) => b.stats.score - a.stats.score)
                  .map(({ char, stats }) => {
                    return (
                      <div key={char.id} className="space-y-1 bg-void/30 p-2.5 border border-neutral-900/40 rounded hover:border-neutral-800 transition-all">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="text-[9.5px] font-mono uppercase px-1 rounded bg-neutral-900 text-neutral-500">Node</span>
                            <span className="text-neutral-200 font-medium">{char.name}</span>
                            <span className="text-[10px] text-neutral-500 font-sans italic">({char.role.split(',')[0]})</span>
                          </div>
                          <span className="text-yellow-500 font-mono font-bold text-[11px]">{stats.score}/100</span>
                        </div>
                        <div className="h-2 bg-neutral-900/60 rounded overflow-hidden">
                          <div className="bg-gradient-to-r from-yellow-700 via-yellow-500 to-amber-300 h-full rounded" style={{ width: `${stats.score}%` }}></div>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-neutral-500 font-mono">
                          <span>{char.powerLevel || 'Level Unlisted'}</span>
                          <span>Realm Title: {stats.title}</span>
                        </div>
                      </div>
                    );
                  })
                }

                {charsToRender.length === 0 && (
                  <div className="text-center py-6 text-neutral-600 font-serif italic text-xs">
                    No secondary Daoist ranks mapped yet. Introduce them in scriptures.
                  </div>
                )}
              </div>
            </div>

            {/* General World system explanation definition rules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-neutral-950/40 border border-neutral-900 rounded-lg text-xs leading-relaxed space-y-2">
                <span className="text-[10px] text-human uppercase font-bold tracking-widest block font-sc">Cultivation System Rules</span>
                <p className="text-neutral-400 font-serif italic font-light">“{memory.powerSystem}”</p>
              </div>

              <div className="p-4 bg-neutral-950/40 border border-neutral-900 rounded-lg text-xs leading-relaxed space-y-2">
                <span className="text-[10px] text-portal uppercase font-bold tracking-widest block font-sc">Universal Laws of Void</span>
                <ul className="list-disc pl-4 space-y-1.5 text-neutral-400">
                  {memory.worldRules?.map((rule, idx) => (
                    <li key={idx} className="font-sans font-light">{rule}</li>
                  ))}
                  {(!memory.worldRules || memory.worldRules.length === 0) && (
                    <li>No laws codified yet. Survival is standard.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 3B: Progression Dashboards (Aether Dashboards) */}
        {activePage === 'dashboards' && (
          <div className="space-y-6 animate-fadeIn text-neutral-225" id="codex-progression-dashboards">
            <div className="border-b border-neutral-900 pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Chronicles of the Heavenly Path</h3>
                <p className="text-[10px] text-neutral-500 font-sans">Aether metrics illustrating MC cultivation breakthroughs and secondary character affinity timelines.</p>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-[10px] px-2 py-0.5 font-mono bg-neutral-900 border border-neutral-850 text-cyan-400 rounded">
                  Chapters Logged: {flatChapters.length}
                </span>
                <span className="text-[10px] px-2 py-0.5 font-mono bg-neutral-900 border border-neutral-850 text-yellow-500 rounded">
                  Current Rank: {memory.currentPowerStage || 'None'}
                </span>
              </div>
            </div>

            {flatChapters.length === 0 ? (
              <div className="text-center py-20 border border-neutral-900 rounded-lg bg-neutral-950/20 text-xs text-neutral-500 italic space-y-3">
                <p>The Akashic Record remains void. The paths of destiny are yet unwritten.</p>
                <p className="text-[10px] text-neutral-600 not-italic">Write or generate standard chapters inside the core Reader to materialize interactive progression maps.</p>
              </div>
            ) : (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Visual Charts Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* CHART 1: Relationship Affinity Timeline Chart */}
                  <div className="bg-neutral-950/40 border border-neutral-900 rounded-xl p-4 md:p-5 flex flex-col space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-900 pb-3">
                      <div className="flex items-center space-x-2">
                        <Heart size={14} className="text-rose-500 shrink-0" />
                        <span className="font-sc font-bold text-xs uppercase tracking-wider text-signal">Affinity Chronology</span>
                      </div>
                      
                      {/* Character Selector Option */}
                      {memory.characters.length > 0 ? (
                        <select
                          value={selectedChartCharId}
                          onChange={(e) => {
                            setSelectedChartCharId(e.target.value);
                            setHoveredAffPoint(null);
                          }}
                          className="text-[11px] bg-void border border-neutral-850 rounded px-2.5 py-1 text-neutral-300 focus:outline-none focus:border-portal cursor-pointer max-w-[180px] truncate"
                        >
                          {charsToRender.map((char) => (
                            <option key={char.id} value={char.id}>
                              {char.name} ({char.role.split(',')[0]})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[10px] text-neutral-600">No companions bound</span>
                      )}
                    </div>

                    {charsToRender.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center py-10 text-xs text-neutral-500 italic">
                        Align secondary characters in the Living Codex first to map karmic affinity.
                      </div>
                    ) : (
                      <div className="space-y-4 flex-1 flex flex-col justify-between">
                        {/* Interactive SVG Line Graph for Affinity */}
                        {(() => {
                          const activeChar = charsToRender.find(c => c.id === selectedChartCharId);
                          if (!activeChar) return null;
                          const points = affinityTimelineOfChar;
                          const total = points.length;

                          // Dimensions
                          const w = 500;
                          const h = 200;
                          const padL = 40;
                          const padR = 20;
                          const padT = 20;
                          const padB = 30;

                          const graphW = w - padL - padR;
                          const graphH = h - padT - padB;

                          const coords = points.map((p, i) => {
                            const x = padL + (total > 1 ? (i / (total - 1)) * graphW : graphW / 2);
                            const normY = (p.affinity + 100) / 200;
                            const y = padT + (1 - normY) * graphH;
                            return { x, y, p, index: i };
                          });

                          let linePath = '';
                          if (coords.length > 0) {
                            linePath = `M ${coords[0].x} ${coords[0].y}`;
                            for (let i = 1; i < coords.length; i++) {
                              linePath += ` L ${coords[i].x} ${coords[i].y}`;
                            }
                          }

                          const displayPoint = hoveredAffPoint || (points.length > 0 ? points[points.length - 1] : null);

                          return (
                            <div className="space-y-4 flex-1 flex flex-col justify-between">
                              <div className="relative bg-void/50 border border-neutral-900/40 p-2 rounded-lg flex-1">
                                <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible select-none">
                                  {/* Gridlines */}
                                  <line x1={padL} y1={padT} x2={w - padR} y2={padT} stroke="#1b1b1b" strokeDasharray="3,3" />
                                  <line x1={padL} y1={padT + graphH/2} x2={w - padR} y2={padT + graphH/2} stroke="#3b2218" strokeDasharray="4,4" />
                                  <line x1={padL} y1={padT + graphH} x2={w - padR} y2={padT + graphH} stroke="#1b1b1b" strokeDasharray="3,3" />

                                  {/* Axes notes */}
                                  <text x={padL - 10} y={padT + 4} textAnchor="end" fill="#10b981" className="font-mono text-[8px] font-bold">100 (Boon)</text>
                                  <text x={padL - 10} y={padT + graphH/2 + 3} textAnchor="end" fill="#eab308" className="font-mono text-[8px] font-bold">0 (Neutral)</text>
                                  <text x={padL - 10} y={padT + graphH + 2} textAnchor="end" fill="#ef4444" className="font-mono text-[8px] font-bold">-100 (Foe)</text>

                                  {total > 1 && (
                                    <>
                                      <path
                                        d={linePath}
                                        fill="none"
                                        stroke="url(#gradient-affinity)"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        className="transition-all duration-500"
                                      />
                                      <defs>
                                        <linearGradient id="gradient-affinity" x1="0%" y1="0%" x2="100%" y2="0%">
                                          <stop offset="0%" stopColor="#ef4444" />
                                          <stop offset="50%" stopColor="#ca8a04" />
                                          <stop offset="100%" stopColor="#10b981" />
                                        </linearGradient>
                                      </defs>
                                    </>
                                  )}

                                  {coords.map((c) => {
                                    const isHovered = hoveredAffPoint?.chapterNumber === c.p.chapterNumber || (!hoveredAffPoint && c.index === total - 1);
                                    let nodeColor = '#3b82f6';
                                    if (c.p.affinity > 20) nodeColor = '#10b981';
                                    else if (c.p.affinity < -20) nodeColor = '#ef4444';
                                    else nodeColor = '#a3a3a3';

                                    return (
                                      <g key={c.p.chapterNumber}>
                                        <circle
                                          cx={c.x}
                                          cy={c.y}
                                          r={isHovered ? "6.5" : "4"}
                                          fill="#0a0a0a"
                                          stroke={nodeColor}
                                          strokeWidth={isHovered ? "2.5" : "1.2"}
                                          className="cursor-pointer transition-all duration-200 hover:scale-125"
                                          onClick={() => setHoveredAffPoint(c.p)}
                                        />
                                        {total <= 15 && (
                                          <text
                                            x={c.x}
                                            y={padT + graphH + 18}
                                            textAnchor="middle"
                                            fill="#666"
                                            className="font-mono text-[7px]"
                                          >
                                            Ch {c.p.chapterNumber}
                                          </text>
                                        )}
                                      </g>
                                    );
                                  })}
                                </svg>
                              </div>

                              {displayPoint && (
                                <div className="p-3 bg-neutral-900/60 border border-neutral-850 rounded-lg space-y-1.5 text-xs">
                                  <div className="flex items-center justify-between font-mono">
                                    <span className="font-bold text-signal">Chapter {displayPoint.chapterNumber}: {displayPoint.title}</span>
                                    <span className={`px-2 py-0.5 font-bold uppercase rounded text-[9px] ${
                                      displayPoint.affinity > 20 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                      displayPoint.affinity < -20 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                      'bg-neutral-800 text-neutral-400'
                                    }`}>
                                      Affinity: {displayPoint.affinity > 0 ? `+${displayPoint.affinity}` : displayPoint.affinity}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-neutral-400 leading-normal italic font-light font-serif">
                                    {displayPoint.eventSummary}
                                  </p>
                                  {displayPoint.hasInteraction && (
                                    <div className="flex items-center space-x-1 py-0.5 text-[9px] text-portal/80 font-mono">
                                      <span className="animate-pulse text-xs">•</span>
                                      <span>Direct alchemical alignment interface response logged inside original chapter script.</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* CHART 2: MC Breakthrough & Power Stage Curve Graph */}
                  <div className="bg-neutral-950/40 border border-neutral-900 rounded-xl p-4 md:p-5 flex flex-col space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-900 pb-3">
                      <div className="flex items-center space-x-2">
                        <Zap size={14} className="text-yellow-500 shrink-0" />
                        <span className="font-sc font-bold text-xs uppercase tracking-wider text-signal">MC breakthroughs progress</span>
                      </div>
                      <span className="text-[9.5px] uppercase font-mono px-2 py-0.5 border border-amber-500/20 text-yellow-500 bg-amber-500/5 rounded">
                        Ascension Path
                      </span>
                    </div>

                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      {/* Interactive SVG Staircase Curve for MC Cultivation */}
                      {(() => {
                        const points = powerTimeline;
                        const total = points.length;

                        // Dimensions
                        const w = 500;
                        const h = 200;
                        const padL = 40;
                        const padR = 20;
                        const padT = 20;
                        const padB = 30;

                        const graphW = w - padL - padR;
                        const graphH = h - padT - padB;

                        const coords = points.map((p, i) => {
                          const x = padL + (total > 1 ? (i / (total - 1)) * graphW : graphW / 2);
                          const normY = p.score / 100;
                          const y = padT + (1 - normY) * graphH;
                          return { x, y, p, index: i };
                        });

                        let curvePath = '';
                        if (coords.length > 0) {
                          curvePath = `M ${coords[0].x} ${coords[0].y}`;
                          for (let i = 1; i < coords.length; i++) {
                            const midX = coords[i-1].x + (coords[i].x - coords[i-1].x) * 0.4;
                            curvePath += ` L ${midX} ${coords[i-1].y} L ${midX} ${coords[i].y} L ${coords[i].x} ${coords[i].y}`;
                          }
                        }

                        const displayPoint = hoveredPowerPoint || (points.length > 0 ? points[points.length - 1] : null);

                        return (
                          <div className="space-y-4 flex-1 flex flex-col justify-between">
                            <div className="relative bg-void/50 border border-neutral-900/40 p-2 rounded-lg flex-1">
                              <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible select-none">
                                {/* Horizontal gridlines representing major celestial thresholds */}
                                <line x1={padL} y1={padT} x2={w - padR} y2={padT} stroke="#1b1b1b" />
                                <line x1={padL} y1={padT + graphH * 0.15} x2={w - padR} y2={padT + graphH * 0.15} stroke="#222" strokeDasharray="3,3" />
                                <line x1={padL} y1={padT + graphH * 0.3} x2={w - padR} y2={padT + graphH * 0.3} stroke="#222" strokeDasharray="3,3" />
                                <line x1={padL} y1={padT + graphH * 0.45} x2={w - padR} y2={padT + graphH * 0.45} stroke="#222" strokeDasharray="3,3" />
                                <line x1={padL} y1={padT + graphH * 0.65} x2={w - padR} y2={padT + graphH * 0.65} stroke="#222" strokeDasharray="3,3" />
                                <line x1={padL} y1={padT + graphH} x2={w - padR} y2={padT + graphH} stroke="#1b1b1b" />

                                {/* threshold labels */}
                                <text x={padL - 10} y={padT + graphH * 0.15 + 3} textAnchor="end" fill="#a855f7" className="font-mono text-[7px] font-medium">Nascent (85)</text>
                                <text x={padL - 10} y={padT + graphH * 0.3 + 3} textAnchor="end" fill="#ca8a04" className="font-mono text-[7px] font-medium">Core (70)</text>
                                <text x={padL - 10} y={padT + graphH * 0.45 + 3} textAnchor="end" fill="#04ACFF" className="font-mono text-[7px] font-medium">Found. (55)</text>
                                <text x={padL - 10} y={padT + graphH * 0.65 + 3} textAnchor="end" fill="#10b981" className="font-mono text-[7px] font-medium">Qi (35)</text>
                                <text x={padL - 10} y={padT + graphH + 2} textAnchor="end" fill="#525252" className="font-mono text-[7px] font-medium">Mortal</text>

                                {total > 1 && (
                                  <path
                                    d={curvePath}
                                    fill="none"
                                    stroke="#eab308"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    className="transition-all duration-500"
                                  />
                                )}

                                {coords.map((c) => {
                                  const isHovered = hoveredPowerPoint?.chapterNumber === c.p.chapterNumber || (!hoveredPowerPoint && c.index === total - 1);
                                  const breakthroughNode = c.p.breakthrough;

                                  return (
                                    <g key={c.p.chapterNumber}>
                                      <circle
                                        cx={c.x}
                                        cy={c.y}
                                        r={isHovered ? "6.5" : breakthroughNode ? "5" : "3.5"}
                                        fill={breakthroughNode ? "#eab308" : "#0d0d0d"}
                                        stroke={breakthroughNode ? "#ca8a04" : "#ca8a04"}
                                        strokeWidth={isHovered ? "2.5" : breakthroughNode ? "1.5" : "1.2"}
                                        className={`cursor-pointer transition-all duration-200 ${breakthroughNode ? 'animate-pulse' : ''} hover:scale-125`}
                                        onClick={() => setHoveredPowerPoint(c.p)}
                                      />
                                      {total <= 15 && (
                                        <text
                                          x={c.x}
                                          y={padT + graphH + 18}
                                          textAnchor="middle"
                                          fill="#666"
                                          className="font-mono text-[7px]"
                                        >
                                          Ch {c.p.chapterNumber}
                                        </text>
                                      )}
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>

                            {displayPoint && (
                              <div className="p-3 bg-neutral-900/60 border border-neutral-850 rounded-lg space-y-1.5 text-xs">
                                <div className="flex items-center justify-between font-mono">
                                  <span className="font-bold text-signal">Chapter {displayPoint.chapterNumber}: {displayPoint.title}</span>
                                  <span className="font-bold text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded text-[9.5px] uppercase">
                                    {displayPoint.stageName}
                                  </span>
                                </div>
                                <p className="text-[11px] text-neutral-400 leading-normal italic font-light font-serif">
                                  {displayPoint.summary}
                                </p>
                                {displayPoint.breakthrough && (
                                  <div className="flex items-center space-x-1 text-[9px] text-yellow-500 font-mono">
                                    <Sparkles size={11} className="text-yellow-400 shrink-0" />
                                    <span>Core breakthrough advancement recorded inside celestial memory layers.</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                </div>

                {/* Bottom Full-Width Section: Karma Nodes Destiny Analysis */}
                <div className="bg-neutral-950/30 border border-neutral-900 rounded-xl p-4 md:p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                    <div className="flex items-center space-x-2">
                      <Network size={14} className="text-portal shrink-0" />
                      <span className="font-sc font-bold text-xs uppercase tracking-wider text-signal">Causal Destiny & Karma Balance</span>
                    </div>
                    <span className="text-[9.5px] font-mono text-neutral-500 bg-neutral-900 px-2 py-0.5 border border-neutral-850 rounded">
                      Causal Web Metrics
                    </span>
                  </div>

                  {(() => {
                    const nodes = activeStory.karmaNodes || [];
                    const activeNodes = nodes.filter(n => n.status === 'active');
                    const resolvedNodes = nodes.filter(n => n.status === 'resolved');

                    const debts = nodes.filter(n => n.type === 'Debt').length;
                    const boons = nodes.filter(n => n.type === 'Boon').length;
                    const enmities = nodes.filter(n => n.type === 'Enmity').length;
                    const destinies = nodes.filter(n => n.type === 'Destiny').length;

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        
                        <div className="p-4 bg-void/50 border border-neutral-900 rounded-lg flex flex-col justify-between">
                          <span className="text-[9px] font-mono uppercase text-neutral-500 tracking-wider">Active Karma Contracts</span>
                          <span className="text-2xl font-bold font-sc text-portal mt-2">{activeNodes.length}</span>
                          <span className="text-[9.5px] text-neutral-500 font-mono mt-1">{resolvedNodes.length} snaps resolved</span>
                        </div>

                        <div className="p-4 bg-void/50 border border-neutral-900 rounded-lg flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[9px] font-mono uppercase text-neutral-500 tracking-wider">
                            <span>Karmic Debts</span>
                            <span className="text-red-500">●</span>
                          </div>
                          <span className="text-2xl font-bold font-sc text-red-400 mt-2">{debts}</span>
                          <span className="text-[9.5px] text-neutral-500 font-sans mt-0.5 leading-snug">Spiritual blockages requiring master settlement.</span>
                        </div>

                        <div className="p-4 bg-void/50 border border-neutral-900 rounded-lg flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[9px] font-mono uppercase text-neutral-500 tracking-wider">
                            <span>Celestial Boons</span>
                            <span className="text-emerald-500">●</span>
                          </div>
                          <span className="text-2xl font-bold font-sc text-emerald-400 mt-2">{boons}</span>
                          <span className="text-[9.5px] text-neutral-500 font-sans mt-0.5 leading-snug">Sect inheritance or Master Gu blessings active.</span>
                        </div>

                        <div className="p-4 bg-void/50 border border-neutral-900 rounded-lg flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[9px] font-mono uppercase text-neutral-500 tracking-wider">
                            <span>Destinies & Enmities</span>
                            <span className="text-amber-500">●</span>
                          </div>
                          <span className="text-2xl font-bold font-sc text-amber-500 mt-2">{destinies + enmities}</span>
                          <span className="text-[9.5px] text-neutral-500 font-sans mt-0.5 leading-snug">Vengeful sect elders or fated ascension loops.</span>
                        </div>

                      </div>
                    );
                  })()}

                  {(!activeStory.karmaNodes || activeStory.karmaNodes.length === 0) && (
                    <div className="text-center py-4 text-[11px] text-neutral-500 font-sans italic">
                      No karma nodes have been bound in this mortal cycle yet. Engrave connections inside the **Karma Web** or use **Alter Fate** reader blocks to trigger destinies.
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* PAGE 4: Sects & Factions (Collapsible Faction Hierarchy) */}
        {activePage === 'factions' && (
          <div className="space-y-6 animate-fadeIn" id="codex-sects-and-factions">
            <div className="border-b border-neutral-900 pb-3 flex justify-between items-end">
              <div>
                <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Sect alliances & Hierarchies</h3>
                <p className="text-[10px] text-neutral-500 font-sans">Tree flow mapping describing who commands high elders, lineages, and outer disciples.</p>
              </div>
              <button
                onClick={() => setShowAddFactionForm(!showAddFactionForm)}
                className="px-2 py-1 bg-void hover:bg-neutral-900 font-sc font-bold border border-neutral-850 hover:border-neutral-700 text-neutral-400 hover:text-signal rounded text-[9px] uppercase tracking-wider flex items-center space-x-1"
              >
                <Plus size={10} />
                <span>Formulate Sect</span>
              </button>
            </div>

            {/* Input Form to add custom faction */}
            {showAddFactionForm && (
              <form onSubmit={handleAddFaction} className="p-4 bg-neutral-950 border border-neutral-900 rounded-lg space-y-3 animate-fadeIn text-xs max-w-lg">
                <h4 className="font-sc font-extrabold text-xs text-human tracking-wider uppercase">Inscribe Celestial Sect / Power</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Sect Name</label>
                    <input 
                      type="text"
                      value={newFaction.name}
                      onChange={(e) => setNewFaction({ ...newFaction, name: e.target.value })}
                      placeholder="e.g. Heavenly Peak Sect"
                      className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Alignment Creed</label>
                    <select
                      value={newFaction.alignment}
                      onChange={(e) => setNewFaction({ ...newFaction, alignment: e.target.value })}
                      className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                    >
                      <option value="Righteous">Righteous (Orthodox)</option>
                      <option value="Demonic">Demonic (Unorthodox)</option>
                      <option value="Neutral">Neutral (Isolated)</option>
                      <option value="Mysterious">Mysterious (Primordial)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Headquarters</label>
                    <input 
                      type="text"
                      value={newFaction.headquarters}
                      onChange={(e) => setNewFaction({ ...newFaction, headquarters: e.target.value })}
                      placeholder="e.g. Cloudrest Peak"
                      className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Status Status</label>
                    <select
                      value={newFaction.status}
                      onChange={(e) => setNewFaction({ ...newFaction, status: e.target.value })}
                      className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                    >
                      <option value="Active">Active & Prosperous</option>
                      <option value="Fractured">Fractured Internal Rebellion</option>
                      <option value="Destroyed">Destroyed Ruins (Extinct)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1 font-sc">Sect History & Grand Creed</label>
                  <textarea 
                    value={newFaction.description}
                    onChange={(e) => setNewFaction({ ...newFaction, description: e.target.value })}
                    placeholder="e.g. Masters of the Nine Heavenly Sword Arrays..."
                    rows={2}
                    className="bg-neutral-950 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-1 font-mono">
                  <button type="button" onClick={() => setShowAddFactionForm(false)} className="text-neutral-500">Cancel</button>
                  <button type="submit" className="bg-portal text-void px-3 py-1 font-bold rounded">Inscribe</button>
                </div>
              </form>
            )}

            {/* Structured Collapsible Hierarchical grid */}
            <div className="grid grid-cols-1 gap-5">
              {!factionsToRender || factionsToRender.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-neutral-900 rounded bg-neutral-950/20 text-xs text-neutral-500 italic">
                  No registered religious sects found. Fabricate your starting sects in chapter writing or add one above!
                </div>
              ) : (
                factionsToRender.map((fac) => {
                  // Find all living characters whose sector affiliation matches this faction
                  const mates = memory.characters.filter(c => c.faction?.toLowerCase().includes(fac.name.toLowerCase()));
                  const alignmentColor = 
                    fac.alignment === 'Righteous' ? 'text-green-400 border-green-950 bg-green-950/10' :
                    fac.alignment === 'Demonic' ? 'text-human border-red-950 bg-red-950/10' :
                    fac.alignment === 'Mysterious' ? 'text-portal border-cyan-950 bg-cyan-950/10 animate-pulse' :
                    'text-neutral-400 border-neutral-850 bg-neutral-950';

                  return (
                    <div key={fac.id} className="p-4 bg-neutral-950/60 border border-neutral-900 rounded-lg space-y-4">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <span className={`text-[8.5px] font-mono border px-2 py-0.5 rounded uppercase tracking-wider ${alignmentColor}`}>
                            {fac.alignment} Sector
                          </span>
                          <h4 className="font-sc font-bold text-signal text-base mt-2">{fac.name}</h4>
                          <span className="text-[10px] text-neutral-500 font-sans block mt-0.5">HQ: {fac.headquarters || 'Unknown Space coordinates'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[9px] px-1.5 py-0.25 rounded border font-mono ${
                            fac.status === 'Active' ? 'text-green-500 border-green-950' : 'text-yellow-500 border-yellow-950'
                          }`}>
                            {fac.status}
                          </span>
                          <button
                            onClick={() => handleDeleteFaction(fac.id)}
                            className="text-neutral-600 hover:text-human text-[9px] font-mono"
                          >
                            Dismantle
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-400 leading-relaxed font-serif bg-void/50 p-2.5 rounded border border-neutral-950">
                        "{fac.description || 'Creed manual is unreleased or holds secret legacy properties.'}"
                      </p>

                      {/* SECTION COMPONENT DIRECTLY LISTING HEIRARCHICAL TREE MEMBERS */}
                      <div className="pt-2">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold block mb-2">Sect Lineage tree members</span>
                        {mates.length === 0 ? (
                          <div className="text-[10.5px] text-neutral-600 bg-void/25 p-2 rounded border border-neutral-950 italic font-serif text-center">
                            No active Daoists currently bound to this sect's lineage.
                          </div>
                        ) : (
                          <div className="space-y-1.5 pl-3 border-l border-neutral-900">
                            {/* Compute hierarchy branches based on simple keyword search inside roles */}
                            {mates.some(c => c.role.toLowerCase().includes('leader') || c.role.toLowerCase().includes('master') || c.role.toLowerCase().includes('ancestor') || c.role.toLowerCase().includes('head')) && (
                              <div className="space-y-1">
                                <span className="text-[9.5px] uppercase font-sc text-human block tracking-widest">Sect Leader / Pillar:</span>
                                {mates.filter(c => c.role.toLowerCase().includes('leader') || c.role.toLowerCase().includes('master') || c.role.toLowerCase().includes('ancestor') || c.role.toLowerCase().includes('head')).map(mx => (
                                  <div key={mx.id} className="text-xs pl-2 text-neutral-300 font-sans flex items-center space-x-1">
                                    <span>├─</span>
                                    <strong className="text-signal">{mx.name}</strong>
                                    <span className="text-[9px] text-neutral-500">({mx.role})</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {mates.some(c => c.role.toLowerCase().includes('elder') || c.role.toLowerCase().includes('mentor') || c.role.toLowerCase().includes('grandmaster')) && (
                              <div className="space-y-1 pt-1">
                                <span className="text-[9.5px] uppercase font-sc text-yellow-500 block tracking-widest">Elders Council:</span>
                                {mates.filter(c => c.role.toLowerCase().includes('elder') || c.role.toLowerCase().includes('mentor') || c.role.toLowerCase().includes('grandmaster')).map(mx => (
                                  <div key={mx.id} className="text-xs pl-2 text-neutral-300 font-sans flex items-center space-x-1">
                                    <span>├─</span>
                                    <span>{mx.name}</span>
                                    <span className="text-[9px] text-neutral-500">({mx.role})</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {mates.some(c => !c.role.toLowerCase().includes('elder') && !c.role.toLowerCase().includes('mentor') && !c.role.toLowerCase().includes('grandmaster') && !c.role.toLowerCase().includes('leader') && !c.role.toLowerCase().includes('master') && !c.role.toLowerCase().includes('ancestor') && !c.role.toLowerCase().includes('head')) && (
                              <div className="space-y-1 pt-1">
                                <span className="text-[9.5px] uppercase font-sc text-portal block tracking-widest">Core & Outer Disciples:</span>
                                {mates.filter(c => !c.role.toLowerCase().includes('elder') && !c.role.toLowerCase().includes('mentor') && !c.role.toLowerCase().includes('grandmaster') && !c.role.toLowerCase().includes('leader') && !c.role.toLowerCase().includes('master') && !c.role.toLowerCase().includes('ancestor') && !c.role.toLowerCase().includes('head')).map(mx => (
                                  <div key={mx.id} className="text-xs pl-2 text-neutral-300 font-sans flex items-center space-x-1">
                                    <span>└─</span>
                                    <span>{mx.name}</span>
                                    <span className="text-[9px] text-neutral-500">({mx.role})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* PAGE 5: Artifacts Grid Gallery */}
        {activePage === 'artifacts' && (
          <div className="space-y-6 animate-fadeIn" id="codex-divine-artifacts">
            <div className="border-b border-neutral-900 pb-3 flex justify-between items-end">
              <div>
                <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Divine Treasure Vault Gallery</h3>
                <p className="text-[10px] text-neutral-500 font-sans">Behold artifacts, weapons, secret arrays, or sacred medicinal pills currently existing in memory.</p>
              </div>
              <button
                onClick={() => setShowAddArtifactForm(!showAddArtifactForm)}
                className="px-2 py-1 bg-void hover:bg-neutral-900 font-sc font-bold border border-neutral-850 hover:border-neutral-700 text-neutral-400 hover:text-signal rounded text-[9px] uppercase tracking-wider flex items-center space-x-1"
              >
                <Plus size={10} />
                <span>Forge Artifact</span>
              </button>
            </div>

            {/* Input form to add custom artifact */}
            {showAddArtifactForm && (
              <form onSubmit={handleAddArtifact} className="p-4 bg-neutral-950 border border-neutral-900 rounded-lg space-y-3 animate-fadeIn text-xs max-w-lg">
                <h4 className="font-sc font-extrabold text-xs text-human tracking-wider uppercase">Forge relic description</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Artifact Name</label>
                    <input 
                      type="text"
                      value={newArtifact.name}
                      onChange={(e) => setNewArtifact({ ...newArtifact, name: e.target.value })}
                      placeholder="e.g. Heavenly Cauldron"
                      className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Spiritual Tier Rank</label>
                    <select
                      value={newArtifact.tier}
                      onChange={(e) => setNewArtifact({ ...newArtifact, tier: e.target.value })}
                      className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                    >
                      <option value="Mortal">Mortal (Ordinary)</option>
                      <option value="Earth">Earth Rank (Spiritual)</option>
                      <option value="Heaven">Heaven Rank (Sacred)</option>
                      <option value="Primordial">Primordial Rank (Cosmic)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1 font-sc">Current Bearer / Owner</label>
                  <input 
                    type="text"
                    value={newArtifact.currentOwner}
                    onChange={(e) => setNewArtifact({ ...newArtifact, currentOwner: e.target.value })}
                    placeholder="e.g. Han Feng or Elder Qin"
                    className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1 font-sc">Description / Unique Capacity</label>
                  <textarea 
                    value={newArtifact.description}
                    onChange={(e) => setNewArtifact({ ...newArtifact, description: e.target.value })}
                    placeholder="What cosmic impact does this weapon hold? e.g. Speeds alchemical processes by tenfold..."
                    rows={2}
                    className="bg-neutral-950 border border-neutral-800 text-signal p-2 rounded w-full text-xs resize-none"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-1">
                  <button type="button" onClick={() => setShowAddArtifactForm(false)} className="text-neutral-500">Abort</button>
                  <button type="submit" className="bg-human text-signal px-4 py-1 rounded font-bold font-sc uppercase">Forge Relic</button>
                </div>
              </form>
            )}

            {/* List Artifacts Grid Gallery */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
              {!artifactsToRender || artifactsToRender.length === 0 ? (
                <div className="col-span-2 text-center py-12 border border-dashed border-neutral-900 rounded bg-neutral-950/20 text-xs text-neutral-500 italic">
                  No legendary relics found. Gather rare ores or let chapters uncover divine relics!
                </div>
              ) : (
                artifactsToRender.map((art) => {
                  const isGenerating = generatingId === art.id;
                  const hasImage = !!art.imageUrl;
                  const activePreview = previews[art.id];
                  const canGenerate = !hasImage || art.evolutionReady;
                  const displayedImage = activePreview ? activePreview.urls[activePreview.selectedIndex] : art.imageUrl;
                  const tierColor = 
                    art.tier === 'Primordial' ? 'text-yellow-400 border-yellow-950 bg-yellow-950/20' :
                    art.tier === 'Heaven' ? 'text-portal border-cyan-950 bg-cyan-950/20 animate-pulse' :
                    art.tier === 'Earth' ? 'text-green-400 border-green-950 bg-green-950/20' :
                    'text-neutral-500 border-neutral-900 bg-neutral-950';

                  return (
                    <div key={art.id} className={`p-4 bg-neutral-950/80 border ${art.evolutionReady && !activePreview ? 'border-portal/50 shadow-[0_0_15px_rgba(4,172,255,0.15)]' : 'border-neutral-900'} rounded-lg hover:border-neutral-850 flex flex-col justify-between transition-all`}>
                      <div>
                        <div className="relative group overflow-hidden rounded mb-3">
                          {/* Render relational artifact card portrait if available */}
                          {renderImageHistoryGallery(art.id, 'artifact', activeStory.imageHistory?.filter(img => img.entityId === art.id))}
                          {displayedImage ? (
                            <div className="h-32 w-full border border-neutral-900 relative">
                              <img src={displayedImage} alt={art.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                              {activePreview && (
                                <div className="absolute inset-x-0 bottom-0 bg-neutral-950/90 text-[9px] font-mono font-bold uppercase py-1 text-center text-gold-accent border-t border-gold-accent/30 tracking-widest z-10 animate-pulse">
                                  Evolution Preview
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-32 w-full border border-dashed border-neutral-800 flex flex-col items-center justify-center bg-black/40 text-neutral-600 rounded">
                              <Sword size={24} className="mb-2 opacity-50" />
                              <span className="text-[8px] tracking-widest font-mono uppercase">Unmanifested</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-sc font-bold text-signal text-sm tracking-wide">{art.name}</h4>
                          <span className={`text-[9px] border px-2 py-0.5 rounded font-mono uppercase tracking-widest ${tierColor}`}>
                            {art.tier}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-normal font-sans font-light italic mt-1 bg-void/50 p-2 border border-neutral-950 rounded">
                          "{art.description || 'Mystical values remain currently secret from mortal cultivators.'}"
                        </p>
                      </div>

                      <div className="border-t border-neutral-900 mt-4 pt-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-neutral-500 font-sans">
                            Bearer: <strong className="text-neutral-300 font-mono">{art.currentOwner || 'Unknown'}</strong>
                          </span>
                        </div>
                        
                        {art.evolutionReady && !activePreview && (
                          <div className="text-[9px] font-mono text-portal animate-pulse flex items-center gap-1.5 mb-1">
                            <Sparkles size={8} />
                            <span>Evolution Available: {art.evolutionReason || "Ownership Change"}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center mt-1 gap-2 border-t border-neutral-900/50 pt-2">
                              <button
                                onClick={() => handleDeleteArtifact(art.id)}
                                className="text-[9px] text-neutral-600 hover:text-human uppercase font-mono flex-shrink-0"
                              >
                                Shatter
                              </button>
                              <button
                                onClick={() => handleAwakenCardImage(art.id, 'artifact', art)}
                                disabled={isGenerating || !canGenerate}
                                className={`px-2 flex-grow py-1 rounded text-[8.5px] border uppercase font-mono tracking-wider flex items-center justify-center space-x-1 font-bold ${
                                  isGenerating
                                    ? 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-wait'
                                    : !canGenerate
                                    ? 'bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-75'
                                    : art.evolutionReady
                                    ? 'bg-portal border-portal text-void shadow-[0_0_10px_rgba(4,172,255,0.4)]'
                                    : 'bg-void border-portal/15 text-portal hover:border-portal hover:bg-portal/5 hover:shadow-[0_0_8px_rgba(4,172,255,0.2)]'
                                }`}
                                title={!canGenerate ? "Progression required to awaken Relic." : ""}
                              >
                                {isGenerating ? (
                                  <>
                                    <RefreshCcw size={8} className="animate-spin" />
                                    <span>Forging...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={8} className={art.evolutionReady ? 'text-void' : 'text-gold-accent'} />
                                    <span>{art.evolutionReady ? 'Awaken Evolution' : hasImage ? 'Requires Progression' : 'Generate Aura'}</span>
                                  </>
                                )}
                              </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* PAGE 6: Timeline (Chronology Chapter Recap Page) */}
        {activePage === 'timeline' && (
          <div className="space-y-6 animate-fadeIn" id="codex-timeline">
            <div className="border-b border-neutral-900 pb-3 flex justify-between items-end">
              <div>
                <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Chronicle Script Recaps</h3>
                <p className="text-[10px] text-neutral-500 font-sans">Interactive chapter highlights, written milestones, and quick shortcuts to read full text chapters.</p>
              </div>
            </div>

            <div className="pl-4">
              <VirtualizedList
                items={flatChapters}
                itemHeight={220} // Estimated average item height including margins and headings
                containerHeight={525}
                timelineLine={true}
                className="pr-2"
                emptyPlaceholder={
                  <div className="text-center py-12 border border-dashed border-neutral-900 rounded bg-neutral-950/20 text-xs text-neutral-500 italic">
                    Chronology empty. Generate and read your very first chapter to construct the causal timeline!
                  </div>
                }
                renderItem={(item, index) => {
                  const ch = item.chapter;
                  return (
                    <div key={ch.number} className="relative pb-2">
                      {/* Arc Title Node */}
                      {item.isFirstInArc && (
                        <div className="relative flex items-center mb-3 mt-4 select-none">
                          <span className="absolute -left-[14px] w-3 h-3 bg-human border-2 border-black rounded-full shadow-red animate-pulse"></span>
                          <h4 className="font-sc text-[10px] sm:text-xs text-human uppercase tracking-widest font-extrabold ml-1.5 leading-normal">
                            {item.arcTitle}
                          </h4>
                        </div>
                      )}

                      {/* Chapter Item */}
                      <div className="relative pl-4 space-y-1.5 p-3.5 bg-neutral-950 border border-neutral-900 rounded-lg hover:border-neutral-800 transition-all">
                        {/* Inner chapter dot */}
                        <span className="absolute -left-[13px] top-6.5 w-2.5 h-2.5 bg-portal rounded-full border-2 border-black shadow"></span>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-900 pb-2">
                          <span className="font-sans font-bold text-xs text-signal">
                            Chapter {ch.number}: "{ch.title}"
                          </span>
                          <div className="flex items-center gap-2">
                            {ch.statsChangeMessage && ch.statsChangeMessage !== 'None' && (
                              <span className="text-[8.5px] px-1.5 py-0.25 bg-amber-950/25 border border-amber-950 font-mono text-yellow-500 rounded">
                                {ch.statsChangeMessage}
                              </span>
                            )}
                            {onJumpToChapter && (
                              <button
                                onClick={() => onJumpToChapter(ch.number)}
                                className="px-2 py-0.5 bg-portal/10 text-portal rounded text-[8px] uppercase tracking-wider font-mono hover:bg-portal hover:text-void transition-all"
                              >
                                Read Scene Text
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="font-serif italic leading-relaxed text-[11px] text-neutral-300">
                          {ch.summary || "Chapter compiled successfully. View full text inside workspace script chambers."}
                        </div>

                        {/* Dynamic detailed highlights reconstructed from chapter contents */}
                        <div className="pt-2 grid grid-cols-2 gap-3 text-[9.5px]">
                          <div className="p-1 px-2.5 bg-void border border-neutral-900 rounded">
                            <span className="text-neutral-500 block font-mono font-bold">Resonance Breakthrough:</span>
                            <span className="text-neutral-300 italic">{ch.statsChangeMessage || 'Internal cultivation locked.'}</span>
                          </div>
                          <div className="p-1 px-2.5 bg-void border border-neutral-900 rounded">
                            <span className="text-neutral-500 block font-mono font-bold">Operational Catalyst:</span>
                            <span className="text-neutral-300 truncate block">{ch.premise}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          </div>
        )}

        {/* PAGE 7: Mysteries (Plots / Karma Threads) */}
        {activePage === 'mysteries' && (
          <div className="space-y-6 animate-fadeIn" id="codex-karma-ledger">
            <div className="border-b border-neutral-900 pb-3">
              <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Active Karma Threads</h3>
              <p className="text-[10px] text-neutral-500 font-sans">Open-ended threads, prophecies, and revenge promises awaiting causal resolutions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Unresolved threads column */}
              <div className="space-y-3">
                <span className="text-[10px] font-sc text-human uppercase tracking-widest block font-bold">Unresolved mysteries ({memory.unresolvedPlotThreads.length})</span>
                <div className="space-y-2">
                  {memory.unresolvedPlotThreads.length === 0 ? (
                    <p className="text-xs text-neutral-600 text-center py-6 bg-void/40 border border-neutral-950 rounded italic font-serif">
                      All karma cleared. No open plot tasks.
                    </p>
                  ) : (
                    memory.unresolvedPlotThreads.map((thread, idx) => (
                      <div key={idx} className="p-3 bg-neutral-950/40 border border-neutral-900 rounded-lg text-xs hover:border-neutral-850 flex items-start gap-2.5 animate-fadeIn">
                        <span className="p-1 bg-red-950/30 rounded text-human border border-red-950 flex-shrink-0">
                          <HelpCircle size={12} className="animate-pulse" />
                        </span>
                        <div className="space-y-1">
                          <p className="text-neutral-350 leading-relaxed font-sans">{thread}</p>
                          <span className="text-[9px] text-neutral-600 uppercase font-sc block">Opened destiny arc</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Resolved threads column */}
              <div className="space-y-3">
                <span className="text-[10px] font-sc text-green-500 uppercase tracking-widest block font-bold">Severed karma ({memory.resolvedPlotThreads?.length || 0})</span>
                <div className="space-y-2">
                  {!memory.resolvedPlotThreads || memory.resolvedPlotThreads.length === 0 ? (
                    <p className="text-xs text-neutral-600 text-center py-6 bg-void/40 border border-neutral-950 rounded italic font-serif">
                      No accomplished feats or severed threads. Continue reading to resolve karma.
                    </p>
                  ) : (
                    memory.resolvedPlotThreads.map((thread, idx) => (
                      <div key={idx} className="p-3 bg-neutral-950/50 border border-neutral-950 rounded-lg text-xs hover:border-neutral-850 opacity-60 flex items-start gap-2.5">
                        <span className="p-1 bg-green-950/30 rounded text-green-400 border border-green-950 flex-shrink-0">
                          <Check size={12} />
                        </span>
                        <div className="space-y-1">
                          <p className="text-neutral-500 leading-relaxed font-sans line-through italic">{thread}</p>
                          <span className="text-[9px] text-green-700 uppercase font-sc block">Causal resolution achieved</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Custom Interactive Karma Fate Decree Ledger */}
            <div className="mt-8 border-t border-neutral-900 pt-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-void/50 p-6 rounded-lg border border-neutral-900">
              
              {/* Form to Create Custom Fate Decree */}
              <div className="md:col-span-1 space-y-4">
                <div>
                  <h4 className="font-sc font-bold text-portal text-xs uppercase tracking-widest flex items-center space-x-1.5">
                    <Activity size={14} />
                    <span>Engrave Fate Decree</span>
                  </h4>
                  <p className="text-[10px] text-neutral-500 font-sans mt-1">
                    Proclaim a cosmic causal event node ("A owes B life-debt", "Sect targets character") to shape future arc generation.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block mb-1">Causal Source (Entity / Sect)</label>
                    <input
                      type="text"
                      placeholder="e.g. Master Han Feng"
                      value={fateSource}
                      onChange={(e) => setFateSource(e.target.value)}
                      className="w-full bg-black border border-neutral-800 text-xs text-neutral-300 rounded p-2 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block mb-1">Causal Target (Subject / Goal)</label>
                    <input
                      type="text"
                      placeholder="e.g. Golden Crow Sect Gate"
                      value={fateTarget}
                      onChange={(e) => setFateTarget(e.target.value)}
                      className="w-full bg-black border border-neutral-800 text-xs text-neutral-300 rounded p-2 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block mb-1">Severity</label>
                      <select
                        value={fateSeverity}
                        onChange={(e) => setFateSeverity(e.target.value as 'Minor' | 'Major' | 'Cosmic')}
                        className="w-full bg-black border border-neutral-800 text-xs text-neutral-300 rounded p-2 focus:outline-none"
                      >
                        <option value="Minor">Minor</option>
                        <option value="Major">Major</option>
                        <option value="Cosmic">Cosmic</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block mb-1">Fate Type</label>
                      <select
                        value={fateType}
                        onChange={(e) => setFateType(e.target.value as 'Debt' | 'Boon' | 'Enmity' | 'Destiny')}
                        className="w-full bg-black border border-neutral-800 text-xs text-neutral-300 rounded p-2 focus:outline-none"
                      >
                        <option value="Debt">Debt</option>
                        <option value="Boon">Boon</option>
                        <option value="Enmity">Enmity</option>
                        <option value="Destiny">Destiny</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block mb-1">Desc. or Karma Oath</label>
                    <textarea
                      placeholder="e.g. Bound by blood pact after defense of Cloud Peak. Han Feng cannot yield."
                      value={fateDesc}
                      onChange={(e) => setFateDesc(e.target.value)}
                      className="w-full h-16 bg-black border border-neutral-800 text-xs text-neutral-300 rounded p-2 focus:outline-none resize-none font-serif"
                    />
                  </div>

                  <button
                    onClick={handleAddCustomFateNode}
                    className="w-full py-2 bg-portal text-void text-[10px] uppercase font-sc font-bold tracking-widest rounded hover:brightness-115 transition-all"
                  >
                    Engrave Fate Decree
                  </button>
                </div>
              </div>

              {/* Display Active Fate Ledger */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                  <h4 className="font-sc font-bold text-signal text-xs uppercase tracking-widest flex items-center space-x-1.5">
                    <Compass size={14} />
                    <span>Engraved Karma Fate Table</span>
                  </h4>
                  <span className="text-[10px] font-mono text-neutral-500">{(activeStory.karmaNodes || []).length} engraved decrees</span>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {(activeStory.karmaNodes || []).length === 0 ? (
                    <div className="h-full py-16 flex flex-col items-center justify-center text-center border border-dashed border-neutral-900 rounded">
                      <p className="font-serif italic text-neutral-500 text-xs">"Slate of Karma Tablets is pristine. Engrave destiny decrees on your left."</p>
                    </div>
                  ) : (
                    activeStory.karmaNodes?.map(node => (
                      <div key={node.id} className={`p-3 border rounded flex justify-between items-start gap-4 transition-all ${
                        node.status === 'resolved' 
                          ? 'bg-neutral-900/30 border-neutral-950 opacity-55' 
                          : 'bg-neutral-950 border-neutral-900'
                      }`}>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-sc font-bold text-signal">{node.sourceName}</span>
                            <span className="text-[9px] font-mono text-neutral-600">⇄</span>
                            <span className="text-xs font-sc font-bold text-signal">{node.targetName}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono uppercase ${
                              node.severity === 'Cosmic' ? 'bg-[#8B0000]/10 border border-[#8B0000]/25 text-human font-bold animate-pulse' : 
                              node.severity === 'Major' ? 'bg-amber-500/10 border border-amber-500/25 text-yellow-500' :
                              'bg-neutral-900 border border-neutral-800 text-neutral-400'
                            }`}>
                              {node.severity}
                            </span>
                            <span className="text-[9px] font-mono text-neutral-500 uppercase px-1 bg-void border border-[#8B0000]/20 rounded text-human">
                              {node.type}
                            </span>
                          </div>
                          <p className={`text-[11px] font-serif hover:text-signal transition-colors leading-relaxed ${
                            node.status === 'resolved' ? 'line-through text-neutral-500 italic' : 'text-neutral-400'
                          }`}>
                            "{node.description}"
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <button
                            onClick={() => handleToggleFateNodeStatus(node.id)}
                            className={`p-1 px-1.5 rounded text-[9px] font-sc uppercase tracking-wider text-neutral-400 hover:text-signal transition-all border border-neutral-800 ${
                              node.status === 'resolved' ? 'bg-green-950/10 text-green-500 border-green-950/40' : 'bg-void'
                            }`}
                            title={node.status === 'resolved' ? 'Undo resolution' : 'Mark as severed'}
                          >
                            {node.status === 'resolved' ? 'Severed' : 'Sever Link'}
                          </button>
                          <button
                            onClick={() => handleDeleteFateNode(node.id)}
                            className="p-1 px-1.5 text-neutral-500 hover:text-human hover:bg-neutral-900 rounded transition-colors border border-transparent"
                            title="Purge decree"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* PAGE 8: Sovereign Glossary Tab */}
        {activePage === 'glossary' && (
          <div className="space-y-6 animate-fadeIn" id="codex-glossary-lookup">
            <div className="border-b border-neutral-900 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Sovereign Cultivation Glossary</h3>
                <p className="text-[10px] text-neutral-500 font-sans">Look up traditional light novel cultivation slang and dynamically extract story-specific concepts using Gemini.</p>
              </div>
              <button
                onClick={handleGenerateCustomGlossary}
                disabled={isExtractingGlossary}
                className={`px-3 py-1.5 rounded font-mono border font-bold text-[9px] uppercase tracking-wider flex items-center space-x-1 transition-all ${
                  isExtractingGlossary
                    ? 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-wait'
                    : 'bg-void border-purple-500/20 text-purple-400 hover:border-purple-500 hover:bg-purple-950/10'
                }`}
              >
                {isExtractingGlossary ? (
                  <>
                    <RefreshCcw size={10} className="animate-spin text-purple-400" />
                    <span>SCOUT is scanning...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={10} className="text-purple-400 animate-pulse" />
                    <span>Channel Story Lore</span>
                  </>
                )}
              </button>
            </div>

            {/* Error in glossary distillation */}
            {glossaryError && (
              <div className="p-3 bg-human/15 border border-human/25 rounded text-[10px] text-neutral-300 font-sans">
                {glossaryError}
              </div>
            )}

            {/* Glossary Search Field */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-600" />
              <input 
                type="text"
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
                placeholder="Search standard Xianxia patterns or custom dynamic story nodes..."
                className="w-full bg-neutral-950 border border-neutral-900 text-signal pl-10 pr-4 py-2 text-xs rounded"
              />
            </div>

            {/* Terms grid columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGlossary.map((item, idx) => {
                const isCustom = customGlossary.some(cg => cg.term === item.term);
                
                return (
                  <div key={idx} className={`p-4 rounded-lg border transition-all ${
                    isCustom 
                      ? 'bg-purple-950/5 border-purple-950 hover:border-purple-900/60' 
                      : 'bg-neutral-950/50 border-neutral-900 hover:border-neutral-800'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-signal font-sans font-semibold text-xs tracking-wide">
                        {item.term}
                      </strong>
                      <span className={`text-[8.5px] font-mono uppercase px-1.5 rounded ${
                        isCustom ? 'bg-purple-950/30 text-purple-400 font-bold border border-purple-950' : 'bg-neutral-900 text-neutral-500'
                      }`}>
                        {item.category}
                      </span>
                    </div>
                    <p className="text-neutral-400 text-[11px] font-serif font-light leading-relaxed italic block mt-1 pt-1 border-t border-dashed border-neutral-900/60">
                      {item.definition}
                    </p>
                  </div>
                );
              })}

              {filteredGlossary.length === 0 && (
                <div className="col-span-2 text-center py-10 text-neutral-600 font-serif text-xs italic">
                  No aligned terms discovered inside this dimensional context.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
