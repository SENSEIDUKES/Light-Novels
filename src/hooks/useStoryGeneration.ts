import { generateId } from '../lib/id';
import { useAppStore } from '../store/useAppStore';
import { IntakeData, WorldBlueprint, Chapter, Story, Character, Faction } from '../types';
import { auth } from '../lib/firebase';
import { awardQi } from '../lib/qi';
import { storyApi } from '../services/api';
import {
  normalizeCodexAliases,
  normalizeCodexSurface,
  stripAuthorControlledCodexFields,
} from '../lib/codexContext';

const GENERATED_CHARACTER_STATUSES = new Set<Character['status']>([
  'alive',
  'deceased',
  'unknown',
  'ascended',
]);

const optionalGeneratedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const sanitizeGeneratedCharacter = (value: unknown): Character => {
  const candidate = value && typeof value === 'object'
    ? stripAuthorControlledCodexFields(value as Record<string, unknown>)
    : {};
  const requestedStatus = optionalGeneratedString(candidate.status)?.toLocaleLowerCase();
  const status = GENERATED_CHARACTER_STATUSES.has(requestedStatus as Character['status'])
    ? requestedStatus as Character['status']
    : 'alive';

  return {
    ...candidate,
    id: `char-${generateId(9)}`,
    name: optionalGeneratedString(candidate.name) || 'Unknown',
    role: optionalGeneratedString(candidate.role) || 'Neutral figure',
    description: optionalGeneratedString(candidate.description) || '',
    relationshipToMC: optionalGeneratedString(candidate.relationshipToMC) || 'Neutral',
    status,
  };
};

/**
 * Intake aliases are trusted user input, but a generated character can claim them
 * only when exactly one intake character has the same normalized canonical name.
 */
const buildTrustedIntakeAliasLookup = (intake: IntakeData): Map<string, string[]> => {
  const candidates = new Map<string, string[] | null>();

  for (const character of intake.customCharacters || []) {
    const canonicalKey = normalizeCodexSurface(character.name);
    if (!canonicalKey) continue;
    if (candidates.has(canonicalKey)) {
      candidates.set(canonicalKey, null);
      continue;
    }
    candidates.set(canonicalKey, normalizeCodexAliases(character.aliases, character.name));
  }

  return new Map(
    Array.from(candidates.entries())
      .filter((entry): entry is [string, string[]] => Array.isArray(entry[1])),
  );
};

const buildTrustedIntakeFactions = (intake: IntakeData): Faction[] =>
  (intake.customFactions || [])
    .filter(faction => normalizeCodexSurface(faction.name).length > 0)
    .map(faction => {
      const name = faction.name.normalize('NFKC').trim().replace(/\s+/g, ' ');
      const aliases = normalizeCodexAliases(faction.aliases, name);
      return {
        id: `fct-${generateId(9)}`,
        name,
        aliases: aliases.length > 0 ? aliases : undefined,
        description: faction.description?.trim() || '',
        alignment: faction.alignment?.trim() || 'Neutral',
        status: 'Active',
        currentRelevance: faction.connectionToMC?.trim() || undefined,
        provenance: { createdBy: 'user-intake' },
      };
    });

