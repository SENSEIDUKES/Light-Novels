import { estimateTokens } from './helpers';

export type EntityKind = 'character' | 'faction' | 'location' | 'artifact';
export type CardTier = 'full' | 'brief';

export interface RenderedEntityCard {
  name: string;
  kind: EntityKind;
  tier: CardTier;
  text: string;
  estimatedTokens: number;
  pinned: boolean;
}

const FULL_CARD_CHAR_CAP = 1200;
const BRIEF_CARD_CHAR_CAP = 160;
const DESCRIPTION_CHAR_CAP = 400;
const AUTHOR_NOTE_CHAR_CAP = 300;

// Entity cards are rendered from an explicit narrative-field allowlist. Keep this
// exclusion set aligned with slimMemoryForRequest for defense in depth.
const HEAVY_KEYS = new Set([
  'imageUrl',
  'imageHistory',
  'imageData',
  'voiceClipUrl',
  'voiceClip',
  'avatarUrl',
  'avatar',
  'audioUrl',
  'embedding',
  'thumbnail',
]);

const DATA_URI = /data:[\w+.-]+\/[\w+.-]+(?:;[^,\s]*)?,[^\s]*/gi;

const KIND_LABELS: Record<EntityKind, string> = {
  character: 'Character',
  faction: 'Faction',
  location: 'Location',
  artifact: 'Artifact',
};

const truncateText = (text: string, maxLength: number): string => {
  if (maxLength <= 0) return '';
  if (text.length <= maxLength) return text;
  if (maxLength === 1) return '…';
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
};

const cleanText = (value: unknown): string | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  if (typeof value === 'number' && !Number.isFinite(value)) return undefined;
  const text = String(value)
    .replace(DATA_URI, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return undefined;
  return text;
};

const readText = (entity: Record<string, any>, key: string): string | undefined =>
  HEAVY_KEYS.has(key) ? undefined : cleanText(entity[key]);

const firstText = (
  entity: Record<string, any>,
  keys: string[],
): string | undefined => {
  for (const key of keys) {
    const value = readText(entity, key);
    if (value) return value;
  }
  return undefined;
};

const joinDistinct = (values: Array<string | undefined>): string | undefined => {
  const distinct = values.filter((value, index): value is string =>
    Boolean(value) && values.indexOf(value) === index
  );
  return distinct.length > 0 ? distinct.join(' / ') : undefined;
};

const roleOrTypeFor = (
  entity: Record<string, any>,
  kind: EntityKind,
): string | undefined => {
  switch (kind) {
    case 'character':
      return firstText(entity, ['role', 'type']);
    case 'faction':
      return firstText(entity, ['role', 'type']);
    case 'location':
      return firstText(entity, ['type', 'realm']);
    case 'artifact':
      return firstText(entity, ['type', 'tier']);
  }
};

const statusFor = (
  entity: Record<string, any>,
  kind: EntityKind,
): string | undefined => {
  switch (kind) {
    case 'character':
      return readText(entity, 'status');
    case 'faction':
      return joinDistinct([
        readText(entity, 'alignment'),
        readText(entity, 'status'),
      ]);
    case 'location':
      return joinDistinct([
        readText(entity, 'safetyLevel'),
        readText(entity, 'status'),
      ]);
    case 'artifact': {
      const status = readText(entity, 'status');
      const currentOwner = readText(entity, 'currentOwner');
      return status || (currentOwner ? `held by ${currentOwner}` : undefined);
    }
  }
};

const relationshipFor = (entity: Record<string, any>): string | undefined =>
  firstText(entity, ['relationshipToMC', 'connectionToMC', 'currentRelevance']);

const aliasesFor = (
  entity: Record<string, any>,
  name: string,
): string | undefined => {
  if (!Array.isArray(entity.aliases)) return undefined;

  const seen = new Set<string>();
  const aliases: string[] = [];
  for (const candidate of entity.aliases) {
    const alias = cleanText(candidate);
    if (!alias || alias === name || seen.has(alias)) continue;
    seen.add(alias);
    aliases.push(alias);
  }

  return aliases.length > 0 ? aliases.join(', ') : undefined;
};

const lastInvolvedFor = (entity: Record<string, any>): string | undefined => {
  const provenance = entity.provenance && typeof entity.provenance === 'object'
    ? entity.provenance as Record<string, any>
    : {};
  return cleanText(
    provenance.lastMentionedChapter ?? entity.lastMajorInvolvement,
  );
};

interface FullCardFields {
  name: string;
  aliases?: string;
  roleOrType?: string;
  status?: string;
  relationship?: string;
  description?: string;
  authorNote?: string;
  lastInvolved?: string;
}

