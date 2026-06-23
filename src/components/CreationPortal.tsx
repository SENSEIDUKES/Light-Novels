import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldAlert, ChevronDown, ChevronUp, BookOpen, Layers, Target, Users, Zap, CheckCircle2, Cloud, Wand2, Copy, Check, MapPin, HelpCircle, GitBranch, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IntakeData, WorldBlueprint } from '../types';
import { useAppStore } from '../store/useAppStore';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getApiHeaders } from '../hooks/storyEngineHelpers';

const CATEGORIZED_TAGS: Record<string, string[]> = {
  'System & Progression': [
    'game systems', 'power scaling', 'cultivation realms', 'breakthrough pressure', 'bottleneck arcs', 
    'tribulation events', 'dao comprehension', 'martial techniques', 'bloodline awakening', 'artifact growth', 
    'weapon spirits', 'inheritance trials', 'class evolution', 'skill trees', 'job classes', 
    'level progression', 'stat growth', 'quest systems', 'achievement systems', 'reincarnation rules', 
    'regression rules', 'time loops', 'save points', 'death penalties', 'respawn logic', 
    'system corruption', 'system awakening', 'system missions', 'system rewards', 'system penalties', 
    'system shop', 'system diagnostics', 'hidden stats', 'karma points', 'influence points', 
    'admin points', 'military points', 'diplomacy points', 'logistics points'
  ],
  'Society & Economics': [
    'kingdom economy', 'resource management', 'territory control', 'trade routes', 'supply chains', 
    'infrastructure growth', 'settlement upgrades', 'city building', 'village growth', 'guild systems', 
    'tax reform', 'law reform', 'public order', 'famine pressure', 'refugee crisis', 'war economy', 
    'black market', 'scarcity economy', 'trade embargo', 'grain pricing', 'currency pressure', 
    'debt crisis', 'guild economy', 'artisan production', 'labor shortage', 'port economy', 
    'mining economy', 'rare materials', 'auction politics', 'tribute systems', 'foreign investment', 
    'smuggling routes', 'banking influence', 'land rights', 'market control', 'industrial growth', 
    'economic recovery', 'magical resources', 'contract enforcement', 'kingdom building', 
    'territory upgrades', 'laws', 'diplomacy', 'city expansion', 'master workshops'
  ],
  'Politics & War': [
    'faction memory', 'loyalty tracking', 'reputation tracking', 'political pressure', 'military strategy', 
    'court intrigue', 'border defense', 'warlord politics', 'noble resistance', 'imperial oversight', 
    'rebellion risk', 'succession crisis', 'spy networks', 'intelligence war', 'diplomatic leverage', 
    'treaty instability', 'alliance building', 'alliance decay', 'betrayal fallout', 'rival factions', 
    'proxy war', 'hostage diplomacy', 'merchant politics', 'clan politics', 'sect politics', 
    'council politics', 'propaganda war', 'public scandal', 'legitimacy crisis', 'hidden patrons', 
    'puppet ruler', 'rebel recruitment', 'vassal management', 'occupied territory', 'conquered loyalty', 
    'troop morale', 'unit progression', 'officer loyalty', 'siege warfare', 'guerrilla warfare', 
    'border raids', 'campaign planning', 'battlefield tactics', 'fortress defense', 'supply raids', 
    'mercenary contracts', 'military doctrine', 'weapon upgrades', 'elite units', 'special corps', 
    'war exhaustion', 'strategic retreat', 'city evacuation', 'prisoner politics', 'veteran trauma', 
    'enemy generals', 'battlefield reputation', 'political intrigue', 'court factions', 'succession battles', 
    'spy networks', 'marriage alliances', 'sect diplomacy'
  ],
  'Romance & Affection': [
    'romantic trust', 'slow-burn romance', 'memory romance', 'forbidden romance', 'political romance', 
    'arranged marriage', 'enemies to lovers', 'rivals to lovers', 'protector bond', 'grief to love', 
    'jealousy tracking', 'affection growth', 'confession timing', 'trust rupture', 'trust repair', 
    'romantic sacrifice', 'duty versus love', 'love versus ambition', 'harem harmony', 'harem jealousy', 
    'companion loyalty', 'companion arcs', 'companion growth', 'companion rivalry', 'companion betrayal', 
    'companion trauma', 'companion ambition', 'party chemistry', 'party conflict', 'mentor bond', 
    'disciple growth', 'cozy / slice-of-life cultivation', 'farming', 'food', 'healing', 'village bonds', 
    'low-stakes daily progress', 'spiritual bond cultivation', 'romantic tension', 'adult-only double cultivation politics'
  ],
  'Fate & Karmic Bonds': [
    'karmic bonds', 'soul bonds', 'fate bonds', 'destiny recovery', 'lost fate', 'stolen fate', 
    'fate theft', 'fate repair', 'prophecy tracking', 'chosen one pressure', 'antihero rise', 
    'villain redemption', 'revenge spiral', 'mercy consequences', 'moral debt', 'blood debt', 
    'favor debt', 'life debt', 'oath tracking', 'promise tracking', 'curse tracking', 'blessing systems', 
    'divine contracts', 'spirit contracts', 'found family', 'sworn brotherhood', 'regression/reincarnation', 
    'second chances', 'future knowledge', 'fate correction', 'revenge through preparation'
  ],
  'Exploration & Dungeons': [
    'map expansion', 'ancient ruins', 'secret realms', 'sect rankings', 'arena rankings', 'tower climbs', 
    'dungeon systems', 'loot economy', 'crafting systems', 'alchemy systems', 'forging systems', 
    'enchantment systems', 'summoning systems', 'monster evolution', 'pet evolution', 'party roles', 
    'raid mechanics', 'boss mechanics', 'player factions', 'NPC memory', 'NPC agendas', 'quest chains', 
    'hidden quests', 'world events', 'tutorial systems', 'safe zones', 'guild ranks', 'crafting/alchemy', 
    'pill refinement', 'weapon forging', 'talisman design', 'artifact economy', 'beast-taming / monster evolution', 
    'bonded beasts', 'bloodline awakenings', 'companion growth', 'beast sect politics', 'dungeon/tower climb', 
    'floor bosses', 'trial rooms', 'loot systems', 'ancient tower rankings'
  ],
  'Urban & Modern': [
    'urban cultivation', 'hidden society', 'corporate clans', 'district control', 'celebrity vessels', 
    'debt curses', 'apartment spirits', 'subway realms', 'convenience spirits', 'hunter rankings', 
    'gate outbreaks', 'tower gates', 'awakened citizens', 'association politics', 'media pressure', 
    'viral reputation', 'idol factions', 'chaebol clans', 'underworld sects', 'modern artifacts', 
    'phone talismans', 'contract rewriting', 'spiritual real estate', 'urban territory', 'revenge climb', 
    'social status growth', 'family pressure', 'urban/modern cultivation', 'hidden sects in modern cities', 
    'spiritual black markets', 'apocalypse cultivation', 'ruined worlds', 'survival camps', 'mutated beasts', 
    'broken heavenly laws', 'cosmic cultivation', 'star realms', 'planetary sects', 'void beasts', 'galactic inheritances'
  ],
  'Academy & Training': [
    'school hierarchy', 'academy rankings', 'exam arcs', 'tournament arcs', 'rival schools', 
    'student factions', 'teacher politics', 'discipline systems', 'training schedules', 'mission boards', 
    'campus secrets', 'forbidden libraries', 'trial grounds', 'academy cultivation', 'sect schools', 
    'class rankings', 'exams', 'rival dorms', 'hidden instructors'
  ],
  'Meta & Continuity': [
    'emotional continuity', 'long-term consequences', 'recap tracking', 'arc continuity', 'chapter memory', 
    'side plot tracking', 'recurring enemies', 'recurring allies', 'background wars', 'offscreen growth', 
    'offscreen schemes', 'delayed payoffs', 'mystery clues', 'foreshadowing', 'hidden identities', 
    'secret bloodlines', 'sealed memories', 'lost history', 'ancient grudges', 'regional politics', 
    'cultural tension', 'religious pressure', 'mythic history', 'living codex', 'dynamic portraits', 
    'relationship web', 'threat colors', 'faction colors', 'character status', 'world state', 
    'story momentum', 'reader hooks', 'arc escalation', 'plot persistence', 'continuity guardrails', 
    'trope control', 'tone control', 'pacing control', 'stakes escalation', 'chapter consequences',
    'mystery cultivation', 'forbidden cases', 'cursed relics', 'hidden murders', 'ancient sealed truths'
  ]
};

