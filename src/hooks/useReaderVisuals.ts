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

  // Hero Image Generation Logic
  useEffect(() => {
    if ((selectedChapter?.generatedContent || selectedChapter?.blocks) && 
        !selectedChapter?.assetManifest?.heroImage && 
        !generatingIds.has(`chapter-hero-${selectedChapter?.number}`)) {
      if (!activeStory) return;
      
      const currentArc = activeStory.arcs.find(a => a.chapters.some(c => c.number === selectedChapter.number));
      if (!currentArc) return;

      const existingHeroImagesCount = currentArc.chapters.filter(c => c.assetManifest && c.assetManifest.heroImage).length;
      
      if (existingHeroImagesCount >= 2) return;

      const cue = selectedChapter.cuePayload;
      
      const momentousEvents = [
        'breakthrough', 'turning-point', 'evolution', 'betrayal', 'ascension', 
        'conquest', 'destruction', 'calamity', 'rival_battle', 'romance', 'first_kiss'
      ];

      let isMomentous = 
          (cue?.beastEvent?.type && momentousEvents.includes(cue.beastEvent.type)) ||
          selectedChapter.blocks?.some((b: any) => 
               b.system?.promptType && momentousEvents.includes(b.system.promptType)
          ) ||
          (cue?.danger && cue.danger > 8) || 
          (cue?.powerShift && cue.powerShift > 8);

      const isLongArc = currentArc.chapters.length >= 7;
      const arcChapterIndex = currentArc.chapters.findIndex(c => c.number === selectedChapter.number);
      
      if (isLongArc && arcChapterIndex <= 2 && existingHeroImagesCount === 0) {
        if (arcChapterIndex === 2 || (cue?.danger && cue.danger > 5) || (cue?.powerShift && cue.powerShift > 5)) {
          isMomentous = true;
        }
      }
      
      if (isMomentous) {
        const promptText = `A cinematic visual memory of the defining moment that just happened: ${selectedChapter.summary || 'A critical climactic climax in the story.'} Render as a vivid frozen memory capturing the emotional core and exact action of the moment.`;
        manifestChapterHero(selectedChapter.number, promptText).catch(e => console.error("Hero generation failed:", e));
      }
    }
  }, [
    selectedChapter?.number, 
    selectedChapter?.generatedContent, 
    selectedChapter?.blocks, 
    selectedChapter?.assetManifest?.heroImage, 
    selectedChapter?.cuePayload, 
    selectedChapter?.summary, 
    manifestChapterHero, 
    generatingIds, 
    activeStory
  ]);

  const handleManifestReveal = async (entry: any, type: string) => {
    if (generatingRevealId) return;
    setGeneratingRevealId(entry.id);
    try {
      await manifestImage(entry, type);
    } catch (err) {
      console.error("Failed to manifest reveal card auras:", err);
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
                } catch (e) {}
              }

              if (typeof parsedValue === "string") {
                try {
                  parsedValue = JSON.parse(parsedValue);
                } catch (e) {}
              }

              if (readerMode === "teleprompter") {
                if (type.startsWith("narrative.fx")) return;
                if (type.startsWith("narrative.metadata") && !immersion.imagePopups) return;
              } else {
                if (type.startsWith("narrative.fx") && !immersion.audioCues) return;
                if (type.startsWith("narrative.metadata") && !immersion.imagePopups) return;
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
    codexTerms
  };
}
