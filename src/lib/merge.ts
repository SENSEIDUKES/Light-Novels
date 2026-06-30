import { StoryWorld, StoryArc, Chapter, Bookmark, CharacterRelationship, KarmaFateNode } from '../types';

export function mergeStories(local: StoryWorld, cloud: StoryWorld): StoryWorld {
  // Determine which is newer
  const localTime = new Date(local.updatedAt || 0).getTime();
  const cloudTime = new Date(cloud.updatedAt || 0).getTime();
  const newer = localTime >= cloudTime ? local : cloud;
  const older = localTime < cloudTime ? local : cloud;

  // Clone newer story as base
  const merged: StoryWorld = JSON.parse(JSON.stringify(newer));

  // 1. Merge basic properties (keep newer as base, but ensure values are present)
  merged.title = newer.title || older.title;
  merged.mcName = newer.mcName || older.mcName;
  merged.customPremise = newer.customPremise || older.customPremise;
  merged.genre = newer.genre || older.genre;
  merged.imageUrl = newer.imageUrl || older.imageUrl;
  
  // 2. Merge Memory -> characters
  const charMap = new Map<string, any>();
  if (older.memory?.characters) {
    older.memory.characters.forEach(c => charMap.set(c.id || c.name, c));
  }
  if (newer.memory?.characters) {
    newer.memory.characters.forEach(c => charMap.set(c.id || c.name, c));
  }
  merged.memory.characters = Array.from(charMap.values());

  // 3. Merge Memory -> factions
  const factionMap = new Map<string, any>();
  if (older.memory?.factions) {
    older.memory.factions.forEach(f => factionMap.set(f.id || f.name, f));
  }
  if (newer.memory?.factions) {
    newer.memory.factions.forEach(f => factionMap.set(f.id || f.name, f));
  }
  merged.memory.factions = Array.from(factionMap.values());

  // 4. Merge Memory -> locations
  const locMap = new Map<string, any>();
  if (older.memory?.locations) {
    older.memory.locations.forEach(l => locMap.set(l.id || l.name, l));
  }
  if (newer.memory?.locations) {
    newer.memory.locations.forEach(l => locMap.set(l.id || l.name, l));
  }
  merged.memory.locations = Array.from(locMap.values());

  // 5. Merge Memory -> artifacts
  const artMap = new Map<string, any>();
  if (older.memory?.artifacts) {
    older.memory.artifacts.forEach(a => artMap.set(a.id || a.name, a));
  }
  if (newer.memory?.artifacts) {
    newer.memory.artifacts.forEach(a => artMap.set(a.id || a.name, a));
  }
  merged.memory.artifacts = Array.from(artMap.values());

  // 6. Merge worldRules
  const rulesSet = new Set<string>([
    ...(newer.memory?.worldRules || []),
    ...(older.memory?.worldRules || [])
  ]);
  merged.memory.worldRules = Array.from(rulesSet);

  // 7. Merge plot threads
  const unresolvedThreadsMap = new Map<string, any>();
  const resolveThreadId = (t: any) => typeof t === 'string' ? t : (t.id || t.description);
  
  if (older.memory?.unresolvedPlotThreads) {
    older.memory.unresolvedPlotThreads.forEach(t => unresolvedThreadsMap.set(resolveThreadId(t), t));
  }
  if (newer.memory?.unresolvedPlotThreads) {
    newer.memory.unresolvedPlotThreads.forEach(t => unresolvedThreadsMap.set(resolveThreadId(t), t));
  }
  merged.memory.unresolvedPlotThreads = Array.from(unresolvedThreadsMap.values());

  const resolvedThreadsMap = new Map<string, any>();
  if (older.memory?.resolvedPlotThreads) {
    older.memory.resolvedPlotThreads.forEach(t => resolvedThreadsMap.set(resolveThreadId(t), t));
  }
  if (newer.memory?.resolvedPlotThreads) {
    newer.memory.resolvedPlotThreads.forEach(t => resolvedThreadsMap.set(resolveThreadId(t), t));
  }
  merged.memory.resolvedPlotThreads = Array.from(resolvedThreadsMap.values());

  // 8. Merge Arcs & Chapters
  const mergedArcs: StoryArc[] = [];
  const localArcs = local.arcs || [];
  const cloudArcs = cloud.arcs || [];
  const maxArcs = Math.max(localArcs.length, cloudArcs.length);

  for (let i = 0; i < maxArcs; i++) {
    const localArc = localArcs[i];
    const cloudArc = cloudArcs[i];
    
    if (localArc && cloudArc) {
      const mergedChapters: Chapter[] = [];
      const chMap = new Map<number, Chapter>();
      
      localArc.chapters.forEach(ch => chMap.set(ch.number, ch));
      cloudArc.chapters.forEach(ch => {
        const existingCh = chMap.get(ch.number);
        if (existingCh) {
          const localHas = existingCh.hasContent || existingCh.generatedContent;
          const cloudHas = ch.hasContent || ch.generatedContent;
          
          if (localHas && !cloudHas) {
            chMap.set(ch.number, existingCh);
          } else if (!localHas && cloudHas) {
            chMap.set(ch.number, ch);
          } else {
            const localSec = existingCh.sealedAt || 0;
            const cloudSec = ch.sealedAt || 0;
            if (localSec !== cloudSec) {
              chMap.set(ch.number, localSec > cloudSec ? existingCh : ch);
            } else {
              const localLen = (existingCh.generatedContent || '').length;
              const cloudLen = (ch.generatedContent || '').length;
              chMap.set(ch.number, localLen >= cloudLen ? existingCh : ch);
            }
          }
        } else {
          chMap.set(ch.number, ch);
        }
      });
      
      const chapters = Array.from(chMap.values()).sort((a, b) => a.number - b.number);
      mergedArcs.push({
        title: localArc.title || cloudArc.title,
        isCompleted: localArc.isCompleted || cloudArc.isCompleted,
        summary: localArc.summary || cloudArc.summary,
        chapters
      });
    } else {
      mergedArcs.push(localArc || cloudArc);
    }
  }
  merged.arcs = mergedArcs;

  // 9. Update progress indicators
  merged.currentChapterNumber = Math.max(local.currentChapterNumber || 1, cloud.currentChapterNumber || 1);
  merged.lastReadChapter = Math.max(local.lastReadChapter || 1, cloud.lastReadChapter || 1);

  // 10. Merge bookmarks, relationships, karmaNodes
  const bookmarkMap = new Map<string, Bookmark>();
  if (older.bookmarks) older.bookmarks.forEach(b => bookmarkMap.set(b.id, b));
  if (newer.bookmarks) newer.bookmarks.forEach(b => bookmarkMap.set(b.id, b));
  merged.bookmarks = Array.from(bookmarkMap.values());

  const relationMap = new Map<string, CharacterRelationship>();
  if (older.relationships) older.relationships.forEach(r => relationMap.set(r.id, r));
  if (newer.relationships) newer.relationships.forEach(r => relationMap.set(r.id, r));
  merged.relationships = Array.from(relationMap.values());

  const karmaMap = new Map<string, KarmaFateNode>();
  if (older.karmaNodes) older.karmaNodes.forEach(k => karmaMap.set(k.id, k));
  if (newer.karmaNodes) newer.karmaNodes.forEach(k => karmaMap.set(k.id, k));
  merged.karmaNodes = Array.from(karmaMap.values());

  merged.updatedAt = new Date().toISOString();
  return merged;
}