const composeFullText = (
  fields: FullCardFields,
  kind: EntityKind,
): string => {
  const lines = [
    fields.aliases
      ? `${fields.name} (aliases: ${fields.aliases})`
      : fields.name,
    fields.roleOrType
      ? `${KIND_LABELS[kind]} — ${fields.roleOrType}`
      : KIND_LABELS[kind],
    fields.status ? `Status: ${fields.status}` : undefined,
    fields.relationship
      ? `Relationship to MC: ${fields.relationship}`
      : undefined,
    fields.description ? `Description: ${fields.description}` : undefined,
    fields.authorNote ? `Author note: ${fields.authorNote}` : undefined,
    fields.lastInvolved
      ? `Last involved: chapter ${fields.lastInvolved}`
      : undefined,
  ];

  return lines.filter((line): line is string => Boolean(line)).join('\n');
};

const fitFullText = (
  initialFields: FullCardFields,
  kind: EntityKind,
): string => {
  const fields = { ...initialFields };
  let text = composeFullText(fields, kind);
  if (text.length <= FULL_CARD_CHAR_CAP) return text;

  const shrink = (
    key: keyof FullCardFields,
    minimumLength: number,
  ): void => {
    const current = fields[key];
    if (!current || text.length <= FULL_CARD_CHAR_CAP) return;

    const overflow = text.length - FULL_CARD_CHAR_CAP;
    const targetLength = Math.max(minimumLength, current.length - overflow);
    fields[key] = targetLength > 0
      ? truncateText(current, targetLength)
      : undefined;
    text = composeFullText(fields, kind);
  };

  // Preserve the author-authored note preferentially. Less authoritative prose
  // yields first if unusually long metadata pushes the card over its hard cap.
  shrink('description', initialFields.description ? 1 : 0);
  shrink('aliases', initialFields.aliases ? 1 : 0);
  shrink('relationship', initialFields.relationship ? 1 : 0);
  shrink('roleOrType', initialFields.roleOrType ? 1 : 0);
  shrink('status', initialFields.status ? 1 : 0);
  shrink('name', 1);
  shrink('lastInvolved', initialFields.lastInvolved ? 1 : 0);
  shrink('authorNote', initialFields.authorNote ? 1 : 0);

  return text.length <= FULL_CARD_CHAR_CAP
    ? text
    : truncateText(text, FULL_CARD_CHAR_CAP);
};

const ensureTerminalPunctuation = (text: string): string =>
  /[.!?]$/.test(text) ? text : `${text}.`;

const renderBriefText = (
  fields: FullCardFields,
  kind: EntityKind,
): string => {
  const name = truncateText(fields.name, 60);
  const prefix = `${name} — `;
  const roleAndRelationship = joinDistinct([
    fields.roleOrType,
    fields.relationship,
  ]);
  const bodyParts = fields.authorNote
    ? [kind, fields.authorNote]
    : [kind, roleAndRelationship, fields.status];
  const body = bodyParts.filter((part): part is string => Boolean(part)).join(', ');
  const availableBodyLength = Math.max(
    1,
    BRIEF_CARD_CHAR_CAP - prefix.length - 1,
  );
  const fittedBody = truncateText(body, availableBodyLength);
  return ensureTerminalPunctuation(`${prefix}${fittedBody}`).slice(
    0,
    BRIEF_CARD_CHAR_CAP,
  );
};

export function renderEntityCard(
  entity: any,
  kind: EntityKind,
  tier: CardTier,
): RenderedEntityCard {
  const record = entity && typeof entity === 'object'
    ? entity as Record<string, any>
    : {};
  const name = readText(record, 'name') || 'Unnamed entity';
  const fields: FullCardFields = {
    name,
    aliases: aliasesFor(record, name),
    roleOrType: roleOrTypeFor(record, kind),
    status: statusFor(record, kind),
    relationship: relationshipFor(record),
    description: readText(record, 'description')
      ? truncateText(readText(record, 'description')!, DESCRIPTION_CHAR_CAP)
      : undefined,
    authorNote: readText(record, 'authorContextNote')
      ? truncateText(readText(record, 'authorContextNote')!, AUTHOR_NOTE_CHAR_CAP)
      : undefined,
    lastInvolved: lastInvolvedFor(record),
  };
  const text = tier === 'full'
    ? fitFullText(fields, kind)
    : renderBriefText(fields, kind);

  return {
    name,
    kind,
    tier,
    text,
    estimatedTokens: estimateTokens(text),
    pinned: record.provenance?.isUserPinned === true,
  };
}