export const useStoryGeneration = () => {
  const store_stories = useAppStore(state => state.stories);
    const store_saveStories = useAppStore(state => state.saveStories);
    const store_setActiveStoryId = useAppStore(state => state.setActiveStoryId);
    const store_setSelectedChapterNum = useAppStore(state => state.setSelectedChapterNum);
    const store_setCurrentScreen = useAppStore(state => state.setCurrentScreen);
    const store_setAppError = useAppStore(state => state.setAppError);
    const store_setIsGenerating = useAppStore(state => state.setIsGenerating);
    const store_setGenerationPhase = useAppStore(state => state.setGenerationPhase);
    const store_setActiveAgentId = useAppStore(state => state.setActiveAgentId);

  const handleGenerateBlueprint = async (intake: IntakeData): Promise<WorldBlueprint> => {
    const currentStoreState = useAppStore.getState();
    if (currentStoreState.isGenerating) {
      console.warn("Generation already in progress. Ignoring duplicate click.");
      return {} as any;
    }
    currentStoreState.setIsGenerating(true);
    currentStoreState.setGenerationPhase('blueprint');
    currentStoreState.setActiveAgentId('versa');
    currentStoreState.setAppError(null);
    try {
      const blueprint = await storyApi.generateBlueprint(intake, currentStoreState.routingConfig.storyMaker);
      return blueprint;
    } catch (err: any) {
      console.error(err);
      currentStoreState.setAppError(err.message || "Failed to generate world blueprint.");
      throw err;
    } finally {
      currentStoreState.setIsGenerating(false);
      currentStoreState.setGenerationPhase(null);
      currentStoreState.setActiveAgentId(null);
    }
  };

  const handleStartStory = async (intake: IntakeData, blueprint: WorldBlueprint, chapterCount: number) => {
    const currentStoreState = useAppStore.getState();
    if (currentStoreState.isGenerating) {
      console.warn("Generation already in progress. Ignoring duplicate click.");
      return;
    }
    currentStoreState.setIsGenerating(true);
    currentStoreState.setGenerationPhase('initial-arc');
    currentStoreState.setActiveAgentId('versa');
    currentStoreState.setAppError(null);

    try {
      const responseData = await storyApi.generateInitialArc(
        intake,
        blueprint,
        chapterCount,
        currentStoreState.routingConfig.storyMaker
      );

      const formattedChapters: Chapter[] = responseData.chapters.map((ch: any) => ({
        number: ch.number,
        title: ch.title,
        premise: ch.premise,
        status: 'unread'
      }));
      const trustedAliasesByCanonicalName = buildTrustedIntakeAliasLookup(intake);
      const generatedCharacters = (Array.isArray(responseData.characters) ? responseData.characters : [])
        .map(sanitizeGeneratedCharacter);
      const generatedNameCounts = generatedCharacters.reduce((counts, character) => {
        const key = normalizeCodexSurface(character.name);
        counts.set(key, (counts.get(key) || 0) + 1);
        return counts;
      }, new Map<string, number>());
      const charactersWithTrustedAliases = generatedCharacters.map(character => {
        const canonicalKey = normalizeCodexSurface(character.name);
        const aliases = generatedNameCounts.get(canonicalKey) === 1
          ? trustedAliasesByCanonicalName.get(canonicalKey) || []
          : [];
        return aliases.length > 0 ? { ...character, aliases } : character;
      });

      const newStory: Story = {
        id: `story-${Date.now()}`,
        userId: auth.currentUser?.uid || undefined,
        title: responseData.title || blueprint.title || 'The Ascension Chronicles',
        genre: intake.genrePath || 'Xianxia',
        mcName: intake.mcName || 'Unknown',
        customPremise: intake.corePremise || blueprint.logline || '',
        intake: intake,
        blueprint: blueprint,
        hardcoreFateMode: !!intake.hardcoreFateMode,
        fatePressure: intake.fatePressure || 'Balanced',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentChapterNumber: 1,
        memory: {
          powerSystem: responseData.powerSystem || blueprint.powerSystemOutline,
          currentPowerStage: responseData.currentPowerStage || 'Novice stage',
          worldRules: responseData.worldRules || ['Survival of the fittest'],
          characters: charactersWithTrustedAliases,
          factions: buildTrustedIntakeFactions(intake),
          unresolvedPlotThreads: (responseData.unresolvedPlotThreads || []).map((t: any) => ({
            id: `thread-${generateId(9)}`,
            description: typeof t === 'string' ? t : t.description,
            status: 'active',
            originChapter: 1
          })),
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

      const updated = [newStory, ...store_stories];
      await store_saveStories(updated);
      store_setActiveStoryId(newStory.id);
      store_setSelectedChapterNum(1);
      store_setCurrentScreen('detail');
      awardQi('world_created');
    } catch (err: any) {
      console.error(err);
      store_setAppError(err.message || "Failed to align celestial gates.");
    } finally {
      store_setIsGenerating(false);
      store_setGenerationPhase(null);
      store_setActiveAgentId(null);
    }
  };

  return {
    handleGenerateBlueprint,
    handleStartStory
  };
};
