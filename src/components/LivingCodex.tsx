import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Network, Zap, Shield, Sparkles, Sword, HelpCircle, 
  MapPin, Plus, Trash2, Heart, ShieldAlert, BookOpen, Clock, 
  Check, Eye, RefreshCcw, Search, Compass, Award, Image, 
  BookMarked, ArrowRight, ArrowLeftRight, Activity
} from 'lucide-react';
import { StoryMemory, Character, Faction, Location, Artifact, StoryArc, StoryWorld, CharacterRelationship, KarmaFateNode } from '../types';
import { secureStorage } from '../lib/encryption';
import { VirtualizedList } from './VirtualizedList';

interface LivingCodexProps {
  memory: StoryMemory;
  arcs: StoryArc[];
  onUpdateMemory: (updatedMemory: StoryMemory) => void;
  mcName: string;
  onJumpToChapter?: (chapterNumber: number) => void;
  onSwitchTab?: (tab: 'reader' | 'codex' | 'memory') => void;
  activeStory: StoryWorld;
  onUpdateStory: (updatedStory: StoryWorld) => void;
  routingConfig?: any;
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
  const [activePage, setActivePage] = useState<'characters' | 'relations' | 'power' | 'factions' | 'artifacts' | 'timeline' | 'mysteries' | 'glossary'>('characters');
  
  // Selection state for node inspection in Relationship Map & other grids
  const [selectedNodeChar, setSelectedNodeChar] = useState<Character | null>(null);

  // Search filter for Glossary
  const [glossarySearch, setGlossarySearch] = useState('');
  
  // Custom API-generated story-specific glossary terms
  const [customGlossary, setCustomGlossary] = useState<Array<{term: string, category: string, definition: string}>>([]);
  const [isExtractingGlossary, setIsExtractingGlossary] = useState(false);
  const [glossaryError, setGlossaryError] = useState<string | null>(null);

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
  
