import { Story } from '../types';

export const INITIAL_DEMO_STORIES: Story[] = [
  {
    id: 'challenge-prince-die',
    title: 'The Prince Who Dies in Every Timeline',
    genre: 'Fate Survival',
    mcName: 'Prince Lin',
    customPremise: 'In seven chapters, the prince will be assassinated. Every timeline says he dies. Can you change fate before it happens?',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    currentChapterNumber: 1,
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80',
    intake: {
      novelTitle: 'The Prince Who Dies in Every Timeline',
      mcName: 'Prince Lin',
      genrePath: 'Fate Survival',
      corePremise: 'In seven chapters, the prince will be assassinated. Every timeline says he dies. Can you change fate before it happens?',
      storyTags: ['fate survival', 'doom countdown', 'time loop', 'regressor', 'changing timelines', 'assassination plots']
    },
    memory: {
      powerSystem: 'Temporal Resistance (Tiers I-V) & Fate Disruption Aura.',
      currentPowerStage: 'Tier I: Blind Seeker (Fragile Destiny Line)',
      worldRules: [
        'The Seven-Step Countdown: Prince Lin\'s heart is destined to be pierced in the 7th chapter.',
        'Chronos Paradox: Any direct advice given to the guard corps will be erased by the shadow covenant.',
        'Karmic Backlash: Every attempt to save him increases the active suspicion of the Prime Minister.',
        'The Seven-Step Countdown: The doom counter is active. Chapter 7 is the absolute temporal limit.'
      ],
      characters: [
        {
          id: 'char-prince-1',
          name: 'Master Xun',
          role: 'Covenant Whisperer / Hidden Advisor',
          description: 'A blind scholar who remembers past timelines and assists Lin with divine advice.',
          relationshipToMC: 'Playful Bond / Absolute Ally',
          status: 'alive'
        },
        {
          id: 'char-prince-2',
          name: 'Prime Minister Gao',
          role: 'The Hidden Puppeteer',
          description: 'The greedy mastermind who orchestrates the assassination and controls the Shadow Guild.',
          relationshipToMC: 'Extreme Hostility / Hidden Enemy',
          status: 'alive'
        }
      ],
      unresolvedPlotThreads: [
        {
          id: 'thread-prince-1',
          description: 'Identify the hidden poisoner in the Palace imperial kitchen.',
          status: 'active',
          originChapter: 1
        },
        {
          id: 'thread-prince-2',
          description: 'Find the legendary Chronos Key to delay the Seven-Step countdown.',
          status: 'active',
          originChapter: 1
        },
        {
          id: 'thread-prince-3',
          description: 'Acquire the Golden Amulet of Warding to block the pierce of the shadow blade.',
          status: 'active',
          originChapter: 1
        }
      ],
      resolvedPlotThreads: []
    },
    arcs: [
      {
        title: 'Act I: The Seven-Step Countdown',
        isCompleted: false,
        chapters: [
          {
            number: 1,
            title: 'The Birthday Banquet and the Whisper of Death',
            premise: 'Prince Lin hosts a celestial banquet to celebrate his birthday. Hidden in the shadow, a poison-tipped dagger has already been blessed. The countdown has begun.',
            status: 'read',
            generatedContent: `The laughter of a hundred lords filled the grand Jade Hall, yet to Prince Lin, it sounded like the chatter of gulls before a storm. Above him, a banner of gold and lapis lazuli proclaimed his twentieth year—the year he was prophesied to take the Dragon Throne.\n\nBut Lin knew the truth. Behind the smiles of the high court, a shadow was creeping closer. In three hours, a poisoner would offer the ceremonial wine. In seven days, the Shadow Guild would strike. Every timeline he had regressed from ended with a cold blade piercing his chest.\n\n"Your Highness," Prime Minister Gao spoke, bowing with a flawless, practiced smile. "A toast to your eternal health. May your reign be as endless as the stars."\n\nHe offered a goblet of crimson glass. Inside, the vintage smelled of spiced berries, but Lin’s temporal senses detected the faint, almond-like tang of frozen hemlock. If he drank, he would die tonight, restarting the loop. If he refused openly, the Prime Minister\'s guards would seize the hall.\n\nWith a silent prayer to the Chronos wheel, Lin gestured with his wide sleeve, apparently stumbling in his excitement. The goblet slipped from his hand, shattering against the obsidian floor. The red wine pooled like fresh blood.\n\n"Forgive my clumsiness," Lin laughed, wiping his robe. Prime Minister Gao’s eyes narrowed for a fraction of a second, the hidden puppeteer realizing his first trap had been evaded. But as Lin looked up, a crimson prompt appeared in his vision: \n\n[Doom Clock activated: 6 Chapters remain. Suspect profile: Imperial Butler is compromised. Current Danger Level: 35%]`,
            summary: 'Prince Lin celebrates his birthday. A poisoned cup of hemlock is offered by Prime Minister Gao, but Lin uses his regressor knowledge to deliberately spill the cup. Although saved from poison, the countdown continues.',
            statsChangeMessage: '[Doom Clock activated: 6 Chapters remain. Suspect profile: Imperial Butler is compromised. Current Danger Level: 35%]'
          },
          { number: 2, title: 'The Shadow in the Library: A Silent Poison', premise: 'Prince Lin seeks information on the prime minister\'s shadow guild in the imperial archives, unaware a silent gaseous trap has been laid.', status: 'unread' },
          { number: 3, title: 'The Midnight Betrayal of the Guard Captain', premise: 'A trusted defender is offered a massive bribe to leave the gate unlocked at midnight. Can Prince Lin intercept the exchange?', status: 'unread' },
          { number: 4, title: 'The False Envoy\'s Golden Tribute', premise: 'A foreign delegation presents a gift that hides a clockwork assassin. Lin must identify the trick before the chest is opened.', status: 'unread' },
          { number: 5, title: 'The Solstice Ritual and the Silent Spell', premise: 'During the high temple blessing, the high priest casts an invisible doom curse on Lin. He must steer the blessing to reflect the spell.', status: 'unread' },
          { number: 6, title: 'Dawn of the Seventh Day: Complete Isolation', premise: 'The palace is sealed by the Prime Minister under false pretenses of a quarantine. Lin must coordinate with Master Xun to breach the block.', status: 'unread' },
          { number: 7, title: 'The Assassination Hour: Red Moon over the Palace', premise: 'The final confrontation. The shadow assassins launch a coordinated strike on the inner chamber. Lin must use all his gathered tools to break the loop.', status: 'unread' }
        ]
      }
    ]
  },
  {
    id: 'challenge-saintess-executed',
    title: 'The Saintess Executed at Dawn',
    genre: 'Fate Survival',
    mcName: 'Saintess Sylvia',
    customPremise: 'At the break of dawn, the grand inquisitor will execute Saintess Sylvia for heresy she did not commit. Can you break her chains before sunrise?',
    createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    currentChapterNumber: 1,
    imageUrl: 'https://images.unsplash.com/photo-1548623917-2fbf0f687511?auto=format&fit=crop&q=80',
    intake: {
      novelTitle: 'The Saintess Executed at Dawn',
      mcName: 'Saintess Sylvia',
      genrePath: 'Fate Survival',
      corePremise: 'At the break of dawn, the grand inquisitor will execute Saintess Sylvia for heresy she did not commit. Can you break her chains before sunrise?',
      storyTags: ['fate survival', 'execution countdown', 'heresy trial', 'church intrigue', 'divine light magic', 'prison break']
    },
    memory: {
      powerSystem: 'Divine Resonance (0% to 100%) & Sacred Light Weaver.',
      currentPowerStage: '0% Resonance (Sealed Divinity / Shaded Soul)',
      worldRules: [
        'Sunrise Execution: The grand guillotine is prepped. The trial ends when dawn breaks (Chapter 7).',
        'Anti-Magic Shackle: High-inquisitor runes prevent Sylvia from calling upon the light directly.',
        'The Web of Heresy: Any citizen attempting to speak on her behalf is branded a co-conspirator.'
      ],
      characters: [
        {
          id: 'char-saint-1',
          name: 'Inquisitor Malakor',
          role: 'The Grand Executioner',
          description: 'A ruthless fanatic who fabricates heretical texts to seize the church\'s treasury.',
          relationshipToMC: 'Extreme Hostility / Sworn Enemy',
          status: 'alive'
        },
        {
          id: 'char-saint-2',
          name: 'Lucian',
          role: 'The Rogue Templar',
          description: 'A secret sympathizer seeking to smuggle Sylvia out of the Holy Citadel.',
          relationshipToMC: 'Playful Bond / Absolute Ally',
          status: 'alive'
        }
      ],
      unresolvedPlotThreads: [
        {
          id: 'thread-saint-1',
          description: 'Smuggle the Sacred Heart relic back into the cathedral to restore Sylvia\'s divinity.',
          status: 'active',
          originChapter: 1
        },
        {
          id: 'thread-saint-2',
          description: 'Obtain the key to the Anti-Magic Shackles from Malakor\'s study.',
          status: 'active',
          originChapter: 1
        },
        {
          id: 'thread-saint-3',
          description: 'Expose the forged heretical treaty to the High Cardinal before sunrise.',
          status: 'active',
          originChapter: 1
        }
      ],
      resolvedPlotThreads: []
    },
    arcs: [
      {
        title: 'Act I: Before the Dawn Breaks',
        isCompleted: false,
        chapters: [
          {
            number: 1,
            title: 'Midnight Bells and the Guillotine\'s Shadow',
            premise: 'Locked in the Obsidian Cell, Sylvia watches the crescent moon rise. High above her dungeon window, she hears the clink of the heavy blades being sharpened.',
            status: 'read',
            generatedContent: `The cold stone of the Holy Citadel\'s deepest dungeon offered no comfort to Saintess Sylvia. Her wrists, bound in cold black anti-magic iron, burned with runic scars. Outside her narrow barred window, the hollow sound of iron hammers echoed through the courtyard. They were building the scaffold.\n\n"Heretic," Grand Inquisitor Malakor had spat when he threw her into the abyss. He had forged the treaties, claimed she was communicating with demonic realms, all to seize the ancient relics of the Sun Cathedral.\n\nSylvia closed her eyes. Her light magic was completely sealed by the shackles. Without her divine resonance, she was just an ordinary girl, scheduled to ascend the scaffold when the first rays of dawn touched the spires.\n\nSuddenly, a faint tapping sound came from the stone wall. A loose block slid aside, and a young templar recruit named Lucian peered through, his face pale with worry. He could not pull her through the narrow crack, but he held out a small copper band etched with secret runes.\n\n"My Saintess," he whispered. "I cannot break these walls, but this ring bypasses the citadel\'s silence ward. We can communicate across the Citadel. Tell me how to steer the templars. I will be your hands on the outside."\n\nSylvia touched the ring. Instantly, a warm current entered her mind, and a bright red prompt materialized in her vision:\n\n[Execution Countdown: 6 Segments remain. Holy Resonance: 5%. Inquisitor Vigilance: Low. Lucian mind-link activated.]`,
            summary: 'Saintess Sylvia is locked in the Holy Citadel\'s dungeon awaiting dawn execution. Lucian, a rogue templar, passes her a telepathic copper ring, enabling her to coordinate with the outside world.',
            statsChangeMessage: '[Execution Countdown: 6 Segments remain. Holy Resonance: 5%. Inquisitor Vigilance: Low.]'
          },
          { number: 2, title: 'Secrets of the Scriptorium: The Forger\'s Signature', premise: 'Sylvia directs Lucian to search the high archives for the ink used to forge the heretical pacts, aiming to prove the inquisitor\'s guilt.', status: 'unread' },
          { number: 3, title: 'The Midnight Interrogation of the Holy Sister', premise: 'Inquisitor Malakor conducts a surprise cell inspection, trying to locate any communication runes. Sylvia must hide her telepathic connection.', status: 'unread' },
          { number: 4, title: 'The Rogue Templar\'s Rescue Diversion', premise: 'Lucian attempts to create a fire in the armory to draw guard attention, but gets cornered. Sylvia must guide him through the corridors.', status: 'unread' },
          { number: 5, title: 'The Sacred Heart Relic Recovered', premise: 'Lucian reaches the high altar to retrieve the Sacred Heart relic. He must smuggle it into the prison sector to break Sylvia\'s shackles.', status: 'unread' },
          { number: 6, title: 'The Cardinal\'s Doubt and Malakor\'s Fury', premise: 'The High Cardinal arrives early to inspect the prisoner. Sylvia has one chance to sow seed of doubt before Malakor silences her.', status: 'unread' },
          { number: 7, title: 'The Execution Scaffold: Exposing the Liars', premise: 'Dawn has arrived. Sylvia is led to the guillotine. Lucian must trigger the exposing light ritual at the exact second to save her life.', status: 'unread' }
        ]
      }
    ]
  },
  {
    id: 'challenge-kingdom-falls',
    title: 'The Kingdom That Falls in Seven Days',
    genre: 'Fate Survival',
    mcName: 'Commander Alistair',
    customPremise: 'On the seventh day, the Iron-Clad Horde will breach the Capital walls. Can you root out the rot and secure the city\'s survival?',
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    currentChapterNumber: 1,
    imageUrl: 'https://images.unsplash.com/photo-1464746133101-a2c3f88e0dd9?auto=format&fit=crop&q=80',
    intake: {
      novelTitle: 'The Kingdom That Falls in Seven Days',
      mcName: 'Commander Alistair',
      genrePath: 'Fate Survival',
      corePremise: 'On the seventh day, the Iron-Clad Horde will breach the Capital walls. Can you root out the rot and secure the city\'s survival?',
      storyTags: ['fate survival', 'siege survival', 'military strategy', 'traitor purge', 'fortress defense', 'political betrayal']
    },
    memory: {
      powerSystem: 'Defensive Fortitude & Tactical Willpower.',
      currentPowerStage: 'Garrison Commander (Undermanned Force)',
      worldRules: [
        'Tectonic Siege: The Iron-Clad Horde approaches with world-shattering siege engines, arriving on Day 7.',
        'Rotted Foundation: Outer grain stores are targeted for arson on Day 3.',
        'Absolute Isolation: Allied reinforcing armies will only march if the signal beacons are lit on Day 5.'
      ],
      characters: [
        {
          id: 'char-king-1',
          name: 'Adjutant Robert',
          role: 'Loyal Vanguard',
          description: 'A young, brave lieutenant who will die defending the South Gate unless reinforced.',
          relationshipToMC: 'Playful Bond / Absolute Ally',
          status: 'alive'
        },
        {
          id: 'char-king-2',
          name: 'Baron Vane',
          role: 'The Golden Traitor',
          description: 'A corrupt senator feeding intelligence and grain supplies to the Horde.',
          relationshipToMC: 'Extreme Hostility / Hidden Enemy',
          status: 'alive'
        }
      ],
      unresolvedPlotThreads: [
        {
          id: 'thread-king-1',
          description: 'Unmask Baron Vane\'s smuggler networks before the grain supplies are burned.',
          status: 'active',
          originChapter: 1
        },
        {
          id: 'thread-king-2',
          description: 'Light the Beacon of Valerius on the high peak to request outer reinforcement.',
          status: 'active',
          originChapter: 1
        },
        {
          id: 'thread-king-3',
          description: 'Reconstruct the ancient ballistas on the city walls before the Horde arrives.',
          status: 'active',
          originChapter: 1
        }
      ],
      resolvedPlotThreads: []
    },
    arcs: [
      {
        title: 'Act I: The Siege Calendar',
        isCompleted: false,
        chapters: [
          {
            number: 1,
            title: 'Empty Silos and the Vulture\'s Feast',
            premise: 'Commander Alistair conducts a midnight inspection of the royal granaries, only to find them empty. At the Senate, Baron Vane votes to cut guard salaries.',
            status: 'read',
            generatedContent: `The stone ramparts of the capital fortress were cold, but not as cold as the dread in Commander Alistair\'s chest. Standing atop the South Gate, he looked out at the dark horizon. Somewhere in that blackness, sixty thousand riders of the Iron-Clad Horde were marching. They would arrive in seven days.\n\nHe had just returned from inspecting the city silos. They were completely bare. The grain meant to feed the fifty thousand citizens during a year-long siege had been secretly carted away and sold. At the Senate hall, Baron Vane sat on a gilded chair, smiling as he voted to reduce the garrison\'s rations.\n\n"We must accept our fate, Commander," Vane had said with a smooth chuckle. "The Horde is unstoppable. Why waste precious coin on soldiers whose deaths are already decreed?"\n\nAlistair spat on the flagstones. The Senate had been bought. If the Horde arrived with the silos empty and guards starving, the walls would fall within hours of their arrival. He had to act.\n\nIn the darkness, his young lieutenant, Robert, approached with a nervous salute. "Commander, my scouts found a secret trade ledger in the lower docks. Someone is smuggling food *out* of the city through the canal gates. It bears Vane\'s crest."\n\nAlistair clutched the hilt of his broadsword. The countdown had begun, and a red blueprint illuminated in his mind:\n\n[Siege Timer: 6 Days remain. Wall Integrity: 100%. Food Stores: Critical (2 days remaining). Smuggler network identified.]`,
            summary: 'Commander Alistair discovers the royal granaries are empty due to Baron Vane\'s embezzlement. Lieutenant Robert secures a smuggler ledger, giving Alistair his first lead to reclaim the food stores.',
            statsChangeMessage: '[Siege Timer: 6 Days remain. Wall Integrity: 100%. Food Stores: Critical (2 days remaining).]'
          },
          { number: 2, title: 'Smugglers in the Slums: Reclaiming the Grain', premise: 'Alistair leads a midnight raid on Baron Vane\'s hidden docks in the canal sewers to reclaim the stolen flour and barley.', status: 'unread' },
          { number: 3, title: 'Day of the Red Dust: The Well Water Poison', premise: 'Baron Vane\'s agents poison the city\'s central aqueduct. Alistair must locate the antidote before half the guard falls ill.', status: 'unread' },
          { number: 4, title: 'Beacons in the Dark: The Climb to the High Peak', premise: 'Alistair sends Robert to light the ancient mountain beacon to summon the Western Alliance, who are currently unaware of the invasion.', status: 'unread' },
          { number: 5, title: 'The Treason of the West Gate Garrison', premise: 'A bribed officer attempts to unlock the canal gate to let in a vanguard horde detachment. Alistair must defend the gate in close combat.', status: 'unread' },
          { number: 6, title: 'Siege Engines on the Horizon', premise: 'The Horde arrives at the gates. They launch burning boulders of pitch. Alistair must deploy the reconstructed ballistas to destroy their catapults.', status: 'unread' },
          { number: 7, title: 'Day of Iron: Defending the Shattered Wall', premise: 'The final siege begins. The South wall collapses under tectonic battering rams. Alistair must lead a desperate shield wall defense to hold until the reinforcements arrive.', status: 'unread' }
        ]
      }
    ]
  },
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
