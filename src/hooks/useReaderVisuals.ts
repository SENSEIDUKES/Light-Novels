import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useImageManifest } from './useImageManifest';
import { Chapter, StoryWorld } from '../types';
import { dispatchNarrativeCue, NarrativeCueEventType } from '../lib/narrativeCues';

export function useReaderVisuals({
  selectedChapter,
  activeStory,
  readerMode,
}: {
  selectedChapter: Chapter;
  activeStory: StoryWorld;
  readerMode: string;
}) {
  const [generatingRevealId, setGeneratingRevealId] = useState<string | null>(null);
  const immersion = useAppStore((state) => state.immersion);
  const { manifestImage, manifestChapterHero, generatingIds } = useImageManifest();

  const isMomentousChapter = useMemo(() => {
    if (!activeStory || !selectedChapter) return false;
    
    const currentArc = activeStory.arcs.find(a => a.chapters.some(c => c.number === selectedChapter.number));
    if (!currentArc) return false;

    const momentousEvents = [
      'breakthrough', 'turning-point', 'evolution', 'betrayal', 'ascension', 
      'conquest', 'destruction', 'calamity', 'rival_battle', 'romance', 'first_kiss'
    ];

    // Calculate scores for all chapters in the arc
    const chapterScores = currentArc.chapters.map(c => {
      let score = 0;
      
      // Prioritize the arc's structural climax (the final chapter of the arc)
      const isArcFinal = c.number === currentArc.chapters[currentArc.chapters.length - 1].number;
      if (isArcFinal && currentArc.chapters.length >= 4) {
        score += 15; // strong prior for structural climax
      }

      const chapterCue = c.cuePayload;
      if (chapterCue?.powerShift) score += chapterCue.powerShift * 2;
      if (chapterCue?.danger) score += chapterCue.danger * 1.5;
      if (chapterCue?.mysticism) score += chapterCue.mysticism * 1;
      
      if (chapterCue?.beastEvent?.type && momentousEvents.includes(chapterCue.beastEvent.type)) {
        score += 10;
      }

      if (c.blocks) {
        c.blocks.forEach((b: any) => {
          if (b.system?.promptType && momentousEvents.includes(b.system.promptType)) {
            score += 8;
          }
          if (b.metadata?.danger) score += b.metadata.danger;
          if (b.metadata?.intensity) score += b.metadata.intensity;
          if (b.metadata?.tension) score += b.metadata.tension;
        });
      }
      
      return { number: c.number, score };
    });
    
    // Minimum score threshold to be considered a significant memory spike
    const MIN_SCORE_THRESHOLD = 15;
    
    const eligibleChapters = chapterScores.filter(x => x.score >= MIN_SCORE_THRESHOLD);
    eligibleChapters.sort((a, b) => b.score - a.score);
    
    // Peak chapters: the single highest-scoring climax plus at most 1-2 secondary spikes
    const peakChapters = eligibleChapters.slice(0, 3);
    
    return peakChapters.some(x => x.number === selectedChapter.number);
  }, [activeStory, selectedChapter]);

  const triggerHeroGeneration = () => {
    if (!isMomentousChapter || !activeStory || !selectedChapter) return;
    if (selectedChapter.assetManifest?.heroImage || generatingIds.has(`chapter-hero-${selectedChapter.number}`)) return;
    
    const currentArc = activeStory.arcs.find(a => a.chapters.some(c => c.number === selectedChapter.number));
    if (!currentArc) return;
    
    const existingHeroImagesCount = currentArc.chapters.filter(c => c.assetManifest && c.assetManifest.heroImage).length;
    if (existingHeroImagesCount >= 3) return;
    
    const promptText = `A cinematic visual memory of the defining moment that just happened: ${selectedChapter.summary || 'A critical climactic climax in the story.'} Render as a vivid frozen memory capturing the emotional core and exact action of the moment.`;
    manifestChapterHero(selectedChapter.number, promptText).catch(e => console.error("Hero generation failed:", e));
  };

  const handleManifestReveal = async (entry: any, type: string) => {
    if (generatingRevealId) return;
    setGeneratingRevealId(entry.id);
    try {
      await manifestImage(entry, type);
    } catch (err: any) {
      console.error("Failed to manifest reveal card auras:", err);
      useAppStore.getState().setAppError(err.message || "Celestial alignment gate failed to synchronize imagery.");
    } finally {
      setGeneratingRevealId(null);
    }
  };

  // IntersectionObserver for narrative cues
  useEffect(() => {
    if (readerMode === "sen") return;
    const targets = document.querySelectorAll(".narrative-trigger");
    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const type = entry.target.getAttribute("data-cue-type") as NarrativeCueEventType;
            const cueId = entry.target.getAttribute("data-cue-id");
            if (type && cueId) {
              let parsedValue: unknown = entry.target.getAttribute("data-cue-value") || undefined;
              let parsedMeta: unknown = undefined;

              const metaRaw = entry.target.getAttribute("data-cue-metadata");
              if (metaRaw) {
                try {
                  parsedMeta = JSON.parse(metaRaw);
                  parsedValue = parsedValue || parsedMeta;
                } catch {}
              }

              if (typeof parsedValue === "string") {
                try {
                  parsedValue = JSON.parse(parsedValue);
                } catch {}
              }

              // Metadata cues feed both the visual popups AND the scene
              // music engine, so they must flow if either feature is on;
              // each consumer applies its own toggle.
              const metadataConsumersOff = !immersion.imagePopups && !immersion.sceneMusic;
              if (readerMode === "teleprompter") {
                if (type.startsWith("narrative.fx")) return;
                if (type.startsWith("narrative.metadata") && metadataConsumersOff) return;
              } else {
                if (type.startsWith("narrative.fx") && !immersion.audioCues) return;
                if (type.startsWith("narrative.metadata") && metadataConsumersOff) return;
              }

              dispatchNarrativeCue({
                id: cueId,
                type,
                once: !!entry.target.getAttribute("data-cue-once"),
                value: parsedValue,
                metadata: parsedMeta,
              });
            }
          }
        });
      },
      { threshold: 0.5 },
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [
    selectedChapter?.number,
    activeStory?.currentChapterNumber,
    selectedChapter?.generatedContent,
    selectedChapter?.blocks,
    readerMode,
    immersion.imagePopups,
    immersion.audioCues,
    immersion.sceneMusic,
  ]);

  // Codex terms memo for semantic highlighting
  const codexTerms = useMemo(() => {
    const terms: Array<{ term: string; type: 'character'|'faction'|'artifact'|'location'; entry: any }> = [];
    if (!activeStory?.memory) return terms;
    activeStory.memory.characters?.forEach(c => {
      if (c.name && c.name.length > 2) terms.push({ term: c.name, type: 'character', entry: c });
    });
    activeStory.memory.factions?.forEach(f => {
      if (f.name && f.name.length > 2) terms.push({ term: f.name, type: 'faction', entry: f });
    });
    activeStory.memory.artifacts?.forEach(a => {
      if (a.name && a.name.length > 2) terms.push({ term: a.name, type: 'artifact', entry: a });
    });
    activeStory.memory.locations?.forEach(l => {
      if (l.name && l.name.length > 2) terms.push({ term: l.name, type: 'location', entry: l });
    });
    return terms.sort((a, b) => b.term.length - a.term.length);
  }, [activeStory.memory]);

  return {
    handleManifestReveal,
    generatingRevealId,
    codexTerms,
    manifestChapterHero,
    generatingIds,
    isMomentousChapter,
    triggerHeroGeneration
  };
}
