import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Sparkles, FolderHeart, User, Globe, 
  Award, Trash2, Plus, LogOut, BookCheck, ShieldAlert,
  ArrowLeft, Zap, Download, Upload, Database, Sliders, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Story, StoryMemory, Chapter, StoryArc, StoryWorld, ReaderPreferences, KarmaFateNode, CharacterRelationship, MultiModelRouting, RouteConfig } from './types';
import CreationPortal from './components/CreationPortal';
import AkashaRecord from './components/AkashaRecord';
import ReaderChamber from './components/ReaderChamber';
import SteerPortal from './components/SteerPortal';
import LivingCodex from './components/LivingCodex';
import { storyStorage } from './lib/storage';

const STORAGE_KEY = '@seihouse/fiction-generator-stories-v2';

// -------------------------------------------------------------
// SEIHouse Mock Preset Stories (Initial load if empty)
// -------------------------------------------------------------
const INITIAL_DEMO_STORIES: Story[] = [
  {
    id: 'demo-matrix-1',
    title: 'Immortal Calamity: Echoes of the Cauldron',
    genre: 'Xianxia',
    mcName: 'Ye Fan',
    customPremise: 'Awakening a mysterious black tripod cauldron inside the family trash heap that grinds low-grade herbs into peerless elixirs.',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    currentChapterNumber: 1,
    imageUrl: 'https://images.unsplash.com/photo-1542157077-789d38ac0bc2?auto=format&fit=crop&q=80',
    memory: {
      powerSystem: 'Qi Condensation (Tiers 1-10) -> Foundation Establishment (Low, Mid, Peak) -> Core Formation -> Nascent Soul.',
      currentPowerStage: 'Qi Condensation Tier 1 (Crippled Roots)',
      worldRules: [
        'Sovereigns of the nine sects execute absolute law; normal citizens are but wood and grass.',
        'Spiritual herb concentration determines sect royalty.',
        'Those who double-cultivate without high-grade talismans face spiritual deviance.',
        'Heavenly thunder tribulation burns away those who cheat destiny.'
      ],
      characters: [
        {
          id: 'char-1',
          name: 'Master Gu',
          role: 'Sacred Cauldron Mentor',
          description: 'A sarcastic soul form living inside the cauldron ring. Loves to tease Ye Fan but knows divine recipes.',
          relationshipToMC: 'Playful Bond / Absolute Ally',
          status: 'alive'
        },
        {
          id: 'char-2',
          name: 'Elder Zhao',
          role: 'Vengeful Elder',
          description: 'The greedy outer elder of the Azure Clouds Sect who covets Ye Fan\'s mysterious luck.',
          relationshipToMC: 'Extreme Hostility / Hidden Enemy',
          status: 'alive'
        }
      ],
      unresolvedPlotThreads: [
        'Resolve the mystery of Ye Fan\'s birthmark.',
        'Gather three Heavenly Jade Elixirs to cure Ye Fan\'s broken meridians.',
        'Avenge the clan expulsion by defeating Elder Zhao\'s disciple in the outer sect arena.'
      ],
      resolvedPlotThreads: [
        'Survive the wilderness wolf attack during clan expulsion.'
      ]
    },
    arcs: [
      {
        title: 'Volume 1: Awakening the Sky-Shattering Cauldron',
        isCompleted: false,
        chapters: [
          {
            number: 1,
            title: 'Expulsion from the Main Hall, Mysterious Cauldron of the Trash Heap',
            premise: 'Ye Fan gets humiliated and expelled by Elder Zhao. In despair, he drops blood on a rusted black metal container, awakening Master Gu.',
            status: 'read',
            generatedContent: `The chill of the Sky Cloud Sect's main hall seeped through the thin soles of Ye Fan's shoes, but it was nothing compared to the frost hardening in his chest. Above him, Elder Zhao sat like an ancient mountain, his voice booming with critical indifference.\n\n"Ye Fan. Your spiritual root is severed, your meridians are completely clogged. After three years, you remain at Qi Condensation Tier 1. You are a absolute waste of spiritual resources, eating Azure Elixirs meant for true geniuses! By decree of the Elder Council, you are hereby expelled to the Outer Wilderness!"\n\nA ripple of laughter rolled through the crowd of inner disciples. At the front, Zhao Chen—the Elder's favored nephew—smirked, looking down at Ye Fan like an ox looks at a blade of grass.\n\nYe Fan said nothing. He simply clenched his fists so tightly his knuckles turned white as bone. He turned on his heel, leaving behind the mountain peak he had called home.\n\nExpelled to the trash heap of the outer village, Ye Fan scavenged amongst broken arrays and discarded iron. There, his hand brushed against a peculiar, soot-covered tripod cauldron. A jagged piece of discarded metal cut his palm, and a drop of rich, blood-red vital essence splattered on the cauldron's rim.\n\nHum.\n\nLines of radiant blue light rippled through the rusty cauldron, a cosmic portal unlocking. An old, sarcastic voice resounded directly in Ye Fan's soul:\n\n"Who dares disturb the peace of Master Gu? Ah, a trash child with ruined roots? Excellent! Truly, my luck is spectacular..."\n\nYe Fan stared in disbelief. His hands was healed. Master Gu explained that his meridians were not ruined—they were simply compressed, awaiting the supreme refining energy of the cauldron! This was the beginning of his true, heaven-defying ascension.`,
            summary: 'Ye Fan gets expelled to the Outer Wilderness by Elder Zhao. He bleeds on a discarded tripod cauldron, awakening Master Gu, who reveals Ye Fan actually possesses rare Compressed Meridians.',
            statsChangeMessage: '[System Awakening: Cauldron link activated. Meridians starting to unlock!]'
          },
          {
            number: 2,
            title: 'Master Gu\'s Pill Recipe, Breakthrough in Secret Council',
            premise: 'Master Gu instructs Ye Fan to locate spatial snake vines to brew Earth Essence elixirs, defying the crippled meridian rumors.',
            status: 'unread'
          },
          {
            number: 3,
            title: 'Sect Envoys Arrive, the Audacity of the Waste Disciple',
            premise: 'Zhao Chen sends thugs to break Ye Fan\'s legs in the outer wilderness, but Ye Fan showcases his newly unlocked Qi Condensation Tier 2 stats.',
            status: 'unread'
          }
        ]
      }
    ]
  }
];