  // Flatten written chapters with arc details for virtualized listing
  const flatChapters = useMemo(() => {
    const list: Array<{
      chapter: any;
      arcTitle: string;
      arcIndex: number;
      isFirstInArc: boolean;
    }> = [];
    
    arcs.forEach((arc, aIdx) => {
      const written = arc.chapters.filter(ch => !!ch.generatedContent);
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
  const saveCustomGlossaryLocally = (terms: any[]) => {
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
  const handleAwakenCardImage = async (id: string, type: 'character' | 'location' | 'artifact', name: string, description: string) => {
    setGeneratingId(id);
    setGenerationError(null);

    const targetPrompt = type === 'character' 
      ? `A clean anime profile portrait of the Chinese light novel character ${name}. Description: ${description}. Soft elegant lighting.`
      : type === 'location'
      ? `A highly detailed serene landscape view of the Chinese cultivation environment ${name}. Description: ${description}.`
      : `The glowing physical form of the ancient alchemical weapon relic ${name}. Description: ${description}`;

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

      const returnedUrl = data.imageUrl || data.fallbackUrl;

      // Persist imageUrl updates directly to global state
      if (type === 'character') {
        const updated = memory.characters.map(c => c.id === id ? { ...c, imageUrl: returnedUrl } : c);
        onUpdateMemory({ ...memory, characters: updated });
      } else if (type === 'location') {
        const updated = (memory.locations || []).map(l => l.id === id ? { ...l, imageUrl: returnedUrl } : l);
        onUpdateMemory({ ...memory, locations: updated });
      } else if (type === 'artifact') {
        const updated = (memory.artifacts || []).map(a => a.id === id ? { ...a, imageUrl: returnedUrl } : a);
        onUpdateMemory({ ...memory, artifacts: updated });
      }
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "Failed to trigger visual aura synthesis.");
    } finally {
      setGeneratingId(null);
    }
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

  return (
    <div className="bg-black border border-neutral-900 rounded-lg p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row gap-6 relative min-h-[690px] overflow-hidden select-none" id="living-codex-container">
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
        <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 gap-1.5 md:gap-1.5 md:space-y-1.5 scrollbar-none whitespace-nowrap select-none w-full" id="codex-tab-scroller">
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
                    {memory.characters.map((char) => {
                      const isGenerating = generatingId === char.id;
                      const hasImage = !!char.imageUrl;
                      const cScore = getPowerRankScore(char.powerLevel);
                      
                      return (
                        <div 
                          key={char.id} 
                          className="bg-neutral-950 border border-neutral-900 hover:border-neutral-800 rounded-lg overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-lg relative"
                        >
                          {/* Visual Stage illustration header */}
                          <div className="h-44 w-full bg-void relative flex items-center justify-center overflow-hidden border-b border-neutral-900">
                            {hasImage ? (
                              <img 
                                src={char.imageUrl} 
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
                            <span className={`absolute top-2 right-2 text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                              char.status === 'alive' ? 'bg-green-950/40 text-green-400 border-green-900' :
                              char.status === 'deceased' ? 'bg-red-950/40 text-human border-red-900' :
                              'bg-neutral-950 text-neutral-500 border-neutral-800'
                            }`}>
                              {char.status}
                            </span>

                            {/* Combat power ranking level index label floating top left */}
                            <div className="absolute top-2 left-2 flex items-center space-x-1 font-mono text-[8.5px] bg-black/80 px-1.5 py-0.5 rounded border border-neutral-850">
                              <Award size={10} className="text-yellow-500" />
                              <span className="text-neutral-300">Pwr:{cScore.score}</span>
                            </div>
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
                            <div className="pt-3 border-t border-neutral-950 flex justify-end">
                              <button
                                onClick={() => handleAwakenCardImage(char.id, 'character', char.name, char.description)}
                                disabled={isGenerating}
                                className={`w-full py-1.5 rounded text-[9px] uppercase font-mono tracking-widest flex items-center justify-center space-x-1 border font-bold transition-all ${
                                  isGenerating
                                    ? 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-wait'
                                    : 'bg-void border-portal/15 text-portal hover:border-portal hover:bg-portal/5 hover:shadow-[0_0_8px_rgba(4,172,255,0.2)]'
                                }`}
                              >
                                {isGenerating ? (
                                  <>
                                    <RefreshCcw size={10} className="animate-spin text-portal" />
                                    <span>Awakening Portrait...</span>
                                  </>
                                ) : (
                                  <>
                                    <Image size={10} className="text-portal" />
                                    <span>{hasImage ? 'Regenerate Portrait' : 'Awaken Portrait'}</span>
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
                    {!memory.locations || memory.locations.length === 0 ? (
                      <div className="col-span-3 text-center py-10 border border-dashed border-neutral-900 rounded bg-neutral-950/20 text-xs text-neutral-500 italic">
                        No geographic realms known. Continue reading or formulate a custom domain above!
                      </div>
                    ) : (
                      memory.locations.map((loc) => {
                        const isGenerating = generatingId === loc.id;
                        const hasImage = !!loc.imageUrl;

                        return (
                          <div key={loc.id} className="bg-neutral-950 border border-neutral-900 hover:border-neutral-800 rounded-lg overflow-hidden flex flex-col justify-between group transition-all duration-300">
                            {/* Location Scenery Header */}
                            <div className="h-36 w-full bg-void relative flex items-center justify-center overflow-hidden border-b border-neutral-900">
                              {hasImage ? (
                                <img 
                                  src={loc.imageUrl} 
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

                              <div className="pt-3 border-t border-neutral-950 flex items-center justify-between gap-2">
                                <button
                                  onClick={() => handleDeleteLocation(loc.id)}
                                  className="text-[9px] text-neutral-600 hover:text-human uppercase font-mono"
                                >
                                  Purge Node
                                </button>
                                <button
                                  onClick={() => handleAwakenCardImage(loc.id, 'location', loc.name, loc.description)}
                                  disabled={isGenerating}
                                  className="px-2 py-1 bg-void border border-portal/10 text-portal hover:border-portal rounded text-[8.5px] uppercase font-mono tracking-wider flex items-center space-x-1"
                                >
                                  {isGenerating ? <RefreshCcw size={8} className="animate-spin" /> : <Compass size={8} />}
                                  <span>Awaken Vistas</span>
                                </button>
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
                {memory.characters.map((char) => {
                  const isEditing = editingCharId === char.id;
                  const charStatusColor = 
                    char.status === 'alive' ? 'text-green-400 border-green-950 bg-green-950/20' :
                    char.status === 'deceased' ? 'text-human border-red-950 bg-red-950/20 line-through' :
                    char.status === 'ascended' ? 'text-portal border-cyan-950 bg-cyan-950/20' :
                    'text-neutral-500 border-neutral-900 bg-neutral-950';

                  return (
                    <div key={char.id} className="bg-neutral-950/40 border border-neutral-900 p-4 rounded-lg flex flex-col justify-between relative">
                      <div className="absolute top-4 right-4 text-[9px] px-2 py-0.5 rounded border font-mono">
                        <span className={charStatusColor}>{char.status}</span>
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

            {memory.characters.length === 0 ? (
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
                    {memory.characters.map((char, index) => {
                      const total = memory.characters.length;
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
                    {memory.characters.map((char, index) => {
                      const total = memory.characters.length;
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
                {memory.characters
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

                {memory.characters.length === 0 && (
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
              {!memory.factions || memory.factions.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-neutral-900 rounded bg-neutral-950/20 text-xs text-neutral-500 italic">
                  No registered religious sects found. Fabricate your starting sects in chapter writing or add one above!
                </div>
              ) : (
                memory.factions.map((fac) => {
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
              {!memory.artifacts || memory.artifacts.length === 0 ? (
                <div className="col-span-2 text-center py-12 border border-dashed border-neutral-900 rounded bg-neutral-950/20 text-xs text-neutral-500 italic">
                  No legendary relics found. Gather rare ores or let chapters uncover divine relics!
                </div>
              ) : (
                memory.artifacts.map((art) => {
                  const isGenerating = generatingId === art.id;
                  const hasImage = !!art.imageUrl;
                  const tierColor = 
                    art.tier === 'Primordial' ? 'text-yellow-400 border-yellow-950 bg-yellow-950/20' :
                    art.tier === 'Heaven' ? 'text-portal border-cyan-950 bg-cyan-950/20 animate-pulse' :
                    art.tier === 'Earth' ? 'text-green-400 border-green-950 bg-green-950/20' :
                    'text-neutral-500 border-neutral-900 bg-neutral-950';

                  return (
                    <div key={art.id} className="p-4 bg-neutral-950/80 border border-neutral-900 rounded-lg hover:border-neutral-850 flex flex-col justify-between transition-all">
                      <div>
                        {/* Render relational artifact card portrait if available */}
                        {hasImage ? (
                          <div className="h-32 w-full rounded overflow-hidden border border-neutral-900 mb-3">
                            <img src={art.imageUrl} alt={art.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-2 bg-gradient-to-r from-void via-portal/5 to-void w-full rounded mb-1"></div>
                        )}

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

                      <div className="border-t border-neutral-900 mt-4 pt-3 flex justify-between items-center text-[10px] gap-2">
                        <span className="text-neutral-500 font-sans">
                          Bearer: <strong className="text-neutral-300 font-mono">{art.currentOwner || 'Unknown'}</strong>
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleAwakenCardImage(art.id, 'artifact', art.name, art.description)}
                            disabled={isGenerating}
                            className="text-portal hover:underline capitalize"
                          >
                            {isGenerating ? 'Forging...' : 'Synthesize Art'}
                          </button>
                          <span className="text-neutral-700">|</span>
                          <button
                            onClick={() => handleDeleteArtifact(art.id)}
                            className="text-neutral-600 hover:text-human font-mono"
                          >
                            Shatter
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
                        onChange={(e) => setFateSeverity(e.target.value as any)}
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
                        onChange={(e) => setFateType(e.target.value as any)}
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
                    <span>Distilling Lore Terms...</span>
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
