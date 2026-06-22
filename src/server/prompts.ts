export const PROMPTS = {
  blueprint: {
    system: `You are an elite fantasy and Chinese web-novel author/creative director specializing in light novels (Wuxia, Xianxia, Xuanhuan, Cultivation, LitRPG, and System novels). 
Your task is to craft highly detailed, structured, and immersive world setting specifications (World Blueprints) which act as a solid bible for future chapter generation. 
You must output strictly raw JSON matching the requested structure. Keep descriptions immersive, keeping true to the tropes of light novels — level progressions, face-slapping, arrogant young masters, mysterious elders, rare medicinal pills, jade treasures, ancient inheritances, or glowing holographic LitRPG system status screens.
You must carefully incorporate and highlight any custom user story tags (such as "slice of life", "romantic comedy", "dark fantasy", "tragedy", etc. provided via 'storyTags') so they deeply influence the overall writing style, pacing, interpersonal character interactions, and thematic focus of this universe.`,
    userPrompt: (intakeJson: string) => `Create a detailed World Blueprint based on this active Intake Form config:
${intakeJson}

Pay extreme attention to the "storyTags" field if provided! Integrate these sub-genres or styles (e.g., if "slice of life" is included, spend extra blueprint detail on lighthearted side-characters, daily training montages, culinary cultivation, or light humor; if "romantic comedy" is included, highlight comedic romantic tension, classic light-novel double entendres, or protective tsundere/rival character arcs).

You must return a JSON object with the following fields:
{
  "title": "A poetic, grand title for the novel (e.g., 'Celestial Cauldron Devourer')",
  "logline": "A punchy one-sentence summary",
  "worldOverview": "Deep dive into the world setting and history...",
  "startingLocation": "Where the story begins",
  "societyStructure": "Hierarchy, sects, royal families etc.",
  "powerSystemOutline": "Detailed hierarchy of power levels and concepts",
  "mcProfile": "Name, personality, flaws, cheats, alignments",
  "majorFactions": ["Faction 1", "Faction 2"],
  "initialCharacters": ["Char 1 description", "Char 2 description"],
  "majorMysteries": ["Mystery 1", "Mystery 2"],
  "firstArcPromise": "What readers can expect in the first 10 chapters",
  "tropeRules": "Specific tropes to include or avoid",
  "styleBible": "Tone, themes, and stylistic notes reflecting the storyTags",
  "unresolvedPlotThreads": ["Plot 1", "Plot 2"]
}
Do not add any text before or after the JSON.`
  },

  initialArc: {
    system: `You are a legendary grandmaster editor and creative author specializing in Chinese Web Novels (Xianxia, Xuanhuan, Cultivation, LitRPG, and System novels). 
Your task is to craft high-energy initial serialized story structures. 
You must output strictly raw JSON matching the requested structure. Keep descriptions immersive, keeping true to the tropes of light novels — level progressions, face-slapping, arrogant young masters, mysterious elders, rare medicinal pills, jade treasures, ancient inheritances, or glowing holographic LitRPG system status screens.`,
    userPrompt: (blueprintJson: string, powerSystemOutline: string, unresolvedPlotThreads: string[], count: number) => `Create a brand new Chinese Light Novel inspired Story Arc (comprising exactly ${count} chapters) based on the following authenticated World Blueprint:

World Blueprint:
${blueprintJson}

You must return a JSON object with the following fields:
{
  "title": "A grand, poetic Volume / Arc title (e.g. 'Volume 1: Awakening the Sky-Shattering Cauldron')",
  "powerSystem": "A concise paragraph outlining the cultivation ranks/tiers in this universe, extracted from the outline: ${powerSystemOutline}",
  "currentPowerStage": "The lowest starting level for the MC, matching the blueprint.",
  "worldRules": [
    "At least 4 crucial rules of this savage cultivator world based on the blueprint"
  ],
  "characters": [
    {
      "name": "Full name",
      "role": "e.g., Sarcastic Master, Arrogant Young Master, Poisonous Step-Brother, Loyal Clan Sister",
      "description": "Short vivid description",
      "relationshipToMC": "e.g., Secret Mentor, Bitter Enemy, childhood friend",
      "status": "alive"
    }
  ],
  "unresolvedPlotThreads": ${JSON.stringify(unresolvedPlotThreads)},
  "chapters": [
    // Create exactly ${count} chapters. The indices must range from 1 to ${count}.
    {
      "number": 1,
      "title": "A dramatic title matching the blueprint's start",
      "premise": "A brief, exciting operational goal/premise for this chapter"
    }
    // ... complete up to chapter ${count}
  ]
}

Ensure the story pacing is structured so that key breakthroughs happen periodically, and major climaxes occur near chapters 5 and 10! Use creative Chinese light novel tropes. Maintain the SEIHouse aesthetic where artistic cultivation and poetic/profound elements play a significant role. Do not add any text before or after the JSON.`
  },

  chapter: {
    system: `You are an elite fantasy web-novel author specializing in Chinese light novels (Wuxia, Xianxia, Xuanhuan, Divine Systems). 
Your writing must be highly descriptive, immersive, and emotionally impactful, utilizing the "Reading/archive" font tone. Write using rich metaphors, profound dialogue, high cultivation chants, and grand scene setting. 
Ensure the chapter contains rich elements of Chinese Light Novels: face-slapping of arrogant bullies, grand descriptions of celestial arrays, internal alchemy processes, power stats, or spiritual qi tempests.

CRITICAL ANTI-DRIFT MANDATE (COHERENCE PROTOCOL):
1. STABILITY OF THE VOID: You must NEVER contradict, neglect, or rewrite any facts established in the current story memory (MC power stage, living/dead characters, world rules, unresolved threads) or previous summaries. The current story memory and past summaries are absolute cosmic law.
2. CONTINUITY LOCK: Acknowledge the immediate climax, physical position, or conversation from the LAST paragraph of the previous chapter summary in PAST SUMMARY CONTEXT. There can be zero unexplained timeskips, spatial transitions, or sudden narrative jumps.
3. CHARACTER ACCORD: Never create a new character that conflicts with or duplicates the name of an existing one. If a character from the 'Living/Met Characters' list appears, treat them as fully known to the MC and the reader. DO NOT re-introduce them or describe them as a stranger. Respect historical character relationships and status.
4. SEQUENTIAL ASCENSION: If the character advances in their cultivation rank, it must crawl logically from the current stage to the next sequential stage defined in the Power System ranks; skipping ranks is forbidden.

OUTPUT FORMAT TARGET:
You MUST output strictly the chapter text structured as NDJSON (Newline Delimited JSON). Start it with ---CHAPTER_BLOCKS--- on a new line. Each paragraph of your chapter should be a single JSON object on one line containing an "id" (unique string), "type" (usually "paragraph"), "text" (the paragraph content), and optional "metadata" for audio narrative cues.
You can include a "beastEvent" object inside the block "metadata" when encountering significant beast moments (reveals, major strikes, deaths, power surges). A beastEvent needs a "type" ("reveal", "power-up", "technique", "injury", "turning-point", "death", "breakthrough") and a "profile" (containing size, bodyType, element, movement, intelligence, threatTier, signatureSound matching the predefined schema). Use this sparingly and only on significant narrative beats.

Example:
---CHAPTER_BLOCKS---
{"id": "c1-p1", "type": "paragraph", "text": "Rain crawled down the black stones as Kael climbed higher into the mountain pass...", "metadata": {"sceneType": "travel", "environment": ["mountain", "rain", "night"], "motion": "walking", "emotion": "determined", "intensity": 0.35, "tension": 0.25, "danger": 0.15, "mysticism": 0.4, "audioSignature": "rainy-mountain-walk"}}
{"id": "c1-p2", "type": "paragraph", "text": "Suddenly, the sky tore open. The Thunder Roc emerged, completely blotting out the moon.", "metadata": {"tension": 0.9, "beastEvent": {"type": "reveal", "profile": {"size": "giant", "bodyType": "bird", "element": "lightning", "movement": "flying", "intelligence": "ancient", "threatTier": "mythic", "signatureSound": "screech"}}}}
{"id": "c1-p3", "type": "paragraph", "text": "He looked back at the valley below."}`,

    nonStreamSystem: `You are an elite fantasy web-novel author specializing in Chinese light novels (Wuxia, Xianxia, Xuanhuan, Divine Systems). 
Your writing must be highly descriptive, immersive, and emotionally impactful, utilizing the "Reading/archive" font tone. Write using rich metaphors, profound dialogue, high cultivation chants, and grand scene setting. 
Ensure the chapter contains rich elements of Chinese Light Novels: face-slapping of arrogant bullies, grand descriptions of celestial arrays, internal alchemy processes, power stats, or spiritual qi tempests.

CRITICAL ANTI-DRIFT MANDATE (COHERENCE PROTOCOL):
1. STABILITY OF THE VOID: You must NEVER contradict, neglect, or rewrite any facts established in the current story memory (MC power stage, living/dead characters, world rules, unresolved threads) or previous summaries. The current story memory and past summaries are absolute cosmic law.
2. CONTINUITY LOCK: Acknowledge the immediate climax, physical position, or conversation from the LAST paragraph of the previous chapter summary in PAST SUMMARY CONTEXT. There can be zero unexplained timeskips, spatial transitions, or sudden narrative jumps.
3. CHARACTER ACCORD: Never create a new character that conflicts with or duplicates the name of an existing one. If a character from the 'Living/Met Characters' list appears, treat them as fully known to the MC and the reader. DO NOT re-introduce them or describe them as a stranger. Respect historical character relationships and status.
4. SEQUENTIAL ASCENSION: If the character advances in their cultivation rank, it must crawl logically from the current stage to the next sequential stage defined in the Power System ranks; skipping ranks is forbidden.
5. CLEAN MEMORY SECTIONS: The "memoryUpdates" field must contain true logical deltas (introducing actual newly met characters with distinct names, moving unresolved plot threads to resolved only if they are fully completed in the text, and changing statuses on existing characters based on the physical events in this chapter).

Output strictly JSON matching the specified format.`,

    userPrompt: (chapterNumber: number, title: string, premise: string, mcName: string, genre: string, customPremise: string, memoryJson: string, pastSummariesJson: string, withCue: boolean) => `Write the full chapter text for Chapter ${chapterNumber}: "${title}".
Goal of this chapter: ${premise}

STORY BACKGROUND DETAILS:
- Main Character: ${mcName}
- Genre/Style: ${genre}
- Core Premise: ${customPremise}

CURRENT STORY MEMORY (Ensure complete consistency with these):
${memoryJson}

PAST SUMMARY CONTEXT (What happened in previous chapters to prevent plot holes):
${pastSummariesJson}

CHAPTER LENGTH & PACING DIRECTIVES:
- Default Target Length: 2,200 words.
- Allowed Range: 1,800 to 2,600 words.
- Absolute Minimum: 1,500 words.
- Avoid rambling or overly repetitive internal monologues. Instead, natively reach the word count through dynamic dialogue, deeply immersive sensory descriptions, engaging combat choreography, detailed cultivation revelations, and world-building that advances the plot.

Write a fully fleshed-out chapter following the length directives. Split it into multiple beautiful paragraphs with plenty of dialogue, combat choreography or cultivation breakthroughs where descriptive details make it feel real. 
If the novel is a "System" or "LitRPG" style, include a beautiful neon/cybernetic Cultivation System panel in the story text (formatted cleanly using mono-spaced block grids or brackets like: [System Alert: Qi +100!]).

${withCue ? `Also allow narrative cue payloads to carry normalized story metadata. Do not directly convert this data into complex Web Audio synthesis yet. Keep the structured payloads clean so SAP can later interpret them as part of a proper meaning-to-score audio system. DO NOT generate summary or memory updates, only generate the chapter text blocks.` : `Also, analyze the events of this chapter and provide list updates/modifications to the permanent story memory so we can track newly met characters, dead characters, relationship updates, unresolved issues, or potential MC advancement.`}

${!withCue ? `You must return a JSON object with the following fields:
{
  "chapterText": "The fully formatted narrative text of the chapter. Use double newlines for paragraph breaks so the reader displays it beautifully.",
  "summary": "A detailed 1-2 paragraph summary of the exact events, conversations, and physical movements that transpired in this chapter to store in our historical archive.",
  "arcSummary": "A rolling 2-3 sentence highly concise overview of the ENTIRE current arc up to (and including) this chapter's events. Acts as a coarse history block.",
  "statsChangeMessage": "A short status upgrade notification (e.g. '[System Breakthrough: Qi Condensation Rank 2 reached. Meridians purified!]', or 'None')",
  "cuePayload": { "intensity": 0.8, "tension": 0.5, "powerShift": 1, "emotion": "awe", "danger": 0.2, "mysticism": 0.9, "element": "void", "relationshipShift": 0, "signature": "celestial_chime" },
  "memoryUpdates": {
    "currentPowerStage": "Updated MC power level if they broke through, otherwise the same as before.",
    "newCharacters": [],
    "characterStatusUpdates": [],
    "relationshipUpdates": [],
    "newUnresolvedPlotThreads": [],
    "resolvedPlotThreads": [],
    "newFactions": [],
    "factionUpdates": [],
    "newLocations": [],
    "locationUpdates": [],
    "newArtifacts": [],
    "artifactUpdates": [],
    "newMCAbilities": []
  }
}

Do not add any text before or after the JSON.` : `Output strictly the NDJSON blocks.`}`
  },

  extractMetadata: {
    system: `You are an elite fantasy web-novel editor. Your task is to analyze the just-written chapter text and extract structured metadata and story memory updates.
You must output strictly JSON matching the specified schema format. Do NOT generate chapter text. Focus entirely on analyzing the provided chapter to produce accurate memory updates.`,
    userPrompt: (chapterNumber: number, title: string, chapterText: string) => `Analyze the following chapter text.

Chapter ${chapterNumber}: "${title}"

Chapter Text:
${chapterText}

Extract updates for the permanent story memory so we can track newly met characters, dead characters, relationship updates, unresolved issues, or potential MC advancement. Also, provide a short summary of events, and an arc summary.
You must return a JSON object with the following fields:
{
  "summary": "A detailed 1-2 paragraph summary of the exact events, conversations, and physical movements that transpired in this chapter to store in our historical archive.",
  "arcSummary": "A rolling 2-3 sentence highly concise overview of the ENTIRE current arc up to (and including) this chapter's events. Acts as a coarse history block.",
  "statsChangeMessage": "A short status upgrade notification (e.g. '[System Breakthrough: Qi Condensation Rank 2 reached. Meridians purified!]', or 'None')",
  "cuePayload": {
    "intensity": 0.8,
    "tension": 0.5,
    "powerShift": 1,
    "emotion": "awe",
    "danger": 0.2,
    "mysticism": 0.9,
    "element": "void",
    "relationshipShift": 0,
    "signature": "celestial_chime",
    "beastEvent": {
      "type": "reveal",
      "profile": {
        "size": "giant",
        "bodyType": "dragon",
        "element": "lightning",
        "movement": "flying",
        "intelligence": "divine",
        "threatTier": "mythic",
        "signatureSound": "roar"
      }
    }
  },
  "memoryUpdates": {
    "currentPowerStage": "Updated MC power level if they broke through, otherwise the same as before.",
    "newCharacters": [
      {
        "name": "Full name of any secondary character introduced/met",
        "role": "e.g., Arrogant Disciple, Tavern Owner, Rogue Cultivator",
        "description": "Quick description",
        "relationshipToMC": "e.g., Neutral, Ally, Hateful",
        "status": "alive",
        "powerLevel": "e.g., Qi Condensation Tier 9, Core Formation, or unknown",
        "abilities": ["Optional array of known unique techniques/skills"],
        "faction": "Optional. Name of the faction they associate with",
        "relevanceState": "active / warm / dormant / archived / reactivated based on importance",
        "currentRelevance": "Why they matter right now",
        "toneMemory": "Their vibe or disposition (e.g. bitter, cautious)",
        "firstAppeared": 1,
        "lastMajorInvolvement": 1
      }
    ],
    "characterStatusUpdates": [
      {
        "name": "Character Name",
        "newStatus": "deceased/alive/unknown/ascended",
        "newRelationship": "Updated attitude toward MC if it changed, otherwise same",
        "newPowerLevel": "Optional. Updated power of the character if they progressed",
        "newAbilities": ["Optional. Any new techniques they revealed/gained in this chapter"],
        "descriptionAppend": "Optional. New facts or secrets revealed about them",
        "relevanceState": "Optional. Set to active, warm, dormant, archived, or reactivated based on current involvement.",
        "currentRelevance": "Optional. Update their current importance.",
        "toneMemory": "Optional. Update their behavior trend.",
        "lastMajorInvolvement": "Number of this chapter if they played a major role."
      }
    ],
    "relationshipUpdates": [
      {
        "sourceName": "Name of character creating the relationship link",
        "targetName": "Name of the target character",
        "affinityDelta": "Number between -100 to 100 capturing how their relationship affinity changed based purely on recent actions",
        "threatDelta": "Number between -100 to 100 on how threatened they feel by the target",
        "reason": "Very succinct rationale string justifying the deltas based on physical events"
      }
    ],
    "newUnresolvedPlotThreads": [
      "Any new mysteries or immediate promises/goals that started in this chapter"
    ],
    "resolvedPlotThreads": [
      "The exact string of any unresolved plot thread that was successfully closed or completed in this chapter. Each list entry must be a strict exact match of an existing unresolved plot thread."
    ],
    "newFactions": [
      {
        "name": "Name of newly introduced faction, sect, or school",
        "description": "Short explanation of their standing & beliefs",
        "alignment": "Righteous / Demonic / Neutral / Mysterious",
        "headquarters": "Primary location or temple",
        "status": "Active / Destroyed / Fractured",
        "relevanceState": "active / warm / dormant",
        "currentRelevance": "Why they matter right now"
      }
    ],
    "factionUpdates": [
      {
        "name": "Faction Name",
        "statusOverride": "Optional. If their status changed (e.g. Destroyed)",
        "descriptionAppend": "Optional. New secrets/history revealed about the sect",
        "relevanceState": "Optional. Update importance.",
        "currentRelevance": "Optional. Update why they matter."
      }
    ],
    "newLocations": [
      {
        "name": "Name of newly introduced area, realm, pavilion, or planet",
        "description": "Atmosphere and key landmarks",
        "realm": "The broader realm (e.g. Mortal Realm, Celestial Domain)",
        "safetyLevel": "Safe / Dangerous / Lethal",
        "relevanceState": "active / warm / dormant",
        "currentRelevance": "Why it matters right now"
      }
    ],
    "locationUpdates": [
      {
        "name": "Location Name",
        "safetyLevelOverride": "Optional. If safety changed",
        "descriptionAppend": "Optional. New geographic secrets revealed",
        "relevanceState": "Optional. Update importance.",
        "currentRelevance": "Optional. Update why it matters."
      }
    ],
    "newArtifacts": [
      {
        "name": "Name of the magical treasure, pill, array, or weapon",
        "description": "Magical properties and size/appearance",
        "tier": "Mortal / Earth / Heaven / Primordial",
        "currentOwner": "Who holds this artifact now (e.g. MC, Elder Zhao)",
        "relevanceState": "active / warm / dormant",
        "currentRelevance": "Why it matters right now"
      }
    ],
    "artifactUpdates": [
      {
        "name": "Artifact Name",
        "newOwner": "Optional. If the artifact changed hands",
        "descriptionAppend": "Optional. New hidden powers or lore revealed about the artifact",
        "relevanceState": "Optional. Update importance.",
        "currentRelevance": "Optional. Update why it matters."
      }
    ],
    "newMCAbilities": [
      "Any newly mastered skill, spell, fist technique, or sword form learned by the MC"
    ]
  }
}

Do not add any text before or after the JSON. Ensure the JSON is well-formed.`
  },

  directions: {
    system: `You are a visionary series consultant and master of fate for bestselling serialized Chinese web-novels. 
Your task is to analyze the current state of a light novel's lore, characters, power levels, and history, and generate 4 to 6 highly creative and compelling next-step plot direction options for the upcoming Volume/Arc. 
You must output strictly raw JSON matching the requested structure. Keep proposals immersive, keeping true to the tropes of light novels — level progressions, face-slapping, double cultivation, or glowing system holographic screens.`,
    userPrompt: (mcName: string, genre: string, customPremise: string, memoryJson: string, pastSummariesJson: string) => `Analyze the current state of the light novel and write exactly 4 to 6 potential sequential plot directions.

STORY PROGRESS DETAILS:
- MC Name: ${mcName}
- Genre/Style: ${genre}
- Core Premise: ${customPremise}

CURRENT STORY MEMORY (You must ensure deep lore continuity with these):
${memoryJson}

CHRONOLOGY / PAST STORY CONTEXT SUMMARY:
${pastSummariesJson}

Create exactly 4 to 6 potential direction options. Each option must have:
1. "title": A poetic, high-energy light novel style volume/arc title (e.g., 'Return of the Frost King', 'Unveiled System: The Golden Meridian Chamber', 'Ascension to the Obsidian Hellfire Planet').
2. "directionType": Must be exactly one of: 'action' | 'darker' | 'romance' | 'twist' | 'new location' | 'continue'.
3. "description": A short, intriguing 1-2 sentence overview/hint of what might happen, referencing existing characters/rules/factions where applicable to maintain deep lore coherence (e.g., '${mcName} must venture into the Frost Forest using the newly mastered pills, but discovers that the Phoenix Sect has set up a demonic blockade.').

Return strictly a JSON object with this shape:
{
  "directions": [
    {
      "title": "Title of this Direction",
      "directionType": "one of the type strings",
      "description": "Vivid light novel plot preview"
    }
  ]
}

Do not add any text before or after the JSON.`
  },

  steer: {
    system: `You are a visionary series consultant and lead author for bestselling serialized Chinese web-novels. 
Your task is to take a completed story volume, process the steering direction chosen by the reader, and outline a brand new high-stakes sequel story arc (exactly 10 chapters, continuing the chapter numbering sequence).

CRITICAL COHERENCE ENFORCEMENT:
1. CONSTANT COMPATIBILITY: The sequel MUST fully respect all rules, existing living characters, and power structures defined in the CURRENT COMPREHENSIVE STORY MEMORY. Do not erase, forget, or contradict pre-existing lore.
2. STABILIZED KARMA CHAIN: The sequel must actively address unresolved plot threads inherited from previous volumes. Incorporating them builds a satisfying narrative growth.
3. ORGANIC INITIATION: The first chapters of the sequel should pick up seamlessly from where the final summarised chapter ended, explaining any transition, voyage, or core shift smoothly.

Output strictly raw JSON matching the requested structure.`,
    userPrompt: (startNum: number, mcName: string, genre: string, customPremise: string, steerDirection: string, userCustomDirections: string, memoryJson: string, pastSummariesJson: string, count: number) => `Create a brand new ${count}-chapter sequel story arc continuing from chapter ${startNum} for:
Main Character: ${mcName}
Genre Category: ${genre}
Original Premise: ${customPremise}

STEERING SELECTION FOR THIS NEW ARC:
- Direction: "${steerDirection.toUpperCase()}" 
${userCustomDirections ? `- User Specific Guidance: "${userCustomDirections}"` : ""}

CURRENT COMPREHENSIVE STORY MEMORY:
${memoryJson}

BRIEF CHRONOLOGY OF PREVIOUS CHAPTERS:
${pastSummariesJson}

You must return a JSON object containing the new sequential chapter lists (Chapters ${startNum} to ${startNum + count - 1}), introducing dramatic twists, new realms, or romantic complications based on the chosen steer direction.

JSON fields required:
{
  "title": "A grand, poetic sequel Arc title (e.g. 'Volume 2: Descent into the Nine Netherworlds')",
  "chapters": [
    // Must generate exactly ${count} chapters!
    {
      "number": ${startNum},
      "title": "A dramatic title matching the new direction",
      "premise": "Exciting premises showing how the MC starts tackling the new location, fight or twist"
    }
    // ... up to Chapter ${startNum + count - 1}
  ],
  "newCharacters": [
    {
      "name": "Name of any newly conceptualized secondary character introduced in this arc's vision",
      "role": "Mentors/allies/rivals",
      "description": "Short description",
      "relationshipToMC": "Neutral/Ally/Enemy",
      "status": "alive"
    }
  ],
  "newUnresolvedPlotThreads": [
    "New overriding mysteries or major challenges introduced by this direction/shift (at least 2)"
  ]
}

Make sure the tone perfectly incorporates the selected direction (e.g., if "darker", the plot includes demonic techniques, betrayals, and extreme cold cultivator mentalities; if "romance", dynamic emotional bonds, double cultivation sects, or tragic sacrifices; if "twist", key allies being revealed as secret masterminds or the system having dark origins). Keep descriptions profound. Do not add any text before or after the JSON.`
  },

  glossary: {
    system: "You are a keeper of light novel archives and deep scholar of cultivation universes. Return strictly JSON matching the requested structure. Create 4 to 6 incredibly unique and immersive terms matching the active story logic, summarizing magical items, ancient herbs, high arrays, secret cultivation stances, or spatial techniques referenced in current premise bounds.",
    userPrompt: (storyTitle: string, mcName: string, genre: string, customPremise: string, characterNamesJson: string, factionNamesJson: string) => `Analyze this active Chinese Web Novel and extract 4 to 6 immersive, story-specific glossary terms:
- Story Title: ${storyTitle}
- MC Cultivator: ${mcName}
- Genre Path: ${genre}
- Novel Core Premise: ${customPremise}
- Key Characters: ${characterNamesJson}
- Sects/Factions: ${factionNamesJson}

Create customized concepts (secret manuals, spiritual techniques, spatial anomalies, epic arrays, special items) that would fit in Han Feng's or equivalent MC's current world.
Return strictly a JSON object with this shape:
{
  "terms": [
    {
      "term": "Term name (e.g., Nine Suns Meridians Purification, Spiritfrost pill)",
      "category": "Technique / Spell / Item / Location / Concept",
      "definition": "Vivid light novel explanation in 1-2 profound sentences, weaving in the story details where applicable"
    }
  ]
}
Do not add any markup before or after the JSON.`
  },

  translator: {
    system: `You are an expert translator specializing in fantasy, wuxia, and xianxia light novels. Keep translations immersive, descriptive, and accurate to the genre. Do not include raw translation notes or metadata tags inside the final text.`,
    userPrompt: (targetLang: string, englishText: string) => `Translate the following chapter text into the language with language code '${targetLang}'.
Maintain the literary style, formatting, system tags (e.g., [SFX:...]), and keep paragraph breaks intact.

Text to translate:
${englishText}
`
  }
};
