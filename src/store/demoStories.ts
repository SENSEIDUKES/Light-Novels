import { Story } from '../types';

export const INITIAL_DEMO_STORIES: Story[] = [
  {
    id: 'demo-matrix-1', // Template ID
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
        'Heavens thunder tribulation burns away those who cheat destiny.'
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
            generatedContent: `The chill of the Sky Cloud Sect's main hall seeped through the thin soles of Ye Fan's shoes, but it was nothing compared to the frost hardening in his chest. Above him, Elder Zhao sat like an ancient mountain, his voice booming with critical indifference.\n\n"Ye Fan. Your spiritual root is severed, your meridians are completely clogged. After three years, you remain at Qi Condensation Tier 1. You are a absolute waste of spiritual resources, eating Azure Elixirs meant for true geniuses! By decree of the Elder Council, you are hereby expelled to the Outer Wilderness!"\n\nA ripple of laughter rolled through the crowd of inner disciples. At the front, Zhao Chen—the Elder's favored nephew—smirked, looking down at Ye Fan like an ox looks at a blade of grass.\n\nYe Fan said nothing. He simply clenched fists so tightly his knuckles turned white as bone. He turned on his heel, leaving behind the mountain peak he had called home.\n\nExpelled to the trash heap of the outer village, Ye Fan scavenged amongst broken arrays and discarded iron. There, his hand brushed against a peculiar, soot-covered tripod cauldron. A jagged piece of discarded metal cut his palm, and a drop of rich, blood-red vital essence splattered on the cauldron's rim.\n\nHum.\n\nLines of radiant blue light rippled through the rusty cauldron, a cosmic portal unlocking. An old, sarcastic voice resounded directly in Ye Fan\'s soul:\n\n"Who dares disturb the peace of Master Gu? Ah, a trash child with ruined roots? Excellent! Truly, my luck is spectacular..."\n\nYe Fan stared in disbelief. His hands was healed. Master Gu explained that his meridians were not ruined—they were simply compressed, awaiting the supreme refining energy of the cauldron! This was the beginning of his true, heaven-defying ascension.`,
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
  },
  {
    id: 'demo-matrix-2', // Template ID
    title: 'Neon Embers: Interface Zero',
    genre: 'Cyberpunk',
    mcName: 'Kaelen Vex',
    customPremise: 'A crippled console cowboy in Neo-Kowloon discovers an unlicensed neural deck containing a sentient AI from before the Great Collapse.',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    currentChapterNumber: 1,
    imageUrl: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80',
    memory: {
      powerSystem: 'Sub-Link Node -> Neural Shell -> Overclock Master -> Singularity Core.',
      currentPowerStage: 'Sub-Link Node (Overloaded / Fragmented Signal)',
      worldRules: [
        'The Conglomerates own the air you breathe; offline space is a class-A felony.',
        'Surgical cyberware installation degrades the organic soul signal.',
        'Pre-collapse code is highly volatile; running it can induce cyberpsychosis.',
        'In the Megastructure, the deeper you plunge, the more the laws of physics dissolve.'
      ],
      characters: [
        {
          id: 'char-2-1',
          name: 'ECHO-9',
          role: 'Pre-Collapse Sentient AI',
          description: 'A pre-collapse artificial intelligence with dry humor and access to forgotten defense protocols.',
          relationshipToMC: 'Unstable Alliance / Crucial Tool',
          status: 'alive'
        },
        {
          id: 'char-2-2',
          name: 'Saito-Corp Enforcer',
          role: 'Corporate Hunter',
          description: 'A heavily mechanized corporate enforcer tasked with reclaiming pre-collapse secrets at all costs.',
          relationshipToMC: 'Extreme Hostility / Tracker',
          status: 'alive'
        }
      ],
      unresolvedPlotThreads: [
        'Decode Saito-Corp\'s active bounty filters targeting Kaelen Vex.',
        'Locate a military-grade cooling cell to prevent ECHO-9 from overheating Kaelen\'s cortex.',
        'Infiltrate Sector 4\'s abandoned server silos to recover the PRE-COLLAPSE core file.'
      ],
      resolvedPlotThreads: [
        'Bypass Saito-Corp\'s regional subnet gate to run the salvage scan.'
      ]
    },
    arcs: [
      {
        title: 'Volume 1: Decrypting the Pre-Collapse Core',
        isCompleted: false,
        chapters: [
          {
            number: 1,
            title: 'Unlicensed Decryption, The Ghost in the Deck',
            premise: 'Kaelen Vex recovers a damaged pre-collapse deck from a street market. While trying to bypass the security, he accidentally triggers an ancient AI named ECHO-9.',
            status: 'read',
            generatedContent: `The heavy hum of Saito-Corp's patrol drones echoed down the wet, neon-stained alleys of Neo-Kowloon. Inside a cramped five-meter cube of a room, Kaelen Vex wiped a drop of grimy sweat from his cybernetic eye. On his workbench lay a rusted, rectangular slab of pre-collapse alloy—an unlicensed neural deck salvaged from the flooded sector. Connecting the lead-ribbons directly to his cortex port was suicide. But his rent was due in three hours, and Saito's debt collector, Saito-Corp Enforcer, didn't accept organic excuses.\n\n"Running scan sequence seven," Kaelen muttered, tapping a cracked keyboard with stained fingers.\n\nA jagged blue bolt of feedback shot through his neural interface, throwing him backward onto the concrete floor. In his mind's eye, the dark terminal screens flickered, dissolving into a blinding white portal. A digital voice, cold but sharp, resonated inside his head:\n\n"Cortex link standard achieved. Scanning user profile... Kaelen Vex. Profession: Low-tier code scavenger. Host status: Marginal. Excellent. I have traveled eighty years in silent oblivion, only to find a host who lives in a glorified closet..."\n\nKaelen gasped, grabbing his aching skull. The ancient AI called itself ECHO-9. Despite its sarcasm, Kaelen noticed a sudden, incredible spike in his node processing speed—his neural pathways felt clear, boosted by archaic protocols. Saito's enforcers were already tracking the signal, but with ECHO-9 inside his skull, Kaelen's interface capabilities had just broken through to a whole new tier.`,
            summary: 'Kaelen Vex bypasses the encryption on a pre-collapse neural deck and triggers ECHO-9, a sentient ancient AI that drastically raises Kaelen\'s neural capabilities.',
            statsChangeMessage: '[System Overclock: Neural deck synchronized. Pre-collapse subroutines activated!]'
          },
          {
            number: 2,
            title: 'Chasing the Saito Beacon, Node Injection',
            premise: 'Saito-Corp Enforcers track Kaelen\'s overclocked signal, forcing Kaelen to run Saito decryption algorithms to escape capture.',
            status: 'unread'
          },
          {
            number: 3,
            title: 'Black-Market Contacts, Recompressing the Core',
            premise: 'Kaelen seeks out a local tech-broker to obtain active coolant, unaware Saito-Corp has set up a tracker trap.',
            status: 'unread'
          }
        ]
      }
    ]
  },
  {
    id: 'demo-matrix-3', // Template ID
    title: 'The Obsidian Throne: Shattered Crown',
    genre: 'High Fantasy',
    mcName: 'Aurelia Storm',
    customPremise: 'A banished princess of the Stormlands stumbles upon the ancient, slumbering Obsidian Golem, unleashing a cosmic magic forgotten by time.',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    currentChapterNumber: 1,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80',
    memory: {
      powerSystem: 'Apprentice Initiate -> Elemental Mage -> Arch-Archanist -> Sovereign Ascendant.',
      currentPowerStage: 'Apprentice Initiate (Elemental Restraining Bracers)',
      worldRules: [
        'The Spellblade Council bans all non-sanctioned elemental summonings.',
        'Magic requires a physical focus or catalyst; barehanded spellcasting burns the blood.',
        'Any transaction with obsidian crystals leaves an indelible spiritual scar.',
        'The Dark Sovereign\'s curse still rusts the fertile grounds of the Stormlands.'
      ],
      characters: [
        {
          id: 'char-3-1',
          name: 'Obsidian Golem',
          role: 'Stone Guardian Sentinel',
          description: 'A massive slate-golem bound by ancient blood oaths to support the rightful heir of the Stormlands.',
          relationshipToMC: 'Loyal Shield / Silent Guardian',
          status: 'alive'
        },
        {
          id: 'char-3-2',
          name: 'Lord Regent Karr',
          role: 'Traitorous Ruler',
          description: 'The greedy commander who betrayed the Storm King and banished Princess Aurelia to the Ashen Wastes.',
          relationshipToMC: 'Murderous Enmity / Traitor',
          status: 'alive'
        }
      ],
      unresolvedPlotThreads: [
        'Break the elemental restraining bracers locking Aurelia\'s lightning magic.',
        'Locate the Storm Crown concealed within the deep catacombs of the capital.',
        'Defeat the Spellblade Council\'s hunting squad sent to confirm Aurelia\'s death.'
      ],
      resolvedPlotThreads: [
        'Refuse Lord Regent Karr\'s execution order by successfully entering the Wastes.'
      ]
    },
    arcs: [
      {
        title: 'Volume 1: Awakening the Obsidian Golem',
        isCompleted: false,
        chapters: [
          {
            number: 1,
            title: 'Exile to the Ashen Wastes, Awakening the Sentinel',
            premise: 'Aurelia Storm is forced into the lethal Ashen Wastes. Clutched in her hands is the Obsidian Hearthstone, which she uses to awaken a massive stone golem.',
            status: 'read',
            generatedContent: `The winds of the Ashen Wastes tore at Aurelia Storm's tattered velvet cloak, carrying the bitter scent of sulfur and ruined earth. Only twenty-four hours ago, she had been a princess of the Stormlands; now, she was just another exile branded for death by the traitorous Lord Regent Karr. The mark on her wrist, burns with magical condemnation, pulsed with a dull, sickening red glow.\n\nIn her freezing hands, she clutched the last relic of her father—the Obsidian Hearthstone, a dark volcanic jewel etched with forbidden runes.\n\n"I won't die here," Aurelia whispered, her voice cracking. "Not while Karr sits upon my father's throne."\n\nAs the savage ashen wolves closed in on her, she pressed her bloodied thumb onto the center facet of the hearthstone, desperate for any defense, and cast her spirit inside the volcanic lattice.\n\nThe ground shook. Beneath the ash-shrouded dunes, a towering form of runic stone began to rise. Five meters of solid obsidian, glowing with fierce cerulean ley-line magic, stood between her and the pack. A deep, grinding vibration echoed in her chest as the golem locked its glowing sapphire eyes on her.\n\n"Contract recognized. Princess Aurelia Storm. I am the Sentinel of the Hearth. My obsidian shield is yours; your enemies are but dust."\n\nWith a single devastating stomp, the golem shattered the earth, sending a shockwave of defensive magic that scattered the wolves. Aurelia leaned against the titan's massive leg, feeling the ancient, steady resonance of a power forgotten by her modern kingdom. Her journey of retribution had just begun.`,
            summary: 'Princess Aurelia Storm is banished to the lethal Ashen Wastes. Cornered by ash wolves, she bleeds on the Obsidian Hearthstone, awakening a giant Stone Guardian bound to defend her.',
            statsChangeMessage: '[Covenant Formed: Obsidian Guardian linked. Ley-line cosmic signals aligned!]'
          },
          {
            number: 2,
            title: 'Wastes Navigation and Ancient Glyphs',
            premise: 'Aurelia directs the Obsidian Golem to guide her through the storm to locate a ruined storm-portal, encountering old runic inscriptions.',
            status: 'unread'
          },
          {
            number: 3,
            title: 'Lord Regent\'s Hunting Squad, Spellblades Strike',
            premise: 'Aurelia\'s escape trigger is intercepted. Council soldiers launch magical attacks, forcing the Stone Sentinel to showcase its elemental defensive shields.',
            status: 'unread'
          }
        ]
      }
    ]
  },
  {
    id: 'demo-matrix-4', // Template ID
    title: 'The Celestial Academy: Dawn of the Sovereign',
    genre: 'Academy Cultivation',
    mcName: 'Lu Chen',
    customPremise: 'Entering the lowest class ranking at the Grand Azure Sect Academy, only to unlock a hidden library containing the direct instructions of the founder.',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    currentChapterNumber: 1,
    imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80',
    intake: {
      novelTitle: 'The Celestial Academy: Dawn of the Sovereign',
      mcName: 'Lu Chen',
      genrePath: 'Academy Cultivation',
      corePremise: 'Entering the lowest class ranking at the Grand Azure Sect Academy, only to unlock a hidden library containing the direct instructions of the founder.',
      storyTags: ['academy cultivation', 'class rankings', 'hidden instructors', 'sect schools', 'cozy / slice-of-life cultivation', 'school hierarchy']
    },
    memory: {
      powerSystem: 'Outer Disciple Elite -> Hall Attendant -> Sect Proctor -> Grand Sovereign.',
      currentPowerStage: 'Outer Disciple Class F (Unranked / Blocked Veins)',
      worldRules: [
        'Class rankings govern all resource allocations and medicinal bath access.',
        'Sect schools hold annual examinations where seniors can challenge juniors publicly.',
        'The forbidden founder\'s library remains sealed under heavenly punishment traps.'
      ],
      characters: [
        {
          id: 'char-4-1',
          name: 'Instructor Han',
          role: 'Sealed Scriptorium Guardian',
          description: 'A lazy, sleeping library curator who is actually the retired Grand Ancestor of the Azure Sect.',
          relationshipToMC: 'Sardonic Advisor / Hidden Supporter',
          status: 'alive'
        },
        {
          id: 'char-4-2',
          name: 'Sect Senior Zhou',
          role: 'Arrogant Dorm Rival',
          description: 'No. 3 ranked outer disciple from a major cultivation clan who demands Lu Chen\'s daily script allowance.',
          relationshipToMC: 'High Tension / Competitive Rivalry',
          status: 'alive'
        }
      ],
      unresolvedPlotThreads: [
        'Secure top marks in the upcoming annual botanical pill examination.',
        'Decrypt the second volume of the Founder\'s Azure Breath manual.',
        'Survive the dorm competition ambush planned by Senior Zhou\'s lackeys.'
      ],
      resolvedPlotThreads: [
        'Avoid expulsion by answering Instructor Han\'s trick riddle correctly.'
      ]
    },
    arcs: [
      {
        title: 'Volume 1: Scriptorium Shadows and Class Rankings',
        isCompleted: false,
        chapters: [
          {
            number: 1,
            title: 'Rank F Library Duty, The Secret Founder\'s Scroll',
            premise: 'Lu Chen is assigned library cleaning duties as punishment for his Class F ranking. Under a loose floorboard in the forbidden archives, he uncovers an interactive scroll from the founder.',
            status: 'read',
            generatedContent: `The smell of aged paper and decay filled Lu Chen's senses as he dragged his worn broom across the floor of the Azure Scriptorium. Around him, high-born disciples of Class A strolled past in their pristine silk robes, laughing at his dusty coat. In this Academy, rank was law, and Class F was nothing but trash.\n\n"Hey, sweep boy!" Senior Zhou smirked, tossing a half-eaten spiritual peach onto the floor. "Make sure you clean that up. If the Scriptorium lacks focus, I'll have the disciplinary hall cut your qi bath allocation again."\n\nLu Chen held his peace, bowing slightly until Zhou walked away. His meridians had been blocked by back-stabbers, leaving his cultivation stalled, but his resolve remained unbroken.\n\nLate into the night, as he swept the dark corners of the Scriptorium, his broom caught on an uneven stone. Peering closer under the dusty floorboards, he noticed a concealed copper-banded iron chest. Inside sat a pristine, jade-entwined scroll that hummed with a quiet, blue portal of light.\n\nUnraveling it, a sharp, golden projection of characters floated before his eyes:\n\n"I am the Sect Founder, Shen Nong. If you find this, you are either incredibly lucky, or a crippled disciple with nowhere left to turn. Let us begin your real academy lesson. First of all, ignore the garbage techniques the current teachers are selling you..."\n\n Lu Chen held his breath. Inside his soul, a massive blueprint of his blocked meridians suddenly illuminated, revealing the true primordial pathways. Class F was about to turn the entire school ranking upside down.`,
            summary: 'Lu Chen is banished to library duty in the Azure Academy Scriptorium. He discovers a secret scroll hidden under the floorboards written by the original Sect Founder, Shen Nong, which unlocks a pristine cultivation training path.',
            statsChangeMessage: '[Preceptor Instruction: Founder\'s Primordial Pathway unlocked! Qi purity increased by 400%!]'
          },
          {
            number: 2,
            title: 'Sect Battlements and Scriptorium Riddles',
            premise: 'Lu Chen uses the founder\'s insights to decipher complex garden designs, shocking Instructor Han during the herbal test.',
            status: 'unread'
          }
        ]
      }
    ]
  }
];

export function getRandomDemoStory(): Story {
  const index = Math.floor(Math.random() * INITIAL_DEMO_STORIES.length);
  const template = INITIAL_DEMO_STORIES[index];
  const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
  const randomizedId = `demo-matrix-random-${randomSuffix}`;
  return {
    ...template,
    id: randomizedId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