const TAG_PRESETS = Array.from(new Set(Object.values(CATEGORIZED_TAGS).flat()));

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

const parseBlueprintData = (inputText: string): WorldBlueprint | null => {
  const text = inputText.trim();
  if (!text) return null;

  // 1. Try JSON extraction first
  try {
    let jsonText = text;
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonText = text.substring(firstBrace, lastBrace + 1);
    }
    const data = JSON.parse(jsonText);
    if (data && typeof data === 'object') {
      return {
        title: data.title || data.novelTitle || 'Imported World',
        logline: data.logline || data.corePremise || '',
        worldOverview: data.worldOverview || data.worldType || '',
        startingLocation: data.startingLocation || '',
        societyStructure: data.societyStructure || '',
        powerSystemOutline: data.powerSystemOutline || data.startingPowerConcept || '',
        mcProfile: data.mcProfile || data.startingIdentity || '',
        majorFactions: Array.isArray(data.majorFactions) ? data.majorFactions : [],
        initialCharacters: Array.isArray(data.initialCharacters) ? data.initialCharacters : [],
        majorMysteries: Array.isArray(data.majorMysteries) ? data.majorMysteries : [],
        firstArcPromise: data.firstArcPromise || '',
        tropeRules: data.tropeRules || '',
        styleBible: data.styleBible || '',
        unresolvedPlotThreads: Array.isArray(data.unresolvedPlotThreads) ? data.unresolvedPlotThreads : [],
      };
    }
  } catch (e) {
    // Treat as Markdown if JSON fails
  }

  // 2. Parsed Markdown state machine
  const bp: WorldBlueprint = {
    title: '',
    logline: '',
    worldOverview: '',
    startingLocation: '',
    societyStructure: '',
    powerSystemOutline: '',
    mcProfile: '',
    majorFactions: [],
    initialCharacters: [],
    majorMysteries: [],
    firstArcPromise: '',
    tropeRules: '',
    styleBible: '',
    unresolvedPlotThreads: [],
  };

  const lines = text.split('\n');
  let currentSection: 'overview' | 'society' | 'power' | 'mc' | 'arc' | null = null;
  let isParsingFactions = false;
  
  const overviewLines: string[] = [];
  const societyLines: string[] = [];
  const factionsList: string[] = [];
  const powerLines: string[] = [];
  const mcLines: string[] = [];
  const arcLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // Keep empty line structural integrity within sections
      if (currentSection === 'overview') overviewLines.push('');
      else if (currentSection === 'society' && !isParsingFactions) societyLines.push('');
      else if (currentSection === 'power') powerLines.push('');
      else if (currentSection === 'mc') mcLines.push('');
      else if (currentSection === 'arc') arcLines.push('');
      continue;
    }

    if (trimmed.startsWith('# ')) {
      bp.title = trimmed.substring(2).trim();
      currentSection = null;
      continue;
    }

    if (trimmed.toLowerCase().startsWith('**logline**:') || trimmed.toLowerCase().startsWith('**logline:**')) {
      const parts = trimmed.split(':');
      bp.logline = parts.slice(1).join(':').trim();
      currentSection = null;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      const heading = trimmed.substring(3).trim().toLowerCase();
      isParsingFactions = false;
      if (heading.includes('overview')) {
        currentSection = 'overview';
      } else if (heading.includes('society') || heading.includes('faction') || heading.includes('structure')) {
        currentSection = 'society';
      } else if (heading.includes('power')) {
        currentSection = 'power';
      } else if (heading.includes('character') || heading.includes('mc') || heading.includes('profile')) {
        currentSection = 'mc';
      } else if (heading.includes('arc') || heading.includes('promise')) {
        currentSection = 'arc';
      } else {
        currentSection = null;
      }
      continue;
    }

    if (currentSection === 'society') {
      if (trimmed.startsWith('### ') && (trimmed.toLowerCase().includes('faction') || trimmed.toLowerCase().includes('major faction'))) {
        isParsingFactions = true;
        continue;
      }
    }

    if (currentSection === 'overview') {
      overviewLines.push(line);
    } else if (currentSection === 'society') {
      if (isParsingFactions) {
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          factionsList.push(trimmed.substring(2).trim());
        } else if (trimmed.startsWith('1. ') || trimmed.startsWith('2. ') || trimmed.startsWith('3. ') || trimmed.startsWith('4. ') || trimmed.startsWith('5. ')) {
          factionsList.push(trimmed.substring(3).trim());
        } else {
          factionsList.push(trimmed);
        }
      } else {
        societyLines.push(line);
      }
    } else if (currentSection === 'power') {
      powerLines.push(line);
    } else if (currentSection === 'mc') {
      mcLines.push(line);
    } else if (currentSection === 'arc') {
      arcLines.push(line);
    }
  }

  bp.worldOverview = overviewLines.join('\n').trim();
  bp.societyStructure = societyLines.join('\n').trim();
  bp.majorFactions = factionsList.map(f => f.trim()).filter(Boolean);
  bp.powerSystemOutline = powerLines.join('\n').trim();
  bp.mcProfile = mcLines.join('\n').trim();
  bp.firstArcPromise = arcLines.join('\n').trim();

  if (bp.title || bp.worldOverview || bp.powerSystemOutline || bp.mcProfile) {
    if (!bp.title) bp.title = 'Imported World';
    return bp;
  }

  return null;
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
  { id: 'Academy Cultivation', name: 'Academy Cultivation', icon: '🏫' },
  { id: 'Kingdom Building', name: 'Kingdom Building', icon: '🏰' },
  { id: 'Crafting / Alchemy', name: 'Crafting/Alchemy', icon: '🧪' },
  { id: 'Beast Taming', name: 'Beast Taming', icon: '🐾' },
  { id: 'Tower Climb', name: 'Tower Climb', icon: '🗼' },
  { id: 'Regression', name: 'Regression', icon: '⏳' },
  { id: 'Urban Cultivation', name: 'Urban Cultivation', icon: '🌃' },
  { id: 'Apocalypse Cultivation', name: 'Apocalypse', icon: '☣️' },
  { id: 'Cosmic Cultivation', name: 'Cosmic', icon: '🌌' },
  { id: 'Political Intrigue', name: 'Political Intrigue', icon: '👑' },
  { id: 'Cozy Slice-of-Life', name: 'Cozy/Slice-of-Life', icon: '🏡' },
  { id: 'Mystery Cultivation', name: 'Mystery', icon: '🔍' }
];

