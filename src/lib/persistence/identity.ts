import type { Ability, BaseCodexEntry, Story, StoryArc } from '../../types';
import { generateUUID } from '../id';

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

function existingUuid(value?: string): string | undefined {
  return value?.match(UUID_PATTERN)?.[0];
}

function withEntityIdentity<T extends BaseCodexEntry>(entity: T): T {
  if (entity.persistenceId) return entity;
  return { ...entity, persistenceId: existingUuid((entity as T & { id?: string }).id) ?? generateUUID() };
}

function withArcIdentity(arc: StoryArc): StoryArc {
  const persistenceId = arc.persistenceId ?? generateUUID();
  return {
    ...arc,
    persistenceId,
    chapters: (arc.chapters ?? []).map(chapter => ({
      ...chapter,
      persistenceId: chapter.persistenceId ?? generateUUID(),
    })),
  };
}

/**
 * Assign canonical relational IDs before the first local commit. IDs then ride
 * inside the owner-scoped IndexedDB replica and remain stable across retries,
 * offline work, and media attachment calls.
 */
export function ensureStoryPersistenceIdentities(story: Story): Story {
  const persistenceId = story.persistenceId ?? existingUuid(story.id) ?? generateUUID();
  const memory = (story.memory ?? {}) as NonNullable<Story['memory']>;
  const abilities = memory.abilities?.map(ability =>
    typeof ability === 'string' ? ability : withEntityIdentity(ability as Ability),
  );
  return {
    ...story,
    persistenceId,
    memory: {
      ...memory,
      characters: (memory.characters ?? []).map(withEntityIdentity),
      factions: memory.factions?.map(withEntityIdentity),
      locations: memory.locations?.map(withEntityIdentity),
      artifacts: memory.artifacts?.map(withEntityIdentity),
      abilities,
    },
    arcs: (story.arcs ?? []).map(withArcIdentity),
  };
}