export default function App() {
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'detail' | 'reader' | 'codex' | 'creator'>('home');
  
  // Generation triggers
  const [isGenerating, setIsGenerating] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  
  // Selector state for chapters inside a story
  const [selectedChapterNum, setSelectedChapterNum] = useState<number>(1);
  const [nexusTab, setNexusTab] = useState<'reader'|'codex'|'memory'>('reader');

  // Local-first persistent storage driver indicator
  const [storageType, setStorageType] = useState<string>('Initializing...');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [routingPresets, setRoutingPresets] = useState<any>(null);

  const [routingConfig, setRoutingConfig] = useState<MultiModelRouting>(() => {
    const saved = localStorage.getItem('@seihouse/ai-routing-config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      storyMaker: {
        provider: 'gemini',
        model: 'gemini-3.5-flash',
      },
      imageGenerator: {
        provider: 'gemini',
        model: 'gemini-2.5-flash-image',
      }
    };
  });

  const [localGeminiKey, setLocalGeminiKey] = useState(() => localStorage.getItem('@seihouse/api-key-gemini') || '');
  const [localOpenrouterKey, setLocalOpenrouterKey] = useState(() => localStorage.getItem('@seihouse/api-key-openrouter') || '');
  const [localOllamaHost, setLocalOllamaHost] = useState(() => localStorage.getItem('@seihouse/api-key-ollama-host') || '');

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

  useEffect(() => {
    localStorage.setItem('@seihouse/ai-routing-config', JSON.stringify(routingConfig));
  }, [routingConfig]);

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const res = await fetch('/api/router-presets');
        if (res.ok) {
          const data = await res.json();
          setRoutingPresets(data);
        }
      } catch (err) {
        console.warn("Failed to fetch router presets:", err);
      }
    };
    fetchPresets();
  }, []);

  const handleUpdateProvider = (route: 'storyMaker' | 'imageGenerator', provider: 'gemini' | 'openrouter' | 'ollama') => {
    const presets = routingPresets || DEFAULT_PRESETS;
    const availableModels = presets[route][provider] || [];
    const model = availableModels[0] || '';
    
    setRoutingConfig(prev => ({
      ...prev,
      [route]: {
        provider,
        model
      }
    }));
  };

  const handleUpdateModel = (route: 'storyMaker' | 'imageGenerator', model: string) => {
    setRoutingConfig(prev => ({
      ...prev,
      [route]: {
        ...prev[route],
        model
      }
    }));
  };

  // Load saved lists
  useEffect(() => {
    const initAndLoad = async () => {
      try {
        await storyStorage.init();
        setStorageType(storyStorage.getActiveAdapterName());
        const loaded = await storyStorage.getStories();
        if (loaded && loaded.length > 0) {
          setStories(loaded);
        } else {
          // Initialize DB with demo stories
          for (const s of INITIAL_DEMO_STORIES) {
            await storyStorage.saveStory(s);
          }
          setStories(INITIAL_DEMO_STORIES);
        }
      } catch (e) {
        console.error("Persistent story memory failed to initialize, reverting to local fallback:", e);
        setStorageType('LocalStorage (Fallback)');
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            setStories(JSON.parse(saved));
          } else {
            setStories(INITIAL_DEMO_STORIES);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_STORIES));
          }
        } catch (innerErr) {
          setStories(INITIAL_DEMO_STORIES);
        }
      }
    };
    initAndLoad();
  }, []);

  // Save stories helper (replaces pure localStorage with storage API manager)
  const saveStories = async (updated: Story[]) => {
    setStories(updated);
    try {
      // Reconcile deleted entries
      const storedStories = await storyStorage.getStories();
      for (const st of storedStories) {
        if (!updated.some(u => u.id === st.id)) {
          await storyStorage.deleteStory(st.id);
        }
      }
      // Put updated stories
      for (const s of updated) {
        await storyStorage.saveStory(s);
      }
    } catch (e) {
      console.error("Celestial local disk write breached, reverting to standard storage cache:", e);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  // --- LOCAL-FIRST EXPORT/IMPORT MECHANISMS ---

  // Export any story world as a standalone JSON file
  const handleExportSingleStory = (story: Story) => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(story, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `story_world_${story.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert("Failed to transcribe story ledger to outward scrolls: " + err.message);
    }
  };

  // Export full celestial library collection as a single backup file
  const handleExportLibrary = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stories, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `seihouse_story_library_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert("Failed to package the library matrix: " + err.message);
    }
  };

  // Import one or multiple story worlds from a file
  const handleImportLibrary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        const parsedData = JSON.parse(fileContent);

        let mergedList = [...stories];
        let importSuccessCount = 0;

        const mergeSingleStory = (storyObj: any) => {
          if (!storyObj || !storyObj.id || !storyObj.title || !storyObj.memory) {
            throw new Error(`The provided package does not comply with the StoryWorld structural framework.`);
          }
          // Check for conflicts
          const existingIdx = mergedList.findIndex(s => s.id === storyObj.id);
          if (existingIdx > -1) {
            mergedList[existingIdx] = storyObj;
          } else {
            mergedList = [storyObj, ...mergedList];
          }
          importSuccessCount++;
        };

        if (Array.isArray(parsedData)) {
          parsedData.forEach(story => mergeSingleStory(story));
        } else {
          mergeSingleStory(parsedData);
        }

        saveStories(mergedList);
        alert(`Successfully synchronized ${importSuccessCount} Story World memories into your local ${storageType} database!`);
        e.target.value = ''; // Reset file prompt
      } catch (err: any) {
        alert("The import portal cracked. Validation failed: " + err.message);
      }
    };
    fileReader.readAsText(fileList[0]);
  };

  const activeStory = stories.find(s => s.id === activeStoryId);

  // 1. Trigger the Generation of the Initial Story
  const handleStartStory = async (mcName: string, genre: string, premise: string, chapterCount: number) => {
    setIsGenerating(true);
    setAppError(null);

    try {
      const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const gemini = localStorage.getItem('@seihouse/api-key-gemini');
      const openrouter = localStorage.getItem('@seihouse/api-key-openrouter');
      const ollama = localStorage.getItem('@seihouse/api-key-ollama-host');
      if (gemini) apiHeaders['x-gemini-key'] = gemini;
      if (openrouter) apiHeaders['x-openrouter-key'] = openrouter;
      if (ollama) apiHeaders['x-ollama-host'] = ollama;

      const response = await fetch('/api/generate-initial-arc', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ mcName, genre, customPremise: premise, chapterCount, routingConfig: routingConfig.storyMaker })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server bounds ruptured with status: ${response.status}`);
      }

      const responseData = await response.json();

      // Formulate a beautiful new Story object
      const formattedChapters: Chapter[] = responseData.chapters.map((ch: any) => ({
        number: ch.number,
        title: ch.title,
        premise: ch.premise,
        status: ch.number === 1 ? 'unread' : 'unread'
      }));

      const newStory: Story = {
        id: `story-${Date.now()}`,
        title: responseData.title || `The Ascension Chronicles of ${mcName}`,
        genre,
        mcName,
        customPremise: premise,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentChapterNumber: 1,
        memory: {
          powerSystem: responseData.powerSystem || 'Qi Refining Levels (Stage 1-9)',
          currentPowerStage: responseData.currentPowerStage || 'Novice stage',
          worldRules: responseData.worldRules || ['Survival of the fittest'],
          characters: responseData.characters?.map((c: any) => ({
            id: `char-${Math.random().toString(36).substr(2, 9)}`,
            ...c
          })) || [],
          unresolvedPlotThreads: responseData.unresolvedPlotThreads || [],
          resolvedPlotThreads: []
        },
        arcs: [
          {
            title: responseData.title || 'Volume I Genesis',
            chapters: formattedChapters,
            isCompleted: false
          }
        ]
      };

      const updated = [newStory, ...stories];
      saveStories(updated);
      setActiveStoryId(newStory.id);
      setSelectedChapterNum(1);
      setCurrentScreen('detail');
    } catch (err: any) {
      console.error(err);
      setAppError(err.message || "Failed to align celestial gates. Ensure your GEMINI_API_KEY is configured.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Trigger Generation of a Single Chapter
  const handleGenerateChapter = async (chapterNumber: number) => {
    if (!activeStory) return;
    setIsGenerating(true);
    setAppError(null);

    // Grab current variables
    const selectedArcIndex = activeStory.arcs.findIndex(arc => arc.chapters.some(c => c.number === chapterNumber));
    if (selectedArcIndex === -1) return;

    const currentArc = activeStory.arcs[selectedArcIndex];
    const targetChapter = currentArc.chapters.find(c => c.number === chapterNumber);
    if (!targetChapter) return;

    // Collect summaries from past chapters to maintain plot-lock
    const pastSummaries: string[] = [];
    activeStory.arcs.forEach(arc => {
      arc.chapters.forEach(ch => {
        if (ch.number < chapterNumber && ch.summary) {
          pastSummaries.push(`Chapter ${ch.number}: ${ch.summary}`);
        }
      });
    });

    try {
      const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const gemini = localStorage.getItem('@seihouse/api-key-gemini');
      const openrouter = localStorage.getItem('@seihouse/api-key-openrouter');
      const ollama = localStorage.getItem('@seihouse/api-key-ollama-host');
      if (gemini) apiHeaders['x-gemini-key'] = gemini;
      if (openrouter) apiHeaders['x-openrouter-key'] = openrouter;
      if (ollama) apiHeaders['x-ollama-host'] = ollama;

      const response = await fetch('/api/generate-chapter', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          mcName: activeStory.mcName,
          genre: activeStory.genre,
          customPremise: activeStory.customPremise,
          memory: activeStory.memory,
          pastSummaries,
          currentChapter: {
            number: targetChapter.number,
            title: targetChapter.title,
            premise: targetChapter.premise
          },
          routingConfig: routingConfig.storyMaker
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Meridian clash in chapter generation. Status: ${response.status}`);
      }

      const data = await response.json();

      // Formulate state updates
      const updatedStories = stories.map(s => {
        if (s.id !== activeStory.id) return s;

        // Clone story
        const cloned = { ...s };
        
        // 1. Update Chapter details
        cloned.arcs = cloned.arcs.map((arc, aIdx) => {
          if (aIdx !== selectedArcIndex) return arc;
          return {
            ...arc,
            chapters: arc.chapters.map(ch => {
              if (ch.number !== chapterNumber) return ch;
              return {
                ...ch,
                generatedContent: data.chapterText,
                summary: data.summary,
                statsChangeMessage: data.statsChangeMessage !== 'None' ? data.statsChangeMessage : undefined,
                status: 'read' as const
              };
            })
          };
        });

        // Check if all chapters in ALL arcs are completed
        const isArcFinished = cloned.arcs[selectedArcIndex].chapters.every(ch => !!ch.generatedContent);
        if (isArcFinished) {
          cloned.arcs[selectedArcIndex].isCompleted = true;
        }

        // 2. Map Memory updates coming from LLM
        const memoryUpdates = data.memoryUpdates;
        if (memoryUpdates) {
          const nextMemory: StoryMemory = { ...cloned.memory };
          
          if (memoryUpdates.currentPowerStage) {
            nextMemory.currentPowerStage = memoryUpdates.currentPowerStage;
          }

          // New Characters
          if (memoryUpdates.newCharacters && memoryUpdates.newCharacters.length > 0) {
            const added = memoryUpdates.newCharacters.map((c: any) => ({
              id: `char-${Math.random().toString(36).substr(2, 9)}`,
              name: c.name,
              role: c.role || 'Neutral figure',
              description: c.description || '',
              relationshipToMC: c.relationshipToMC || 'Neutral',
              status: c.status || 'alive',
              powerLevel: c.powerLevel || undefined,
              abilities: c.abilities || undefined,
              faction: c.faction || undefined
            }));
            nextMemory.characters = [...(nextMemory.characters || []), ...added];
          }

          // Relationship / Status / Power / Ability updates on existing characters
          if (memoryUpdates.characterStatusUpdates && memoryUpdates.characterStatusUpdates.length > 0) {
            nextMemory.characters = (nextMemory.characters || []).map(char => {
              const rule = memoryUpdates.characterStatusUpdates.find((u: any) => u.name?.toLowerCase() === char.name?.toLowerCase());
              if (rule) {
                const nextAbilities = char.abilities || [];
                const mergedAbilities = rule.newAbilities 
                  ? Array.from(new Set([...nextAbilities, ...rule.newAbilities]))
                  : nextAbilities;
                return {
                  ...char,
                  status: rule.newStatus || char.status,
                  relationshipToMC: rule.newRelationship || char.relationshipToMC,
                  powerLevel: rule.newPowerLevel || char.powerLevel,
                  abilities: mergedAbilities.length > 0 ? mergedAbilities : undefined
                };
              }
              return char;
            });
          }

          // New Plot Threads
          if (memoryUpdates.newUnresolvedPlotThreads && memoryUpdates.newUnresolvedPlotThreads.length > 0) {
            const currentThreads = nextMemory.unresolvedPlotThreads || [];
            const threads = memoryUpdates.newUnresolvedPlotThreads.filter((t: string) => !currentThreads.includes(t));
            nextMemory.unresolvedPlotThreads = [...currentThreads, ...threads];
          }

          // Resolved Plot Threads
          if (memoryUpdates.resolvedPlotThreads && memoryUpdates.resolvedPlotThreads.length > 0) {
            const currentUnresolved = nextMemory.unresolvedPlotThreads || [];
            const currentResolved = nextMemory.resolvedPlotThreads || [];
            let updatedUnresolved = [...currentUnresolved];
            let updatedResolved = [...currentResolved];

            memoryUpdates.resolvedPlotThreads.forEach((title: string) => {
              // Remove from unresolved
              updatedUnresolved = updatedUnresolved.filter(t => t.toLowerCase() !== title.toLowerCase());
              // Push to resolved
              if (!updatedResolved.includes(title)) {
                updatedResolved = [...updatedResolved, title];
              }
            });

            nextMemory.unresolvedPlotThreads = updatedUnresolved;
            nextMemory.resolvedPlotThreads = updatedResolved;
          }

          // Extended Codex: Factions
          if (memoryUpdates.newFactions && memoryUpdates.newFactions.length > 0) {
            const currentFactions = nextMemory.factions || [];
            const added = memoryUpdates.newFactions.map((f: any) => ({
              id: `fct-${Math.random().toString(36).substr(2, 9)}`,
              name: f.name,
              description: f.description || '',
              alignment: f.alignment || 'Neutral',
              headquarters: f.headquarters || '',
              status: f.status || 'Active'
            }));
            const filteredAdded = added.filter((af: any) => !currentFactions.some((cf: any) => cf.name?.toLowerCase() === af.name?.toLowerCase()));
            nextMemory.factions = [...currentFactions, ...filteredAdded];
          }

          // Extended Codex: Locations
          if (memoryUpdates.newLocations && memoryUpdates.newLocations.length > 0) {
            const currentLocations = nextMemory.locations || [];
            const added = memoryUpdates.newLocations.map((l: any) => ({
              id: `loc-${Math.random().toString(36).substr(2, 9)}`,
              name: l.name,
              description: l.description || '',
              realm: l.realm || '',
              safetyLevel: l.safetyLevel || 'Safe'
            }));
            const filteredAdded = added.filter((al: any) => !currentLocations.some((cl: any) => cl.name?.toLowerCase() === al.name?.toLowerCase()));
            nextMemory.locations = [...currentLocations, ...filteredAdded];
          }

          // Extended Codex: Artifacts
          if (memoryUpdates.newArtifacts && memoryUpdates.newArtifacts.length > 0) {
            const currentArtifacts = nextMemory.artifacts || [];
            const added = memoryUpdates.newArtifacts.map((a: any) => ({
              id: `art-${Math.random().toString(36).substr(2, 9)}`,
              name: a.name,
              description: a.description || '',
              tier: a.tier || 'Mortal',
              currentOwner: a.currentOwner || 'Unknown'
            }));
            const filteredAdded = added.filter((aa: any) => !currentArtifacts.some((ca: any) => ca.name?.toLowerCase() === aa.name?.toLowerCase()));
            nextMemory.artifacts = [...currentArtifacts, ...filteredAdded];
          }

          // Extended Codex: MC Abilities/learned arts
          if (memoryUpdates.newMCAbilities && memoryUpdates.newMCAbilities.length > 0) {
            const currentAbilities = nextMemory.abilities || [];
            const filteredAbilities = memoryUpdates.newMCAbilities.filter((ab: string) => !currentAbilities.includes(ab));
            nextMemory.abilities = [...currentAbilities, ...filteredAbilities];
          }

          cloned.memory = nextMemory;
        }

        cloned.updatedAt = new Date().toISOString();
        return cloned;
      });

      saveStories(updatedStories);
    } catch (err: any) {
      console.error(err);
      setAppError(err.message || "Celestial feedback received. Chapter generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Trigger Steering into a Brand New Story Arc
  const handleSteerArc = async (direction: string, customPrompt: string) => {
    if (!activeStory) return;
    setIsGenerating(true);
    setAppError(null);

    // Sum chapters count in all previous arcs
    const totalPreviousChapters = activeStory.arcs.reduce((acc, arc) => acc + arc.chapters.length, 0);

    // Gather past summary context
    const pastSummaries: string[] = [];
    activeStory.arcs.forEach(arc => {
      arc.chapters.forEach(ch => {
        if (ch.summary) {
          pastSummaries.push(`Chapter ${ch.number} Summary: ${ch.summary}`);
        }
      });
    });

    try {
      const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const gemini = localStorage.getItem('@seihouse/api-key-gemini');
      const openrouter = localStorage.getItem('@seihouse/api-key-openrouter');
      const ollama = localStorage.getItem('@seihouse/api-key-ollama-host');
      if (gemini) apiHeaders['x-gemini-key'] = gemini;
      if (openrouter) apiHeaders['x-openrouter-key'] = openrouter;
      if (ollama) apiHeaders['x-ollama-host'] = ollama;

      const response = await fetch('/api/steer-arc', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          mcName: activeStory.mcName,
          genre: activeStory.genre,
          customPremise: activeStory.customPremise,
          memory: activeStory.memory,
          pastSummaries,
          currentArcCount: totalPreviousChapters,
          steerDirection: direction,
          userCustomDirections: customPrompt,
          routingConfig: routingConfig.storyMaker
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Story steering broke with status: ${response.status}`);
      }

      const data = await response.json();

      // Design new Chapter list
      const nextChapters: Chapter[] = data.chapters.map((ch: any) => ({
        number: ch.number,
        title: ch.title,
        premise: ch.premise,
        status: 'unread'
      }));

      // Generate new StoryArc
      const newArc: StoryArc = {
        title: data.title || `Volume ${activeStory.arcs.length + 1}`,
        chapters: nextChapters,
        isCompleted: false
      };

      const updatedStories = stories.map(s => {
        if (s.id !== activeStory.id) return s;

        const nextStoriesMemory = { ...s.memory };

        // Append new elements predicted by the steer outcome
        if (data.newCharacters && data.newCharacters.length > 0) {
          const verified = data.newCharacters.map((c: any) => ({
            id: `char-${Math.random().toString(36).substr(2, 9)}`,
            ...c,
            status: c.status || 'alive'
          }));
          nextStoriesMemory.characters = [...nextStoriesMemory.characters, ...verified];
        }

        if (data.newUnresolvedPlotThreads && data.newUnresolvedPlotThreads.length > 0) {
          nextStoriesMemory.unresolvedPlotThreads = [...nextStoriesMemory.unresolvedPlotThreads, ...data.newUnresolvedPlotThreads];
        }

        return {
          ...s,
          arcs: [...s.arcs, newArc],
          memory: nextStoriesMemory,
          updatedAt: new Date().toISOString()
        };
      });

      saveStories(updatedStories);
      setSelectedChapterNum(nextChapters[0].number);
    } catch (err: any) {
      console.error(err);
      setAppError(err.message || "Failed to steer next story arc successfully.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper: update memory manually from component
  const handleUpdateMemoryManual = (updatedMemory: StoryMemory) => {
    if (!activeStory) return;
    const updated = stories.map(s => {
      if (s.id === activeStory.id) {
        return {
          ...s,
          memory: updatedMemory,
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    });
    saveStories(updated);
  };

  // Helper: update entire story world with deep properties (relationships, karmaNodes, readerPreferences)
  const handleUpdateStoryDirect = (updatedStory: StoryWorld) => {
    const updated = stories.map(s => s.id === updatedStory.id ? updatedStory : s);
    saveStories(updated);
  };

  // Helper: toggle manual completed status
  const handleToggleRead = (charNum: number) => {
    if (!activeStory) return;
    const updated = stories.map(s => {
      if (s.id === activeStory.id) {
        return {
          ...s,
          arcs: s.arcs.map(arc => ({
            ...arc,
            chapters: arc.chapters.map(ch => {
              if (ch.number === charNum) {
                return {
                  ...ch,
                  status: ch.status === 'read' ? 'unread' : 'read'
                };
              }
              return ch;
            })
          })),
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    });
    saveStories(updated);
  };

  // Delete individual story archive
  const handleDeleteStory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you certain you wish to purge this serialized light novel matrix forever? This severed karma cannot be mended.")) {
      const updated = stories.filter(s => s.id !== id);
      saveStories(updated);
      if (activeStoryId === id) {
        setActiveStoryId(null);
        setCurrentScreen('home');
      }
    }
  };

  // Calculate stats for current active story
  const isCurrentArcFinished = activeStory && activeStory.arcs[activeStory.arcs.length - 1].isCompleted;

  return (
    <div className="min-h-screen bg-void text-signal font-sans selection:bg-human/80 select-none pb-20">
      
      {/* GLOBAL GLOW RAILS */}
      <div className="fixed top-0 inset-x-0 h-[3px] bg-gradient-to-r from-portal via-human to-portal z-50"></div>

      {/* HEADER BAR */}
      {(currentScreen !== 'reader' && currentScreen !== 'codex') && (
        <header className="border-b border-neutral-900 bg-black/90 backdrop-blur-md sticky top-0 z-40 py-1.5 sm:py-3 animate-fadeIn">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer select-none" onClick={() => { setCurrentScreen('home'); setActiveStoryId(null); }}>
              {/* Real corporate SEIHouse SEA Logo */}
              <img 
                src="https://images.seihouse.org/SEA%20LOGO/SEA%20LOGO.png" 
                alt="SEIHouse SEA Logo" 
                className="h-8 sm:h-10 w-auto object-contain brightness-110 filter drop-shadow-[0_0_8px_rgba(4,172,255,0.3)]"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="font-sc text-gold-accent text-[8px] sm:text-[10px] tracking-[0.25em] font-semibold block uppercase">SEIHouse Appellation</span>
                <h1 className="font-display font-bold text-sm sm:text-base md:text-lg text-signal tracking-wide leading-tight">Celestial Scroll Library</h1>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-void border border-neutral-850 hover:border-portal text-neutral-400 hover:text-portal transition-all rounded font-sc text-[10px] sm:text-xs flex items-center space-x-1.5 font-bold"
                title="Aether Router"
              >
                <Sliders size={12} className="text-portal font-semibold" />
                <span className="hidden sm:inline uppercase tracking-widest text-[9px] font-semibold">Router</span>
              </button>

              {activeStory && (
                <div className="hidden md:flex items-center space-x-2 bg-neutral-900/60 px-3 py-1.5 rounded border border-neutral-850">
                  <User size={12} className="text-jade-accent" />
                  <span className="text-xs text-neutral-300 font-medium font-mono">{activeStory.mcName}</span>
                  <span className="text-[10px] text-neutral-500 font-semibold uppercase">({activeStory.genre})</span>
                </div>
              )}

              {currentScreen !== 'home' ? (
                <button
                  onClick={() => { setCurrentScreen('home'); setActiveStoryId(null); }}
                  className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-void border border-neutral-850 hover:border-gold-accent text-[10px] sm:text-xs text-neutral-400 hover:text-gold-accent transition-all rounded font-sc uppercase tracking-wider flex items-center space-x-1.5 font-bold"
                >
                  <LogOut size={12} />
                  <span className="hidden xs:inline">Return to Library</span>
                  <span className="inline xs:hidden">Library</span>
                </button>
              ) : (
                <button
                  onClick={() => setCurrentScreen('creator')}
                  className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-void border border-human text-human hover:bg-human hover:text-signal transition-all shadow-[0_0_12px_rgba(139,0,0,0.2)] rounded font-sc uppercase text-[10px] sm:text-xs tracking-wider flex items-center space-x-1.5 font-bold animate-pulse"
                >
                  <Plus size={12} />
                  <span className="hidden xs:inline">Manifest Scroll</span>
                  <span className="inline xs:hidden">Manifest</span>
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* MAIN SCREEN BOX */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <AnimatePresence mode="wait">
          
          {/* SCREEN 1: Home / Dashboard */}
          {currentScreen === 'home' && (
            <motion.div
              key="home-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-12 pb-10"
            >
              {/* Dark Fantasy Webnovel Hero Banner */}
              <div className="relative rounded-xl border border-neutral-900 overflow-hidden shadow-2xl h-60 sm:h-80 flex items-end">
                <img 
                  src="https://images.unsplash.com/photo-1605371924599-2d0365da26f5?auto=format&fit=crop&q=80" 
                  alt="Fantasy Landscape" 
                  className="absolute inset-0 w-full h-full object-cover opacity-50 sm:opacity-60"
                />
                <div className="absolute inset-0 ink-gradient"></div>
                <div className="relative z-10 p-5 sm:p-12 w-full flex justify-between items-end">
                  <div className="max-w-2xl space-y-2 sm:space-y-3">
                    <span className="font-sc text-gold-accent font-bold uppercase tracking-[0.25em] text-[10px] sm:text-xs">Featured Ascension</span>
                    <h2 className="font-display font-bold text-2xl sm:text-4xl md:text-5xl text-signal leading-tight tracking-tight drop-shadow-lg">
                      Defying the Heavens
                    </h2>
                    <p className="text-neutral-300 font-serif text-xs sm:text-sm leading-relaxed max-w-xl shadow-black drop-shadow-md hidden xs:block">
                      A mortal rises. The sects tremble. Write your own destiny and shatter the 
                      limitations of the mortal coil in your customized light novel universe.
                    </p>
                    <div className="pt-2 sm:pt-4 flex flex-wrap gap-4">
                      <button
                        onClick={() => setCurrentScreen('creator')}
                        className="px-4 py-2 sm:px-6 sm:py-2.5 bg-human border border-human text-signal text-xs sm:text-sm font-sc font-bold uppercase tracking-wider rounded shadow-[0_0_15px_rgba(139,0,0,0.5)] hover:bg-void hover:text-human transition-all flex items-center space-x-1.5 sm:space-x-2"
                      >
                        <Sparkles size={14} />
                        <span>Carve New Destiny</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saved Stories List - Novel Shelves */}
              <div className="space-y-6" id="saved-matrices-list">
                
                {/* Local-First Storage & Archival Desk */}
                <div className="bg-neutral-950/80 border border-neutral-900 rounded-lg p-5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_30px_rgba(0,0,0,0.8)]" id="vault-desk-panel">
                  <div className="flex items-start space-x-3.5">
                    <div className="p-3 bg-portal/10 border border-portal/20 text-portal rounded-full flex-shrink-0">
                      <Database size={22} className="animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-sc font-bold text-sm text-signal uppercase tracking-wider">Aetherial Memory Sanctum</h4>
                        <span className="text-[10px] px-2 py-0.25 bg-[#00A86B]/15 border border-[#00A86B]/35 text-[#00A86B] font-mono rounded-full font-bold uppercase tracking-wider animate-fadeIn">
                          {storageType}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
                        Every character bio, relationship map, karma fate node, chapter summary, and reader preference is saved automatically to your local-first client-side database. Your progress can be saved to your physical device or mended instantly below.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3.5 w-full md:w-auto justify-end">
                    {/* Invisible file input */}
                    <label className="flex items-center space-x-2 bg-void hover:bg-neutral-900 text-neutral-300 hover:text-signal border border-neutral-800 hover:border-neutral-700 px-4 py-2 rounded text-xs font-sc font-bold uppercase tracking-wider cursor-pointer transition-all">
                      <Upload size={14} className="text-portal" />
                      <span>Import World Scroll</span>
                      <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleImportLibrary} 
                        className="hidden" 
                      />
                    </label>

                    <button
                      onClick={handleExportLibrary}
                      disabled={stories.length === 0}
                      className="flex items-center space-x-2 bg-void hover:bg-neutral-900 text-neutral-350 hover:text-signal border border-neutral-800 hover:border-neutral-700 px-4 py-2 rounded text-xs font-sc font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <Download size={14} className="text-gold-accent" />
                      <span>Backup Full Library</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                  <h3 className="font-display font-bold text-2xl text-signal tracking-wide flex items-center space-x-2">
                    <BookOpen size={20} className="text-gold-accent" />
                    <span>Your Library ({stories.length})</span>
                  </h3>
                </div>

                {stories.length === 0 ? (
                  <div className="text-center py-20 bg-[#111] border border-neutral-900 rounded-lg max-w-lg mx-auto shadow-inner">
                    <BookOpen size={40} className="text-neutral-800 mx-auto mb-4 animate-bounce" />
                    <h4 className="font-sc font-semibold text-neutral-400 text-sm uppercase tracking-wider mb-1">
                      No Scrolls Found
                    </h4>
                    <p className="text-xs text-neutral-600 max-w-xs mx-auto mb-6">
                      Your cultivation path is empty. Manifest a new realm to begin reading.
                    </p>
                    <button
                      onClick={() => setCurrentScreen('creator')}
                      className="px-4 py-2 bg-void border border-neutral-800 hover:border-gold-accent text-xs text-neutral-300 hover:text-gold-accent rounded transition-all font-sc uppercase tracking-widest"
                    >
                      Manifest Realm
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
                    {stories.map((story) => {
                      const totalChapters = story.arcs.reduce((sum, a) => sum + a.chapters.length, 0);
                      const generated = story.arcs.reduce((sum, a) => sum + a.chapters.filter(c => !!c.generatedContent).length, 0);
                      
                      return (
                        <div
                          key={story.id}
                          onClick={() => {
                            setActiveStoryId(story.id);
                            setCurrentScreen('detail');
                          }}
                          className="group cursor-pointer flex flex-col space-y-3"
                        >
                          <div className="relative aspect-[2/3] rounded-md overflow-hidden border border-neutral-800 group-hover:border-gold-accent shadow-lg transition-all duration-300 transform group-hover:-translate-y-1">
                            <img 
                              src={story.imageUrl || `https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&q=80`} 
                              alt={story.title}
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm border border-neutral-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-signal tracking-wider font-sc">
                              {generated}/{totalChapters} Ch
                            </div>
                            <button
                               onClick={(e) => handleDeleteStory(story.id, e)}
                               className="absolute top-2 left-2 p-1.5 text-neutral-400 bg-black/60 border border-neutral-800 backdrop-blur-sm hover:text-red-500 hover:border-red-900 rounded opacity-0 group-hover:opacity-100 transition-all font-sc"
                               title="Burn Scroll"
                            >
                               <Trash2 size={12} />
                            </button>
                            <div className="absolute bottom-2 left-2 right-2">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-jade-accent px-1.5 py-0.5 bg-black/80 border border-neutral-800 rounded mb-1 inline-block">
                                {story.genre}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <h4 className="font-display font-bold text-base text-signal group-hover:text-gold-accent transition-colors leading-tight line-clamp-2">
                              {story.title}
                            </h4>
                            <p className="text-[10px] text-neutral-500 font-sans truncate">
                              MC: {story.mcName} • {story.memory.currentPowerStage}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: Novel Detail */}
          {currentScreen === 'detail' && activeStory && (
            <motion.div
              key="detail-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-5xl mx-auto space-y-8"
            >
              {/* Top Section: Cover & Metadata */}
              <div className="flex flex-col md:flex-row gap-8 bg-[#0a0a0a] border border-neutral-900 rounded-xl p-6 shadow-2xl">
                {/* Cover Art */}
                <div className="w-full max-w-[180px] mx-auto md:max-w-none md:w-64 flex-shrink-0">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden border border-neutral-800 shadow-md">
                    <img 
                      src={activeStory.imageUrl || `https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&q=80`}
                      alt={activeStory.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 space-y-4">
                  <div className="space-y-1">
                    <h2 className="font-display font-bold text-3xl sm:text-4xl text-signal leading-tight">{activeStory.title}</h2>
                    <p className="font-sans text-xs text-neutral-400">Written by <span className="text-gold-accent">Aetherial Resonance</span> • {activeStory.createdAt.split('T')[0]}</p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-void border border-neutral-800 text-jade-accent px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
                      {activeStory.genre}
                    </span>
                    <span className="bg-void border border-neutral-800 text-neutral-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
                      Cultivation Rate: Heaven
                    </span>
                  </div>

                  {/* Stats Box */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-void border border-neutral-800 rounded-lg">
                    <div>
                      <p className="text-[10px] text-neutral-500 font-sc uppercase tracking-wider font-bold">Chapters</p>
                      <p className="font-mono text-signal text-lg">{activeStory.arcs.reduce((sum, a) => sum + a.chapters.length, 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 font-sc uppercase tracking-wider font-bold">Current Arc</p>
                      <p className="font-mono text-signal text-sm mt-1 truncate">{activeStory.arcs[activeStory.arcs.length - 1].title}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 font-sc uppercase tracking-wider font-bold">Realm</p>
                      <p className="font-mono text-portal text-sm mt-1 truncate">{activeStory.memory.currentPowerStage}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 font-sc uppercase tracking-wider font-bold">Status</p>
                      <p className="font-mono text-yellow-500 text-sm mt-1">
                        {isCurrentArcFinished ? 'Awaiting Arc' : 'Manifesting'}
                      </p>
                    </div>
                  </div>

                  {/* Synopsis */}
                  <div className="pt-2">
                    <h3 className="font-sc font-bold text-neutral-300 text-xs uppercase tracking-widest mb-2 border-b border-neutral-800 pb-1">Synopsis</h3>
                    <p className="font-serif text-sm text-neutral-400 leading-relaxed italic">
                      "{activeStory.customPremise}"
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-6 flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        const lastCh = activeStory.arcs[activeStory.arcs.length - 1].chapters.find(c => !c.generatedContent)?.number || activeStory.arcs[activeStory.arcs.length - 1].chapters[0].number;
                        setSelectedChapterNum(lastCh);
                        setCurrentScreen('reader');
                      }}
                      className="px-6 py-2.5 bg-human border border-human text-signal font-sc font-bold uppercase tracking-wider rounded shadow-md hover:bg-void hover:text-human transition-all flex items-center space-x-2 text-xs"
                    >
                      <BookOpen size={16} />
                      <span>Start Reading</span>
                    </button>

                    <button
                      onClick={() => setCurrentScreen('codex')}
                      className="px-6 py-2.5 bg-void border border-portal text-portal font-sc font-bold uppercase tracking-wider rounded hover:bg-portal hover:text-void transition-all flex items-center space-x-2 text-xs"
                    >
                      <Sparkles size={16} />
                      <span>Open Codex</span>
                    </button>

                    <button
                      onClick={() => handleExportSingleStory(activeStory)}
                      className="px-6 py-2.5 bg-void border border-neutral-800 text-neutral-400 font-sc font-bold uppercase tracking-wider rounded hover:bg-neutral-900 hover:border-neutral-700 hover:text-signal transition-all flex items-center space-x-2 text-xs"
                    >
                      <Download size={14} className="text-gold-accent" />
                      <span>Export World JSON</span>
                    </button>
                    
                    {isCurrentArcFinished && (
                      <button
                        onClick={() => {
                          setSelectedChapterNum(-1);
                          setCurrentScreen('reader');
                        }}
                        className="px-6 py-2.5 bg-void border border-gold-accent text-gold-accent font-sc font-bold uppercase tracking-wider rounded hover:bg-gold-accent/10 transition-all flex items-center space-x-2 text-xs ml-auto"
                      >
                        <Zap size={16} />
                        <span>Generate Next Arc</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: Novel Creator Portal */}
          {currentScreen === 'creator' && (
            <motion.div
              key="creator-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              <CreationPortal
                onStartStory={handleStartStory}
                isGenerating={isGenerating}
                error={appError}
              />
            </motion.div>
          )}

          {/* SCREEN 3: Reader */}
          {currentScreen === 'reader' && activeStory && (
            <motion.div
              key="reader-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between bg-black/60 border border-neutral-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded shadow-md backdrop-blur-md sticky top-0 z-30">
                <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
                  <button onClick={() => setCurrentScreen('detail')} className="text-neutral-500 hover:text-gold-accent transition-colors flex-shrink-0">
                    <ArrowLeft size={18} />
                  </button>
                  <span className="font-sc uppercase tracking-[0.12em] text-gold-accent font-bold text-[10px] sm:text-xs flex-shrink-0">{activeStory.genre}</span>
                  <span className="text-neutral-700 font-mono flex-shrink-0">•</span>
                  <span className="text-neutral-400 font-display text-xs sm:text-sm truncate pr-2">{activeStory.title}</span>
                </div>
                <div className="flex-shrink-0">
                   <button
                     onClick={() => setCurrentScreen('codex')}
                     className="px-2.5 py-1 sm:px-4 sm:py-1.5 bg-void border border-portal text-portal font-sc font-bold uppercase tracking-wider rounded hover:bg-portal hover:text-void transition-all flex items-center space-x-1 sm:space-x-2 text-[9px] sm:text-[10px]"
                   >
                     <Sparkles size={11} />
                     <span>Codex</span>
                   </button>
                </div>
              </div>

              {selectedChapterNum === -1 ? (
                <div className="animate-fadeIn max-w-4xl mx-auto shadow-2xl">
                  <SteerPortal
                    isSteering={isGenerating}
                    onSteerArc={handleSteerArc}
                    currentArcIndex={activeStory.arcs.length}
                  />
                </div>
              ) : (
                <div className="mx-auto">
                  <ReaderChamber
                    chapters={activeStory.arcs[activeStory.arcs.length - 1].chapters}
                    arcTitle={activeStory.arcs[activeStory.arcs.length - 1].title}
                    currentPowerStage={activeStory.memory.currentPowerStage}
                    onGenerateChapter={handleGenerateChapter}
                    isGenerating={isGenerating}
                    selectedChapterNum={selectedChapterNum}
                    setSelectedChapterNum={setSelectedChapterNum}
                    onToggleRead={handleToggleRead}
                    onSwitchTab={(tab) => {
                      if (tab === 'codex') setCurrentScreen('codex');
                    }}
                    activeStory={activeStory}
                    onUpdateStory={handleUpdateStoryDirect}
                  />

                  {activeStory.arcs[activeStory.arcs.length - 1].isCompleted && (
                    <div className="mt-4 max-w-4xl mx-auto p-4 bg-neutral-950 border border-neutral-900 rounded flex justify-between items-center text-xs">
                      <span className="text-neutral-400 font-sans">All chapters of this arc generated! Steer next segment.</span>
                      <button
                        onClick={() => setSelectedChapterNum(-1)}
                        className="px-4 py-1.5 bg-human text-signal text-[10px] font-bold font-sc uppercase tracking-wider rounded border border-human hover:bg-void transition-all"
                      >
                        Steer Story Fate
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* SCREEN 4: Codex */}
          {currentScreen === 'codex' && activeStory && (
            <motion.div
              key="codex-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center space-x-2 bg-black/60 border border-neutral-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded shadow-md backdrop-blur-md mb-6 sticky top-0 z-30">
                <button onClick={() => setCurrentScreen('detail')} className="text-neutral-500 hover:text-portal transition-colors flex-shrink-0">
                  <ArrowLeft size={18} />
                </button>
                <span className="text-portal font-display text-sm sm:text-lg font-bold truncate">{activeStory.title}</span>
                <span className="text-neutral-600 font-sans text-xs sm:text-sm flex-shrink-0">- Living Codex</span>
              </div>
              <div className="max-w-6xl mx-auto">
                <LivingCodex
                  memory={activeStory.memory}
                  arcs={activeStory.arcs}
                  onUpdateMemory={handleUpdateMemoryManual}
                  mcName={activeStory.mcName}
                  onJumpToChapter={(num) => {
                    setSelectedChapterNum(num);
                    setCurrentScreen('reader');
                  }}
                  onSwitchTab={(tab) => {
                    if (tab === 'reader') setCurrentScreen('reader');
                  }}
                  activeStory={activeStory}
                  onUpdateStory={handleUpdateStoryDirect}
                  routingConfig={routingConfig}
                />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-neutral-950 bg-black/60 pt-10 pb-16 mt-20 text-[10px] text-neutral-600 font-sans">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <p className="tracking-widest uppercase font-sc text-neutral-500 font-semibold">
            SEIHouse: A Better Time Capsule and Translator of Artistic Expression
          </p>
          <p className="max-w-xl mx-auto italic leading-normal font-light">
            This private fiction engine operates server-side, securing your compiled chapter script files and character memory nodes locally in browser cache space. Keep true to your creative spark, and let the matrix tell your story.
          </p>
        </div>
      </footer>

      {/* AETHER VECTOR ROUTER MODAL */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-neutral-950 border border-neutral-900 rounded p-6 shadow-2xl z-10 overflow-hidden"
            >
              {/* Top Accent Lines */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-portal via-human to-portal"></div>

              {/* Header */}
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-5">
                <div className="flex items-center space-x-2">
                  <Sliders className="text-portal" size={16} />
                  <h2 className="font-sc font-bold uppercase tracking-widest text-[#FAFAFA] text-sm">Aether Vector Router</h2>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-neutral-500 hover:text-signal transition-colors text-[10px] font-mono uppercase tracking-wider"
                >
                  [Close]
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-xs text-neutral-400 font-sans leading-normal">
                    Map individual creative tasks to physical AI providers and underlying vector models. All requests proxy through server endpoints to keep keys secure.
                  </p>
                </div>

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

                  <div>
                    <select
                      value={routingConfig.storyMaker.model}
                      onChange={(e) => handleUpdateModel('storyMaker', e.target.value)}
                      className="w-full bg-void text-xs text-neutral-300 border border-neutral-900 focus:border-portal p-1.5 rounded focus:outline-none font-mono"
                    >
                      {((routingPresets || DEFAULT_PRESETS).storyMaker[routingConfig.storyMaker.provider] || []).map((mod: string) => (
                        <option key={mod} value={mod}>{mod}</option>
                      ))}
                    </select>
                  </div>
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

                  <div>
                    <select
                      value={routingConfig.imageGenerator.model}
                      onChange={(e) => handleUpdateModel('imageGenerator', e.target.value)}
                      className="w-full bg-void text-xs text-neutral-300 border border-neutral-900 focus:border-human p-1.5 rounded focus:outline-none font-mono"
                    >
                      {((routingPresets || DEFAULT_PRESETS).imageGenerator[routingConfig.imageGenerator.provider] || []).map((mod: string) => (
                        <option key={mod} value={mod}>{mod}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Aetherial Keys Selection override block */}
                <div className="space-y-4 bg-black/40 border border-neutral-900/60 p-3 rounded text-left">
                  <div className="flex items-center justify-between border-b border-neutral-900/80 pb-2">
                    <span className="font-sc text-[11px] tracking-[0.12em] text-portal font-bold uppercase">Dynamic Aether Credentials</span>
                    <span className="text-[8px] font-mono text-neutral-500 uppercase">Input override</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-mono text-neutral-400">Gemini Key Override</label>
                        {localGeminiKey && <span className="text-[9px] font-mono text-emerald-400">Merged</span>}
                      </div>
                      <input
                        type="password"
                        placeholder="Paste your Gemini AI key..."
                        value={localGeminiKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalGeminiKey(val);
                          localStorage.setItem('@seihouse/api-key-gemini', val);
                        }}
                        className="w-full bg-void text-xs text-neutral-300 border border-neutral-900 focus:border-portal p-1.5 rounded focus:outline-none font-mono placeholder:text-neutral-700"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-mono text-neutral-400">OpenRouter Key Override</label>
                        {localOpenrouterKey && <span className="text-[9px] font-mono text-emerald-400">Merged</span>}
                      </div>
                      <input
                        type="password"
                        placeholder="Paste your OpenRouter key..."
                        value={localOpenrouterKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalOpenrouterKey(val);
                          localStorage.setItem('@seihouse/api-key-openrouter', val);
                        }}
                        className="w-full bg-void text-xs text-neutral-300 border border-neutral-900 focus:border-portal p-1.5 rounded focus:outline-none font-mono placeholder:text-neutral-700"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-mono text-neutral-400">Ollama Host Override</label>
                        {localOllamaHost && <span className="text-[9px] font-mono text-emerald-400">Merged</span>}
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. http://localhost:11434"
                        value={localOllamaHost}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalOllamaHost(val);
                          localStorage.setItem('@seihouse/api-key-ollama-host', val);
                        }}
                        className="w-full bg-void text-xs text-neutral-300 border border-neutral-900 focus:border-portal p-1.5 rounded focus:outline-none font-mono placeholder:text-neutral-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="text-[10px] bg-neutral-950 p-2.5 rounded border border-neutral-900 font-mono text-neutral-500 divide-y divide-neutral-900/40 text-left">
                  <div className="pb-1 flex justify-between items-center">
                    <span>Ollama Host Path:</span>
                    <span className="text-neutral-300 font-semibold">{localOllamaHost || "localhost:11434 (default)"}</span>
                  </div>
                  <div className="pt-1 pb-1 flex justify-between items-center">
                    <span>OpenRouter Key Stream:</span>
                    {localOpenrouterKey ? (
                      <span className="text-emerald-400 font-semibold">Custom Key Hooked</span>
                    ) : (
                      <span className="text-portal font-semibold">Sovereign Proxy Active</span>
                    )}
                  </div>
                  <div className="pt-1 flex justify-between items-center">
                    <span>Gemini Meridian Key:</span>
                    {localGeminiKey ? (
                      <span className="text-emerald-400 font-semibold">Custom Key Hooked</span>
                    ) : (
                      <span className="text-portal font-semibold">Sovereign Native Active</span>
                    )}
                  </div>
                </div>

                {/* Confirm button */}
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
    </div>
  );
}