const PREMISE_SUGGESTIONS = [
  "Awakening a mysterious black tripod cauldron inside the family trash heap that grinds low-grade herbs into peerless tier-9 celestial elixirs.",
  "Dying in a grand sect betrayal only to regress 10 years to the moment of spiritual root measurement, choosing the forbidden Demonic Scripture.",
  "The world gets integrated into a cosmic tower system, but a bug grants me a hidden attribute: Infinite Comprehension Speed index.",
  "A quiet apprentice librarian finds a forgotten manual containing the diary of the first Primordial Creator, which talks back and demands snacks.",
  "Being the cripple son of a great General who finds out his 'broken' meridians are actually the legendary ancient Dragon-Phoenix Meridian body.",
  "Entering the lowest class ranking at the Grand Azure Sect Academy, only to unlock a hidden library containing direct instructions of the founder.",
  "Inheriting a ruined outer-city outpost with scarce resources, but the territory system displays interactive menus for automation.",
  "Born as an ordinary stable boy in the Beast Taming Sect, but awakening the ability to read hidden beast evolutionary bloodline trees.",
  "Failing the martial exam but discovering an ancient forge blueprint that allows infusing weapons with broken fragments of heavenly laws.",
  "Waking up on a barren moon as the sole survivor of a dying stellar sect with an cosmic stellar inheritance diagram in my soul."
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
        aria-expanded={isActive}
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

export default function CreationPortal({ onStartStory, onGenerateBlueprint, isGenerating: isGeneratingProp, error }: CreationPortalProps) {
  const { isGenerating: storeIsGenerating, activeAgentId, generationPhase, currentUser, routingConfig } = useAppStore();
  const isGenerating = isGeneratingProp || storeIsGenerating;
  const [stage, setStage] = useState<'intake' | 'blueprint'>('intake');
  const [copied, setCopied] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const handleCopyBlueprint = () => {
    if (!blueprint) return;
    
    const textToCopy = `
# ${blueprint.title || 'Untitled World'}

**Logline**: ${blueprint.logline || ''}

## World Overview
${blueprint.worldOverview || ''}

## Society & Factions
${blueprint.societyStructure || ''}
${blueprint.majorFactions && blueprint.majorFactions.length > 0 ? `\n### Major Factions:\n${blueprint.majorFactions.map(f => `- ${f}`).join('\n')}` : ''}

## Power System
${blueprint.powerSystemOutline || ''}

## Main Character Profile
${blueprint.mcProfile || ''}

## First Arc Promise
${blueprint.firstArcPromise || ''}
`.trim();

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyBlueprintJson = () => {
    if (!blueprint) return;
    const textToCopy = JSON.stringify(blueprint, null, 2);
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    });
  };

  const [blueprint, setBlueprint] = useState<WorldBlueprint | null>(null);

  const handleImportSubmit = () => {
    if (!importText.trim()) {
      setImportError('Please paste some seed data first.');
      return;
    }

    const parsed = parseBlueprintData(importText);
    if (parsed) {
      setBlueprint(parsed);
      setStage('blueprint');
      setShowImportPanel(false);
      setImportText('');
      setImportError(null);
    } else {
      setImportError('Unable to align past records. Ensure headings match the copied blueprint format, or standard JSON representation.');
    }
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };
  
  const [intake, setIntake] = useState<IntakeData>({
    novelTitle: '',
    mcName: 'Han Feng',
    genrePath: 'Xianxia',
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

  const [customTagInput, setCustomTagInput] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [tagSearch, setTagSearch] = useState<string>('');
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<{ suggestedTags: string[]; reasoning: string } | null>(null);
  const [tagSuggestionError, setTagSuggestionError] = useState<string | null>(null);

  const handleSuggestTags = async () => {
    if (!intake.corePremise?.trim()) {
      setTagSuggestionError("Please select or describe a Core Premise first to generate celestial tag recommendations.");
      return;
    }
    setIsSuggestingTags(true);
    setTagSuggestionError(null);
    try {
      const apiHeaders = await getApiHeaders();
      const response = await fetch('/api/suggest-tags', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          premise: intake.corePremise,
          genrePath: intake.genrePath,
          routingConfig: routingConfig?.storyMaker
        })
      });

      if (!response.ok) {
        throw new Error(`Sect channel unreachable. Code: ${response.status}`);
      }

      const resData = await response.json();
      setTagSuggestions(resData);
    } catch (err: any) {
      console.error("Error fetching recommended tags:", err);
      setTagSuggestionError(err.message || "Failed to contact the celestial scribe. Please try again.");
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const handleAddAllSuggestedTags = () => {
    if (!tagSuggestions || !tagSuggestions.suggestedTags) return;
    setIntake(prev => {
      const activeTags = prev.storyTags || [];
      const newTags = [...activeTags];
      tagSuggestions.suggestedTags.forEach(tag => {
        if (!newTags.includes(tag)) {
          newTags.push(tag);
        }
      });
      return { ...prev, storyTags: newTags };
    });
  };

  const [chapterCount, setChapterCount] = useState(10);
  const [activeSection, setActiveSection] = useState<'core' | 'world' | 'mc' | 'power' | 'plot'>('core');

  const updateIntake = (field: keyof IntakeData, value: string) => {
    setIntake(prev => ({ ...prev, [field]: value }));
  };

  const handleTogglePresetTag = (tag: string) => {
    setIntake(prev => {
      const activeTags = prev.storyTags || [];
      if (activeTags.includes(tag)) {
        return { ...prev, storyTags: activeTags.filter(t => t !== tag) };
      } else {
        return { ...prev, storyTags: [...activeTags, tag] };
      }
    });
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim().replace(/^,|,$/g, '');
    if (!trimmed) return;
    setIntake(prev => {
      const activeTags = prev.storyTags || [];
      if (activeTags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      return { ...prev, storyTags: [...activeTags, trimmed] };
    });
    setCustomTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setIntake(prev => ({
      ...prev,
      storyTags: (prev.storyTags || []).filter(t => t !== tag)
    }));
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
          onClick={handleLogin}
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
      <div className="max-w-4xl mx-auto pb-20" id="creation-portal-root">
        <div className="text-center mb-10 space-y-4">
          <span className="font-sc text-portal tracking-[0.2em] text-xs uppercase block">World Blueprint Generated</span>

          <div className="max-w-xl mx-auto space-y-3">
            <div>
              <label className="block text-[10px] font-sc text-portal tracking-widest uppercase mb-1">World Seed Title</label>
              <input
                type="text"
                value={blueprint.title}
                onChange={(e) => setBlueprint({ ...blueprint, title: e.target.value })}
                className="w-full text-center bg-void border border-neutral-900 focus:border-portal text-signal font-display font-bold text-2xl sm:text-3xl rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
                placeholder="Give your world a name"
              />
            </div>
            <div>
              <label className="block text-[10px] font-sc text-portal tracking-widest uppercase mb-1">Cosmic Logline</label>
              <textarea
                value={blueprint.logline}
                onChange={(e) => setBlueprint({ ...blueprint, logline: e.target.value })}
                rows={2}
                className="w-full text-center bg-void border border-neutral-900 focus:border-portal text-neutral-400 font-sans font-light text-xs sm:text-sm rounded-md px-4 py-1.5 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all resize-none"
                placeholder="Describe the high-concept premise"
              />
            </div>
          </div>
        </div>

        <div className="bg-neutral-950/80 border border-portal/30 p-6 sm:p-10 rounded-lg shadow-[0_0_30px_rgba(4,172,255,0.05)] relative space-y-8">
          
          {/* Section 1: Overview & Starting Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm">World Overview</h3>
                <span className="text-[10px] text-portal font-mono">Editable</span>
              </div>
              <textarea
                value={blueprint.worldOverview}
                onChange={(e) => setBlueprint({ ...blueprint, worldOverview: e.target.value })}
                rows={6}
                className="w-full bg-void border border-neutral-900 focus:border-portal text-[#dfd8cf] font-serif text-sm leading-relaxed rounded-md p-4 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all resize-none"
                placeholder="The settings, lore, and physical characteristics of this universe..."
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm flex items-center space-x-1.5">
                  <MapPin size={14} className="text-portal"/>
                  <span>Starting Location</span>
                </h3>
                <span className="text-[10px] text-portal font-mono">Editable</span>
              </div>
              <textarea
                value={blueprint.startingLocation || ''}
                onChange={(e) => setBlueprint({ ...blueprint, startingLocation: e.target.value })}
                rows={6}
                className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-sans text-xs leading-relaxed rounded-md p-4 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all resize-none"
                placeholder="The initial city, sect outpost, forest, or plane of existence where story begins..."
              />
            </div>
          </div>

          {/* Section 2: Society Structure & Major Factions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm flex items-center space-x-2">
                    <Layers size={14} className="text-portal"/>
                    <span>Society Structure</span>
                  </h3>
                  <span className="text-[9px] text-portal font-mono">Editable</span>
                </div>
                <textarea
                  value={blueprint.societyStructure}
                  onChange={(e) => setBlueprint({ ...blueprint, societyStructure: e.target.value })}
                  rows={4}
                  className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-sans text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
                  placeholder="Feudal, corporate, sect-based, military rule..."
                />
              </div>

              <div>
                <h4 className="text-neutral-400 font-sc uppercase tracking-wider font-bold text-xs mb-2">Major Factions (One per line)</h4>
                <textarea
                  value={blueprint.majorFactions?.join('\n') || ''}
                  onChange={(e) => setBlueprint({
                    ...blueprint,
                    majorFactions: e.target.value.split('\n')
                  })}
                  rows={4}
                  className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-mono text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
                  placeholder="e.g. Heavenly Sword Sect&#10;Deep Sea Alliance&#10;Abyssal Cult"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm flex items-center space-x-2">
                  <Zap size={14} className="text-portal"/>
                  <span>Power System Outline</span>
                </h3>
                <span className="text-[9px] text-portal font-mono">Editable</span>
              </div>
              <textarea
                value={blueprint.powerSystemOutline}
                onChange={(e) => setBlueprint({ ...blueprint, powerSystemOutline: e.target.value })}
                rows={10}
                className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-mono text-xs leading-relaxed rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all scrollbar-thin"
                placeholder="Explain the cultivation realms, power scaling, magical energy..."
              />
            </div>
          </div>

          {/* Section 3: MC Profile & First Arc Promise */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm flex items-center space-x-2">
                  <Users size={14} className="text-portal"/>
                  <span>Main Character Profile</span>
                </h3>
                <span className="text-[9px] text-portal font-mono">Editable</span>
              </div>
              <textarea
                value={blueprint.mcProfile}
                onChange={(e) => setBlueprint({ ...blueprint, mcProfile: e.target.value })}
                rows={5}
                className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-sans text-sm leading-relaxed rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
                placeholder="Starting cultivation level, cheat, flaws, unique attributes..."
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm flex items-center space-x-2">
                  <Target size={14} className="text-portal"/>
                  <span>First Arc Promise</span>
                </h3>
                <span className="text-[9px] text-portal font-mono">Editable</span>
              </div>
              <textarea
                value={blueprint.firstArcPromise}
                onChange={(e) => setBlueprint({ ...blueprint, firstArcPromise: e.target.value })}
                rows={5}
                className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-sans text-sm leading-relaxed rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
                placeholder="The initial central conflict, stakes, face-slapping event..."
              />
            </div>
          </div>

          {/* Section 4: Trope Rules & Style Bible */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm flex items-center space-x-2">
                  <Wand2 size={14} className="text-portal"/>
                  <span>Trope Guidance & Rules</span>
                </h3>
                <span className="text-[9px] text-portal font-mono">Editable</span>
              </div>
              <textarea
                value={blueprint.tropeRules || ''}
                onChange={(e) => setBlueprint({ ...blueprint, tropeRules: e.target.value })}
                rows={4}
                className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-sans text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
                placeholder="Action tropes to leverage, wuxia style face-slapping metrics, subversions..."
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm flex items-center space-x-2">
                  <FileText size={14} className="text-portal"/>
                  <span>Stylistic Bible</span>
                </h3>
                <span className="text-[9px] text-portal font-mono">Editable</span>
              </div>
              <textarea
                value={blueprint.styleBible || ''}
                onChange={(e) => setBlueprint({ ...blueprint, styleBible: e.target.value })}
                rows={4}
                className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-mono text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
                placeholder="Sovereign style rules, forbidden phrasing, key tone requirements..."
              />
            </div>
          </div>

          {/* Section 5: Characters, Mysteries & Plot Threads */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-neutral-400 font-sc uppercase tracking-wider font-bold text-xs mb-2 flex items-center space-x-1">
                <Users size={12} className="text-portal"/>
                <span>Initial Characters (One per line)</span>
              </h4>
              <textarea
                value={blueprint.initialCharacters?.join('\n') || ''}
                onChange={(e) => setBlueprint({
                  ...blueprint,
                  initialCharacters: e.target.value.split('\n')
                })}
                rows={5}
                className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-mono text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
                placeholder="e.g. Elder Qin (Protector)&#10;Junior Sister Han (Ally)&#10;Young Master Ye (Rival)"
              />
            </div>

            <div>
              <h4 className="text-neutral-400 font-sc uppercase tracking-wider font-bold text-xs mb-2 flex items-center space-x-1">
                <HelpCircle size={12} className="text-portal"/>
                <span>Major Mysteries (One per line)</span>
              </h4>
              <textarea
                value={blueprint.majorMysteries?.join('\n') || ''}
                onChange={(e) => setBlueprint({
                  ...blueprint,
                  majorMysteries: e.target.value.split('\n')
                })}
                rows={5}
                className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-mono text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
                placeholder="e.g. True origin of the Sovereign Ring&#10;Why was the Sect Leader poisoned?&#10;The secrets of the Abyss"
              />
            </div>

            <div>
              <h4 className="text-neutral-400 font-sc uppercase tracking-wider font-bold text-xs mb-2 flex items-center space-x-1">
                <GitBranch size={12} className="text-portal"/>
                <span>Unresolved Plot Threads (One per line)</span>
              </h4>
              <textarea
                value={blueprint.unresolvedPlotThreads?.join('\n') || ''}
                onChange={(e) => setBlueprint({
                  ...blueprint,
                  unresolvedPlotThreads: e.target.value.split('\n')
                })}
                rows={5}
                className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-mono text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
                placeholder="e.g. Sever the engagement with Chu family&#10;Win the Inner Sect tournament&#10;Find the lightning herb"
              />
            </div>
          </div>

          <div className="flex flex-col xl:flex-row items-center justify-between pt-6 border-t border-neutral-900 gap-4">
            <button
              type="button"
              onClick={() => setStage('intake')}
              disabled={isGenerating}
              className="text-neutral-400 hover:text-signal text-xs font-sc uppercase tracking-widest"
            >
              ← Refine Details
            </button>

            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
              <button
                type="button"
                onClick={handleStartStoryClick}
                disabled={isGenerating}
                className="w-full sm:w-auto font-sc px-6 py-3 rounded text-sm uppercase tracking-widest font-bold flex items-center justify-center space-x-2 bg-human text-signal border border-human hover:bg-void hover:text-human hover:border-human shadow-[0_0_15px_rgba(139,0,0,0.3)] transition-all cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full" />
                    <span>{activeAgentId === 'versa' ? 'VERSA is writing...' : 'Generating...'}</span>
                  </>
                ) : (
                  <><span>Accept Blueprint & Start Matrix</span><ArrowRight size={16} /></>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyBlueprint}
                className="w-full sm:w-auto font-sc px-5 py-3 rounded text-sm uppercase tracking-widest font-bold flex items-center justify-center space-x-2 bg-neutral-950 text-portal border border-neutral-800 hover:border-portal hover:text-signal transition-all shadow-[0_0_15px_rgba(4,172,255,0.1)] cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    <span>Copied Blueprint</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copy Blueprint</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyBlueprintJson}
                className="w-full sm:w-auto font-sc px-5 py-3 rounded text-sm uppercase tracking-widest font-bold flex items-center justify-center space-x-2 bg-neutral-950 text-neutral-400 border border-neutral-850 hover:border-neutral-700 hover:text-signal transition-all cursor-pointer"
              >
                {copiedJson ? (
                  <>
                    <Check size={16} />
                    <span>Copied JSON</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>
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
        <p className="font-sans font-light text-neutral-400 text-sm max-w-xl mx-auto leading-relaxed mb-6">
          Provide as much or as little detail as you want. Empty fields will be intelligently extrapolated using Chinese light-novel logic. We will first generate a World Blueprint for your review.
        </p>

        {/* Import Trigger Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowImportPanel(!showImportPanel)}
            className="font-sc px-5 py-2.5 rounded text-xs uppercase tracking-widest font-bold flex items-center space-x-2 bg-neutral-950 text-portal border border-neutral-900 hover:border-portal hover:bg-portal/5 transition-all shadow-[0_0_12px_rgba(4,172,255,0.05)] cursor-pointer"
          >
            <Copy size={14} />
            <span>Import World Seed / Blueprint</span>
          </button>
        </div>
      </div>

      {/* Slide-out Import Panel */}
      <AnimatePresence>
        {showImportPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-6 rounded-lg bg-neutral-950 border border-portal/30 space-y-4 max-w-2xl mx-auto shadow-[0_0_25px_rgba(4,172,255,0.08)] overflow-hidden"
          >
            <div className="flex justify-between items-center pb-2 border-b border-neutral-900">
              <h3 className="font-sc font-bold uppercase tracking-widest text-[#FAFAFA] text-xs flex items-center space-x-2">
                <Layers size={14} className="text-portal" />
                <span>Import Seed or Blueprint Data</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowImportPanel(false)}
                className="text-neutral-500 hover:text-[#FAFAFA] text-xs"
              >
                Close
              </button>
            </div>
            
            <p className="text-neutral-400 font-sans text-xs leading-relaxed">
              Paste your copied World Blueprint Markdown (copied via &quot;Copy Blueprint&quot;) or the raw JSON config below. We will parse the fields and load you directly into the blueprint stage.
            </p>

            <textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportError(null);
              }}
              rows={6}
              placeholder={`Paste copied World Blueprint details (Markdown) or JSON here...&#10;&#10;e.g.&#10;# Great Immortal Temple&#10;**Logline**: A regression tale...`}
              className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-sans text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
            />

            {importError && (
              <p className="text-xs text-human font-sans font-medium">{importError}</p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleImportSubmit}
                className="font-sc px-5 py-2 rounded text-xs uppercase tracking-widest font-bold bg-human text-[#FAFAFA] hover:bg-neutral-900 hover:text-human border border-human transition-colors cursor-pointer"
              >
                Activate Seed
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

          <div className="pt-2 border-t border-neutral-900/60">
            <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Story Refinement Tags (Optional)</label>
            <p className="text-neutral-500 font-sans text-xs mb-3">Add tags to further personalize your story (e.g. Slice of Life, Romantic Comedy, Overpowered MC) to help the AI tailor the universe according to your interests.</p>
            
            {/* Tag input and Add button */}
            <div className="flex flex-wrap items-center gap-2 mb-4 max-w-xl">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <input 
                  type="text" 
                  value={customTagInput} 
                  onChange={(e) => setCustomTagInput(e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag();
                    }
                  }}
                  placeholder="Type and hit Enter or click Add (e.g. space cultivation)" 
                  className="flex-1 bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded px-3 py-1.5 text-xs text-left" 
                />
                <button 
                  type="button" 
                  onClick={handleAddCustomTag}
                  className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-signal hover:border-portal rounded text-xs font-sc uppercase tracking-widest transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Suggest Tags Button */}
              <button
                type="button"
                onClick={handleSuggestTags}
                disabled={isSuggestingTags}
                className="px-3 py-1.5 bg-neutral-950/60 border border-[#04ACFF]/50 hover:border-[#04ACFF] text-[#04ACFF] hover:bg-[#04ACFF]/10 disabled:opacity-50 disabled:pointer-events-none rounded text-xs font-sc uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 shadow-[0_0_12px_rgba(4,172,255,0.05)]"
              >
                <Wand2 size={13} className={isSuggestingTags ? "animate-spin" : "animate-pulse"} />
                {isSuggestingTags ? "Channeling..." : "Suggest Tags"}
              </button>
            </div>

            {/* Tag Suggestions Display Panel */}
            <AnimatePresence>
              {(tagSuggestions || tagSuggestionError) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-4 rounded-lg bg-neutral-950/80 border border-[#04ACFF]/20 space-y-3"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-900">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-[#04ACFF] animate-pulse" />
                      <span className="font-sc font-bold uppercase tracking-widest text-[11px] text-[#FAFAFA]">Celestial Recommendations</span>
                    </div>
                    {tagSuggestions && (
                      <button
                        type="button"
                        onClick={handleAddAllSuggestedTags}
                        className="text-[10px] font-sc uppercase tracking-widest text-[#04ACFF] hover:text-[#04ACFF]/80 transition-colors bg-neutral-900/50 border border-neutral-800/80 hover:border-[#04ACFF]/40 px-2 py-1 rounded"
                      >
                        + Add All Suggestions
                      </button>
                    )}
                  </div>

                  {tagSuggestionError && (
                    <p className="text-xs text-[#8B0000] font-sans">{tagSuggestionError}</p>
                  )}

                  {tagSuggestions && (
                    <div className="space-y-2.5">
                      {tagSuggestions.reasoning && (
                        <p className="text-xs text-neutral-400 font-sans italic pl-2 border-l border-neutral-800">
                          &ldquo;{tagSuggestions.reasoning}&rdquo;
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        {tagSuggestions.suggestedTags && tagSuggestions.suggestedTags.length > 0 ? (
                          tagSuggestions.suggestedTags.map((tag) => {
                            const isSelected = intake.storyTags?.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => handleTogglePresetTag(tag)}
                                className={`px-2.5 py-1 rounded text-xs font-sans transition-all border duration-300 flex items-center gap-1 ${
                                  isSelected 
                                    ? 'bg-neutral-900 border-[#04ACFF] text-[#04ACFF] shadow-[0_0_8px_rgba(4,172,255,0.15)] font-semibold' 
                                    : 'bg-void border-neutral-900 text-neutral-400 hover:text-[#FAFAFA] hover:border-neutral-800'
                                }`}
                              >
                                {isSelected ? '✓' : '+'} {tag}
                              </button>
                            );
                          })
                        ) : (
                          <span className="text-xs text-neutral-600 italic">Precept alignment could not extract custom matches automatically.</span>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Selected Tags list */}
            {intake.storyTags && intake.storyTags.length > 0 ? (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest">Active Celestial Tags ({intake.storyTags.length})</span>
                  <button
                    type="button"
                    onClick={() => setIntake(prev => ({ ...prev, storyTags: [] }))}
                    className="text-[10px] font-sc uppercase tracking-widest text-human hover:text-red-400 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 p-2 bg-neutral-950/40 rounded border border-neutral-900/50">
                  {intake.storyTags.map((tag) => (
                    <span key={tag} className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#04ACFF]/10 border border-[#04ACFF]/30 text-[#04ACFF] text-xs font-sans shadow-[0_0_8px_rgba(4,172,255,0.05)] animate-fadeIn">
                      <span className="font-semibold">{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        aria-label={`Remove tag ${tag}`}
                        className="text-neutral-500 hover:text-[#FAFAFA] focus:outline-none font-bold text-sm"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-neutral-600 text-xs font-sans italic mb-3">No custom tags added yet. Select presets or search using the grimoire below.</div>
            )}

            {/* Tag presets catalog with search and category filters */}
            {(() => {
              const filteredPresets = Array.from(new Set(
                activeCategory === 'All'
                  ? TAG_PRESETS
                  : CATEGORIZED_TAGS[activeCategory] || []
              )).filter(tag => 
                tag.toLowerCase().includes(tagSearch.toLowerCase())
              );

              return (
                <div className="space-y-4 border border-neutral-900 bg-neutral-950/50 p-4 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-900">
                    <div className="flex items-center space-x-2">
                      <span className="block font-sc text-[11px] text-[#FAFAFA] uppercase tracking-widest font-bold">Celestial Grimoire</span>
                      <span className="text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono">
                        {filteredPresets.length} / {TAG_PRESETS.length}
                      </span>
                    </div>
                    {/* Search Bar */}
                    <input
                      type="text"
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      placeholder="Filter celestial tags..."
                      className="bg-void border border-neutral-850 hover:border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded px-3 py-1.5 text-xs max-w-xs w-full transition-colors"
                      id="celestial-tag-search-input"
                    />
                  </div>

                  {/* Category selector */}
                  <div className="flex flex-wrap gap-1" id="tag-categories">
                    {['All', ...Object.keys(CATEGORIZED_TAGS)].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={`px-2.5 py-1 text-[10px] font-sans font-medium uppercase tracking-wider rounded border transition-all ${
                          activeCategory === cat
                            ? 'border-[#04ACFF] bg-[#04ACFF]/10 text-[#04ACFF] font-bold shadow-[0_0_8px_rgba(4,172,255,0.15)]'
                            : 'border-neutral-900 bg-void text-neutral-500 hover:text-neutral-350 hover:border-neutral-850'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Scrollable tagged buttons */}
                  <div className="max-h-56 overflow-y-auto pr-1 flex flex-wrap gap-1.5 scrollbar-thin" id="filtered-tags-list">
                    {filteredPresets.length === 0 ? (
                      <div className="text-neutral-600 text-xs font-sans italic py-4 w-full text-center">
                        No celestial tag matches your search within this category.
                      </div>
                    ) : (
                      filteredPresets.map((preset) => {
                        const isSelected = intake.storyTags?.includes(preset);
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleTogglePresetTag(preset)}
                            className={`px-2.5 py-1 rounded text-xs transition-all border duration-300 ${
                              isSelected 
                                ? 'bg-neutral-900 border-[#04ACFF] text-[#04ACFF] shadow-[0_0_8px_rgba(4,172,255,0.15)] font-semibold' 
                                : 'bg-void border-neutral-900 text-neutral-400 hover:text-[#FAFAFA] hover:border-neutral-800'
                            }`}
                          >
                            {isSelected ? '✓' : '+'} {preset}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}
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
                <span>{activeAgentId === 'versa' ? 'VERSA is forging...' : 'Weaving Destiny...'}</span>
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
