import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Wand2, Cloud, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IntakeData } from '../../../types';
import { FormSection, FormSectionId } from './FormSection';
import { GENRE_PRESETS, PREMISE_SUGGESTIONS, TAG_PRESETS, CATEGORIZED_TAGS } from '../constants';
import { getApiHeaders } from '../../../hooks/storyEngineHelpers';
import { useAppStore } from '../../../store/useAppStore';
import { FateSurvivalExplanation } from '../../../components/FateSurvivalExplanation';

interface CoreSeedFormProps {
  intake: IntakeData;
  updateIntake: (field: keyof IntakeData, value: any) => void;
  activeSection: FormSectionId;
  setActiveSection: (id: FormSectionId) => void;
}

export const CoreSeedForm = ({ intake, updateIntake, activeSection, setActiveSection }: CoreSeedFormProps) => {
  const routingConfig = useAppStore(state => state.routingConfig);
  const [customTagInput, setCustomTagInput] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [tagSearch, setTagSearch] = useState<string>('');
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<{ suggestedTags: string[]; reasoning: string } | null>(null);
  const [tagSuggestionError, setTagSuggestionError] = useState<string | null>(null);
  const [tagLimitError, setTagLimitError] = useState<string | null>(null);

  // Smart ghost-tag autocomplete suggestions
  const [ghostSuggestion, setGhostSuggestion] = useState<string | null>(null);

  useEffect(() => {
    const text = intake.corePremise || '';
    const activeTags = intake.storyTags || [];
    
    if (!text.trim() || activeTags.length >= 20) {
      setGhostSuggestion(null);
      return;
    }

    // 1. Try to find a tag being actively typed as a prefix at the end of the input
    const lastWordMatch = text.split(/[\s,.;!?]+/).filter(Boolean).pop();
    if (lastWordMatch && lastWordMatch.length >= 2) {
      const prefix = lastWordMatch.toLowerCase();
      const prefixMatch = TAG_PRESETS.find(tag => 
        tag.toLowerCase().startsWith(prefix) && 
        !activeTags.includes(tag)
      );
      if (prefixMatch) {
        setGhostSuggestion(prefixMatch);
        return;
      }
    }

    // 2. Try semantic mapping of keywords in the entire prompt text
    const lowerText = text.toLowerCase();
    const SEMANTIC_KEYWORD_MAP = [
      { keywords: ['system', 'cheat', 'status', 'panel', 'attribute', 'litrpg'], tag: 'game systems' },
      { keywords: ['level', 'progression', 'exp', 'grow', 'ladder', 'rank'], tag: 'level progression' },
      { keywords: ['cultivat', 'meridian', 'dantian', 'qi ', 'immortal', 'spirit root'], tag: 'cultivation realms' },
      { keywords: ['regress', 'return', 'back in time', 'years ago', 'loop', 'timeline'], tag: 'regression/reincarnation' },
      { keywords: ['reincarnat', 'reborn', 'transmigrat', 'isekai', 'another world'], tag: 'reincarnation rules' },
      { keywords: ['academy', 'school', 'sect school', 'dorm', 'class', 'rankings', 'exam'], tag: 'academy cultivation' },
      { keywords: ['sect', 'clan', 'faction', 'disciple', 'elder', 'patriarch'], tag: 'sect politics' },
      { keywords: ['kingdom', 'build', 'territory', 'village', 'town', 'lord', 'ruler'], tag: 'kingdom building' },
      { keywords: ['alchem', 'pill', 'cauldron', 'elixir', 'herb', 'refine'], tag: 'pill refinement' },
      { keywords: ['forge', 'weapon', 'sword', 'artifact', 'hammer', 'craft'], tag: 'weapon forging' },
      { keywords: ['tame', 'beast', 'monster', 'pet', 'animal', 'dragon', 'phoenix'], tag: 'bonded beasts' },
      { keywords: ['tower', 'dungeon', 'floor', 'boss', 'raid', 'climb'], tag: 'dungeon/tower climb' },
      { keywords: ['intrigue', 'noble', 'politics', 'court', 'emperor', 'prince', 'king'], tag: 'political intrigue' },
      { keywords: ['marry', 'marriage', 'romance', 'love', 'wife', 'husband', 'bride', 'groom'], tag: 'arranged marriage' },
      { keywords: ['enemies', 'lovers', 'hate', 'rivals to lovers'], tag: 'enemies to lovers' },
      { keywords: ['death', 'die', 'assassinate', 'doom', 'kill', 'murder'], tag: 'death flags' },
      { keywords: ['curse', 'cursed', 'blessing', 'hex'], tag: 'curse tracking' },
      { keywords: ['fate', 'destiny', 'karma', 'karmic', 'fated'], tag: 'fate bonds' },
      { keywords: ['apocalypse', 'zombie', 'collapse', 'ruin', 'camp', 'survival'], tag: 'apocalypse cultivation' },
      { keywords: ['space', 'star', 'galaxy', 'cosmic', 'void', 'moon', 'stellar'], tag: 'cosmic cultivation' },
      { keywords: ['cozy', 'slice of life', 'slice-of-life', 'slow life', 'peaceful', 'farm'], tag: 'cozy / slice-of-life cultivation' },
      { keywords: ['betray', 'backstab', 'trust', 'allies', 'alliance'], tag: 'betrayal fallout' },
      { keywords: ['rebellion', 'rebel', 'war', 'army', 'battle', 'soldier', 'siege'], tag: 'military strategy' },
      { keywords: ['slow burn', 'slow-burn'], tag: 'slow-burn romance' }
    ];

    for (const mapping of SEMANTIC_KEYWORD_MAP) {
      if (!activeTags.includes(mapping.tag)) {
        if (mapping.keywords.some(keyword => lowerText.includes(keyword))) {
          if (TAG_PRESETS.includes(mapping.tag)) {
            setGhostSuggestion(mapping.tag);
            return;
          }
        }
      }
    }

    // 3. Fallback: check if any tag from TAG_PRESETS is directly mentioned in the premise text
    const mentionedTag = TAG_PRESETS.find(tag => 
      lowerText.includes(tag.toLowerCase()) && 
      !activeTags.includes(tag)
    );
    if (mentionedTag) {
      setGhostSuggestion(mentionedTag);
      return;
    }

    setGhostSuggestion(null);
  }, [intake.corePremise, intake.storyTags]);

  const handleAddGhostTag = (tag: string) => {
    const activeTags = intake.storyTags || [];
    if (activeTags.length >= 20) {
      setTagLimitError("Fated limit reached. Only up to 20 celestial tags can be woven into the universe.");
      return;
    }
    if (!activeTags.includes(tag)) {
      setTagLimitError(null);
      updateIntake('storyTags', [...activeTags, tag]);
    }
    setGhostSuggestion(null);
  };

  const handleSuggestTags = async () => {
    if (!intake.corePremise?.trim()) {
      setTagSuggestionError("Please select or describe a Core Premise first to generate celestial tag recommendations.");
      return;
    }
    setIsSuggestingTags(true);
    setTagSuggestionError(null);
    try {
      const apiHeaders = await getApiHeaders();
      const response = await fetch('/api/suggest-tags', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          premise: intake.corePremise,
          genrePath: intake.genrePath,
          routingConfig: routingConfig?.storyMaker
        })
      });

      if (!response.ok) {
        throw new Error(`Sect channel unreachable. Code: ${response.status}`);
      }

      const resData = await response.json();
      setTagSuggestions(resData);
    } catch (err: any) {
      console.error("Error fetching recommended tags:", err);
      setTagSuggestionError(err.message || "Failed to contact the celestial scribe. Please try again.");
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const handleAddAllSuggestedTags = () => {
    if (!tagSuggestions || !tagSuggestions.suggestedTags) return;
    const activeTags = intake.storyTags || [];
    const newTags = [...activeTags];
    let reachedLimit = false;
    tagSuggestions.suggestedTags.forEach(tag => {
      if (!newTags.includes(tag)) {
        if (newTags.length >= 20) {
          reachedLimit = true;
          return;
        }
        newTags.push(tag);
      }
    });
    if (reachedLimit) {
      setTagLimitError("Fated limit reached. Only up to 20 celestial tags can be woven into the universe.");
    } else {
      setTagLimitError(null);
    }
    updateIntake('storyTags', newTags);
  };

  const handleTogglePresetTag = (tag: string) => {
    const activeTags = intake.storyTags || [];
    if (activeTags.includes(tag)) {
      setTagLimitError(null);
      updateIntake('storyTags', activeTags.filter(t => t !== tag));
    } else {
      if (activeTags.length >= 20) {
        setTagLimitError("Fated limit reached. Only up to 20 celestial tags can be woven into the universe.");
        return;
      }
      setTagLimitError(null);
      updateIntake('storyTags', [...activeTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim().replace(/^,|,$/g, '');
    if (!trimmed) return;
    const activeTags = intake.storyTags || [];
    if (activeTags.length >= 20) {
      setTagLimitError("Fated limit reached. Only up to 20 celestial tags can be woven into the universe.");
      return;
    }
    if (!activeTags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setTagLimitError(null);
      updateIntake('storyTags', [...activeTags, trimmed]);
    }
    setCustomTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    const nextTags = (intake.storyTags || []).filter(t => t !== tag);
    if (nextTags.length < 20) {
      setTagLimitError(null);
    }
    updateIntake('storyTags', nextTags);
  };

  const filteredPresets = Array.from(new Set(
    activeCategory === 'All'
      ? TAG_PRESETS
      : CATEGORIZED_TAGS[activeCategory] || []
  )).filter(tag => 
    tag.toLowerCase().includes(tagSearch.toLowerCase())
  );

  return (
    <FormSection id="core" title="1. Core Seed" icon={<BookOpen size={18} />} activeSection={activeSection} setActiveSection={setActiveSection}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-v2xlbs8">Optional Novel Title</label>
          <input type="text" value={intake.novelTitle || ''} onChange={(e) => updateIntake('novelTitle', e.target.value)} placeholder="Will be generated if empty" className="w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded px-4 py-2 text-sm" id="a11y-control-v2xlbs8" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-7b2mqtu">Main Character Name</label>
          <input type="text" value={intake.mcName || ''} onChange={(e) => updateIntake('mcName', e.target.value)} placeholder="e.g., Lin Fan" className="w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded px-4 py-2 text-sm" id="a11y-control-7b2mqtu" />
        </div>
      </div>
      
      <div>
        <span className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Genre Path</span>
        <div className="flex flex-wrap gap-2 mb-3">
          {GENRE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => updateIntake('genrePath', p.id)}
              className={`px-3 py-1.5 rounded border text-xs font-sans transition-colors flex items-center gap-1.5 ${intake.genrePath === p.id ? 'bg-neutral-900 border-portal text-signal shadow-[0_0_10px_rgba(4,172,255,0.1)]' : 'bg-transparent border-neutral-800 text-neutral-500 hover:text-neutral-300'}`}
            >
              {p.id === 'Fate Survival' ? (
                <div className="relative flex items-center justify-center">
                  <Cloud size={14} className={intake.genrePath === p.id ? "text-red-500" : "text-neutral-500"} />
                  <motion.div
                    className="absolute"
                    animate={{ opacity: [0, 0, 1, 0, 1, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, times: [0, 0.8, 0.85, 0.9, 0.95, 1], ease: "linear" }}
                  >
                    <Zap size={8} className="text-yellow-400 fill-yellow-400 mt-[2px]" />
                  </motion.div>
                </div>
              ) : (
                p.icon
              )} 
              {p.name}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {intake.genrePath === 'Fate Survival' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-3 mb-4 overflow-hidden"
            >
              <FateSurvivalExplanation />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pt-2 border-t border-neutral-900/60">
        <div className="flex justify-between items-end mb-2">
          <label htmlFor="core-premise-input" className="block font-sc text-xs text-neutral-400 uppercase tracking-widest">Core Premise / Secret Catalyst *</label>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-neutral-500">{(intake.corePremise || '').length} / 3000</span>
            <div className="flex gap-1">
              {PREMISE_SUGGESTIONS.map((_, idx) => (
                <button key={idx} type="button"  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => updateIntake('corePremise', PREMISE_SUGGESTIONS[idx])} className="bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-400 px-1.5 py-0.5 rounded font-mono">#{idx + 1}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="relative">
          <textarea 
            id="core-premise-input" 
            required 
            maxLength={3000}
            value={intake.corePremise || ''} 
            onChange={(e) => updateIntake('corePremise', e.target.value)} 
            onKeyDown={(e) => {
              if (e.key === 'Tab' && ghostSuggestion) {
                e.preventDefault();
                handleAddGhostTag(ghostSuggestion);
              }
            }}
            rows={3} 
            placeholder="The main hook or cheat..." 
            className="w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded p-3 text-sm resize-none pr-40" 
          />
          <AnimatePresence>
            {ghostSuggestion && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.95, y: 2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 2 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleAddGhostTag(ghostSuggestion)}
                className="absolute bottom-2.5 right-2.5 max-w-[80%] sm:max-w-full truncate px-2.5 py-1 rounded bg-black/90 border border-portal/40 text-portal hover:text-signal hover:border-portal transition-all flex items-center gap-1.5 text-[10px] font-mono tracking-wider shadow-[0_0_12px_rgba(4,172,255,0.15)] hover:shadow-[0_0_18px_rgba(4,172,255,0.3)] cursor-pointer"
                title="Click or press Tab to weave this tag into your destiny"
              >
                <Sparkles size={11} className="text-portal animate-pulse" />
                <span>Tab: {ghostSuggestion}</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="pt-2 border-t border-neutral-900/60 mt-4">
        <label htmlFor="custom-tag-input" className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Story Refinement Tags (Optional)</label>
        <p className="text-neutral-500 font-sans text-xs mb-3">Add tags to further personalize your story (e.g. Slice of Life, Romantic Comedy, Overpowered MC) to help the AI tailor the universe according to your interests.</p>
        
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 mb-4 max-w-xl w-full">
          <div className="flex items-center gap-2 w-full sm:flex-1 min-w-[200px]">
            <input 
              id="custom-tag-input"
              type="text" 
              value={customTagInput} 
              onChange={(e) => setCustomTagInput(e.target.value)} 
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomTag();
                }
              }}
              placeholder="Type and hit Enter or click Add (e.g. space cultivation)" 
              className="flex-1 bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded px-3 py-1.5 text-xs text-left" 
            />
            <button 
              type="button" 
              onClick={handleAddCustomTag}
              className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-signal hover:border-portal rounded text-xs font-sc uppercase tracking-widest transition-colors"
            >
              Add
            </button>
          </div>

          <button
            type="button"
            onClick={handleSuggestTags}
            disabled={isSuggestingTags}
            className="px-3 py-1.5 bg-neutral-950/60 border border-[#04ACFF]/50 hover:border-[#04ACFF] text-[#04ACFF] hover:bg-[#04ACFF]/10 disabled:opacity-50 disabled:pointer-events-none rounded text-xs font-sc uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 shadow-[0_0_12px_rgba(4,172,255,0.05)]"
          >
            <Wand2 size={13} className={isSuggestingTags ? "animate-spin" : "animate-pulse"} />
            {isSuggestingTags ? "Channeling..." : "Suggest Tags"}
          </button>
        </div>

        <AnimatePresence>
          {tagLimitError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mb-4 text-xs font-sans text-red-400 bg-[#8B0000]/10 border border-[#8B0000]/30 px-3 py-2 rounded flex items-center gap-1.5"
              id="tag-limit-error"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8B0000] animate-pulse" />
              {tagLimitError}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(tagSuggestions || tagSuggestionError) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 rounded-lg bg-neutral-950/80 border border-[#04ACFF]/20 space-y-3"
            >
              <div className="flex justify-between items-center pb-2 border-b border-neutral-900">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#04ACFF] animate-pulse" />
                  <span className="font-sc font-bold uppercase tracking-widest text-[11px] text-[#FAFAFA]">Celestial Recommendations</span>
                </div>
                {tagSuggestions && (
                  <button
                    type="button"
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleAddAllSuggestedTags}
                    className="text-[10px] font-sc uppercase tracking-widest text-[#04ACFF] hover:text-[#04ACFF]/80 transition-colors bg-neutral-900/50 border border-neutral-800/80 hover:border-[#04ACFF]/40 px-2 py-1 rounded"
                  >
                    + Add All Suggestions
                  </button>
                )}
              </div>

              {tagSuggestionError && (
                <p className="text-xs text-[#8B0000] font-sans">{tagSuggestionError}</p>
              )}

              {tagSuggestions && (
                <div className="space-y-2.5">
                  {tagSuggestions.reasoning && (
                    <p className="text-xs text-neutral-400 font-sans italic pl-2 border-l border-neutral-800">
                      &ldquo;{tagSuggestions.reasoning}&rdquo;
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tagSuggestions.suggestedTags && tagSuggestions.suggestedTags.length > 0 ? (
                      tagSuggestions.suggestedTags.map((tag) => {
                        const isSelected = intake.storyTags?.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleTogglePresetTag(tag)}
                            className={`px-2.5 py-1 rounded text-xs font-sans transition-all border duration-300 flex items-center gap-1 ${
                              isSelected 
                                ? 'bg-neutral-900 border-[#04ACFF] text-[#04ACFF] shadow-[0_0_8px_rgba(4,172,255,0.15)] font-semibold' 
                                : 'bg-void border-neutral-900 text-neutral-400 hover:text-[#FAFAFA] hover:border-neutral-800'
                            }`}
                          >
                            {isSelected ? '✓' : '+'} {tag}
                          </button>
                        );
                      })
                    ) : (
                      <span className="text-xs text-neutral-600 italic">Precept alignment could not extract custom matches automatically.</span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {intake.storyTags && intake.storyTags.length > 0 ? (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center">
              <span className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest">Active Celestial Tags ({intake.storyTags.length})</span>
              <button
                type="button"
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => updateIntake('storyTags', [])}
                className="text-[10px] font-sc uppercase tracking-widest text-human hover:text-red-400 transition-colors"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2 p-2 bg-neutral-950/40 rounded border border-neutral-900/50">
              {intake.storyTags.map((tag) => (
                <span key={tag} className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#04ACFF]/10 border border-[#04ACFF]/30 text-[#04ACFF] text-xs font-sans shadow-[0_0_8px_rgba(4,172,255,0.05)] animate-fadeIn">
                  <span className="font-semibold">{tag}</span>
                  <button
                    type="button"
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="text-neutral-500 hover:text-[#FAFAFA] focus:outline-none font-bold text-sm"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-neutral-600 text-xs font-sans italic mb-3">No custom tags added yet. Select presets or search using the grimoire below.</div>
        )}

        <div className="space-y-4 border border-neutral-900 bg-neutral-950/50 p-4 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-900">
            <div className="flex items-center space-x-2">
              <span className="block font-sc text-[11px] text-[#FAFAFA] uppercase tracking-widest font-bold">Celestial Grimoire</span>
              <span className="text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono">
                {filteredPresets.length} / {TAG_PRESETS.length}
              </span>
            </div>
            <input
              type="text"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Filter celestial tags..."
              className="bg-void border border-neutral-850 hover:border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded px-3 py-1.5 text-xs max-w-xs w-full transition-colors"
              id="celestial-tag-search-input"
            />
          </div>

          <div className="flex flex-wrap gap-1" id="tag-categories">
            {['All', ...Object.keys(CATEGORIZED_TAGS)].map((cat) => (
              <button
                key={cat}
                type="button"
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 text-[10px] font-sans font-medium uppercase tracking-wider rounded border transition-all ${
                  activeCategory === cat
                    ? 'border-[#04ACFF] bg-[#04ACFF]/10 text-[#04ACFF] font-bold shadow-[0_0_8px_rgba(4,172,255,0.15)]'
                    : 'border-neutral-900 bg-void text-neutral-500 hover:text-neutral-350 hover:border-neutral-850'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="max-h-56 overflow-y-auto pr-1 flex flex-wrap gap-1.5 scrollbar-thin" id="filtered-tags-list">
            {filteredPresets.length === 0 ? (
              <div className="text-neutral-600 text-xs font-sans italic py-4 w-full text-center">
                No celestial tag matches your search within this category.
              </div>
            ) : (
              filteredPresets.map((preset) => {
                const isSelected = intake.storyTags?.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleTogglePresetTag(preset)}
                    className={`px-2.5 py-1 rounded text-xs transition-all border duration-300 ${
                      isSelected 
                        ? 'bg-neutral-900 border-[#04ACFF] text-[#04ACFF] shadow-[0_0_8px_rgba(4,172,255,0.15)] font-semibold' 
                        : 'bg-void border-neutral-900 text-neutral-400 hover:text-[#FAFAFA] hover:border-neutral-800'
                    }`}
                  >
                    {isSelected ? '✓' : '+'} {preset}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-end mb-2">
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest" htmlFor="desired-plot-direction-input">Desired General Plot Direction (Optional)</label>
          <span className="text-[10px] font-mono text-neutral-500">{(intake.desiredPlotDirection || '').length} / 1500</span>
        </div>
        <textarea id="desired-plot-direction-input" maxLength={1500} value={intake.desiredPlotDirection || ''} onChange={(e) => updateIntake('desiredPlotDirection', e.target.value)} rows={2} placeholder="e.g. Revenge focused, slow sect building, kingdom conquering..." className="w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded p-3 text-sm resize-none" />
      </div>

      <div>
        <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="estimated-arcs-input">Estimated Arcs (Story Length)</label>
        <p className="text-neutral-500 font-sans text-xs mb-3 leading-relaxed">
          How long should this story run? (Highschool Drama ~3-4, Epic Fantasy ~10-20+). Leave blank for the system to guess based on premise.
        </p>
        <input 
          id="estimated-arcs-input"
          type="number" 
          value={intake.estimatedArcs || ''} 
          onChange={(e) => updateIntake('estimatedArcs', e.target.value ? parseInt(e.target.value) : undefined)} 
          placeholder="e.g. 5" 
          min="1"
          max="100"
          className="w-full sm:w-1/3 bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded p-3 text-sm" 
        />
      </div>

      <div>
        <div className="flex justify-between items-end mb-2">
          <label className="block flex gap-2 items-center font-sc text-xs text-neutral-400 uppercase tracking-widest" htmlFor="destined-ending-input">
            Destined Ending (Optional)
            <span className="text-[9px] font-mono lowercase bg-portal/10 text-portal px-1.5 py-0.5 rounded border border-portal/20">NEW</span>
          </label>
          <span className="text-[10px] font-mono text-neutral-500">{(intake.destinedEnding || '').length} / 1500</span>
        </div>
        <p className="text-neutral-500 font-sans text-xs mb-3 leading-relaxed">
          The intended final destination of this story or arc. If left blank, the system will recommend a fitting destined ending (e.g., Kingdom Collapse, Final Ascension, or Fated Separation) based on your genre and premise. You can alter this outcome later!
        </p>
        <textarea id="destined-ending-input" maxLength={1500} value={intake.destinedEnding || ''} onChange={(e) => updateIntake('destinedEnding', e.target.value)} rows={2} placeholder="e.g. The kingdom falls, the MC ascends to godhood, or the lovers are separated..." className="w-full bg-neutral-950/80 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded p-3 text-sm resize-none" />
      </div>
    </FormSection>
  );
};
