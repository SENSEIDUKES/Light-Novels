import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Layers, Zap, Users, Target, Wand2, FileText, HelpCircle, GitBranch, ArrowRight, Check, Copy } from 'lucide-react';
import { WorldBlueprint } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { AGENTS } from '../../../lib/agents';

interface BlueprintReviewProps {
  blueprint: WorldBlueprint;
  setBlueprint: (blueprint: WorldBlueprint) => void;
  onBack: () => void;
  onStartStory: () => void;
  isGenerating: boolean;
}

export const BlueprintReview = ({ blueprint, setBlueprint, onBack, onStartStory, isGenerating }: BlueprintReviewProps) => {
  const { activeAgentId } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const handleCopyBlueprint = () => {
    const textToCopy = `
# ${blueprint.title || 'Untitled World'}

**Logline**: ${blueprint.logline || ''}

## World Overview
${blueprint.worldOverview || ''}

## Society & Factions
${blueprint.societyStructure || ''}
${blueprint.majorFactions && blueprint.majorFactions.length > 0 ? `\n### Major Factions:\n${blueprint.majorFactions.map(f => `- ${f}`).join('\n')}` : ''}

## Power System
${blueprint.powerSystemOutline || ''}

## Main Character Profile
${blueprint.mcProfile || ''}

## First Arc Promise
${blueprint.firstArcPromise || ''}
`.trim();

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyBlueprintJson = () => {
    const textToCopy = JSON.stringify(blueprint, null, 2);
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    });
  };

  return (
    <div className="max-w-4xl mx-auto pb-20" id="creation-portal-root">
      <div className="text-center mb-10 space-y-4">
        <span className="font-sc text-portal tracking-[0.2em] text-xs uppercase block">World Blueprint Generated</span>

        <div className="max-w-xl mx-auto space-y-3">
          <div>
            <label className="block text-[10px] font-sc text-portal tracking-widest uppercase mb-1" htmlFor="a11y-control-${labelCounter}">World Seed Title</label>
            <input
              type="text"
              value={blueprint.title}
              onChange={(e) => setBlueprint({ ...blueprint, title: e.target.value })}
              className="w-full text-center bg-void border border-neutral-900 focus:border-portal text-signal font-display font-bold text-2xl sm:text-3xl rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
              placeholder="Give your world a name" id="a11y-control-${labelCounter}"
            />
          </div>
          <div>
            <label className="block text-[10px] font-sc text-portal tracking-widest uppercase mb-1" htmlFor="a11y-control-${labelCounter}">Cosmic Logline</label>
            <textarea
              value={blueprint.logline}
              onChange={(e) => setBlueprint({ ...blueprint, logline: e.target.value })}
              rows={2}
              className="w-full text-center bg-void border border-neutral-900 focus:border-portal text-neutral-400 font-sans font-light text-xs sm:text-sm rounded-md px-4 py-1.5 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all resize-none"
              placeholder="Describe the high-concept premise" id="a11y-control-${labelCounter}"
            />
          </div>
        </div>
      </div>

      <div className="bg-neutral-950/80 border border-portal/30 p-6 sm:p-10 rounded-lg shadow-[0_0_30px_rgba(4,172,255,0.05)] relative space-y-8">
        
        {/* Section 1: Overview & Starting Location */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm">World Overview</h3>
              <span className="text-[10px] text-portal font-mono">Editable</span>
            </div>
            <textarea
              value={blueprint.worldOverview}
              onChange={(e) => setBlueprint({ ...blueprint, worldOverview: e.target.value })}
              rows={6}
              className="w-full bg-void border border-neutral-900 focus:border-portal text-[#dfd8cf] font-serif text-sm leading-relaxed rounded-md p-4 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all resize-none"
              placeholder="The settings, lore, and physical characteristics of this universe..."
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm flex items-center space-x-1.5">
                <MapPin size={14} className="text-portal"/>
                <span>Starting Location</span>
              </h3>
              <span className="text-[10px] text-portal font-mono">Editable</span>
            </div>
            <textarea
              value={blueprint.startingLocation || ''}
              onChange={(e) => setBlueprint({ ...blueprint, startingLocation: e.target.value })}
              rows={6}
              className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-sans text-xs leading-relaxed rounded-md p-4 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all resize-none"
              placeholder="The initial city, sect outpost, forest, or plane of existence where story begins..."
            />
          </div>
        </div>

        {/* Section 2: Society Structure & Major Factions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm flex items-center space-x-2">
                  <Layers size={14} className="text-portal"/>
                  <span>Society Structure</span>
                </h3>
                <span className="text-[9px] text-portal font-mono">Editable</span>
              </div>
              <textarea
                value={blueprint.societyStructure}
                onChange={(e) => setBlueprint({ ...blueprint, societyStructure: e.target.value })}
                rows={4}
                className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-sans text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
                placeholder="Feudal, corporate, sect-based, military rule..."
              />
            </div>

            <div>
              <h4 className="text-neutral-400 font-sc uppercase tracking-wider font-bold text-xs mb-2">Major Factions (One per line)</h4>
              <textarea
                value={blueprint.majorFactions?.join('\n') || ''}
                onChange={(e) => setBlueprint({
                  ...blueprint,
                  majorFactions: e.target.value.split('\n')
                })}
                rows={4}
                className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-mono text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
                placeholder="e.g. Heavenly Sword Sect&#10;Deep Sea Alliance&#10;Abyssal Cult"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm flex items-center space-x-2">
                <Zap size={14} className="text-portal"/>
                <span>Power System Outline</span>
              </h3>
              <span className="text-[9px] text-portal font-mono">Editable</span>
            </div>
            <textarea
              value={blueprint.powerSystemOutline}
              onChange={(e) => setBlueprint({ ...blueprint, powerSystemOutline: e.target.value })}
              rows={10}
              className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-mono text-xs leading-relaxed rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all scrollbar-thin"
              placeholder="Explain the cultivation realms, power scaling, magical energy..."
            />
          </div>
        </div>

        {/* Section 3: MC Profile & First Arc Promise */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm flex items-center space-x-2">
                <Users size={14} className="text-portal"/>
                <span>Main Character Profile</span>
              </h3>
              <span className="text-[9px] text-portal font-mono">Editable</span>
            </div>
            <textarea
              value={blueprint.mcProfile}
              onChange={(e) => setBlueprint({ ...blueprint, mcProfile: e.target.value })}
              rows={5}
              className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-sans text-sm leading-relaxed rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
              placeholder="Starting cultivation level, cheat, flaws, unique attributes..."
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm flex items-center space-x-2">
                <Target size={14} className="text-portal"/>
                <span>First Arc Promise</span>
              </h3>
              <span className="text-[9px] text-portal font-mono">Editable</span>
            </div>
            <textarea
              value={blueprint.firstArcPromise}
              onChange={(e) => setBlueprint({ ...blueprint, firstArcPromise: e.target.value })}
              rows={5}
              className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-sans text-sm leading-relaxed rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
              placeholder="The initial central conflict, stakes, face-slapping event..."
            />
          </div>
        </div>

        {/* Section 4: Trope Rules & Style Bible */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm flex items-center space-x-2">
                <Wand2 size={14} className="text-portal"/>
                <span>Trope Guidance & Rules</span>
              </h3>
              <span className="text-[9px] text-portal font-mono">Editable</span>
            </div>
            <textarea
              value={blueprint.tropeRules || ''}
              onChange={(e) => setBlueprint({ ...blueprint, tropeRules: e.target.value })}
              rows={4}
              className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-sans text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
              placeholder="Action tropes to leverage, wuxia style face-slapping metrics, subversions..."
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm flex items-center space-x-2">
                <FileText size={14} className="text-portal"/>
                <span>Stylistic Bible</span>
              </h3>
              <span className="text-[9px] text-portal font-mono">Editable</span>
            </div>
            <textarea
              value={blueprint.styleBible || ''}
              onChange={(e) => setBlueprint({ ...blueprint, styleBible: e.target.value })}
              rows={4}
              className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-mono text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
              placeholder="Sovereign style rules, forbidden phrasing, key tone requirements..."
            />
          </div>
        </div>

        {/* Section 4.5: Destined Ending & Estimated Arcs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm flex items-center space-x-2">
                <span className="text-portal">✦</span>
                <span>Destined Ending</span>
              </h3>
              <span className="text-[9px] text-portal font-mono">Editable</span>
            </div>
            <textarea
              value={blueprint.destinedEnding || ''}
              onChange={(e) => setBlueprint({ ...blueprint, destinedEnding: e.target.value })}
              rows={3}
              className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-sans text-sm rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
              placeholder="The intended fated destination of the story (e.g. Kingdom Collapse, Final Ascension)..."
            />
          </div>
          <div className="md:col-span-1">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-signal font-sc uppercase tracking-widest font-bold text-sm flex items-center space-x-2">
                <span>Estimated Arcs</span>
              </h3>
              <span className="text-[9px] text-portal font-mono">Editable</span>
            </div>
            <input
              type="number"
              value={blueprint.estimatedArcs || ''}
              onChange={(e) => setBlueprint({ ...blueprint, estimatedArcs: parseInt(e.target.value) || 5 })}
              className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-mono text-sm rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all text-center"
              placeholder="e.g. 5"
              min="1"
              max="100"
            />
          </div>
        </div>

        {/* Section 5: Characters, Mysteries & Plot Threads */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-neutral-400 font-sc uppercase tracking-wider font-bold text-xs mb-2 flex items-center space-x-1">
              <Users size={12} className="text-portal"/>
              <span>Initial Characters (One per line)</span>
            </h4>
            <textarea
              value={blueprint.initialCharacters?.join('\n') || ''}
              onChange={(e) => setBlueprint({
                ...blueprint,
                initialCharacters: e.target.value.split('\n')
              })}
              rows={5}
              className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-mono text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
              placeholder="e.g. Elder Qin (Protector)&#10;Junior Sister Han (Ally)&#10;Young Master Ye (Rival)"
            />
          </div>

          <div>
            <h4 className="text-neutral-400 font-sc uppercase tracking-wider font-bold text-xs mb-2 flex items-center space-x-1">
              <HelpCircle size={12} className="text-portal"/>
              <span>Major Mysteries (One per line)</span>
            </h4>
            <textarea
              value={blueprint.majorMysteries?.join('\n') || ''}
              onChange={(e) => setBlueprint({
                ...blueprint,
                majorMysteries: e.target.value.split('\n')
              })}
              rows={5}
              className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-mono text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
              placeholder="e.g. True origin of the Sovereign Ring&#10;Why was the Sect Leader poisoned?&#10;The secrets of the Abyss"
            />
          </div>

          <div>
            <h4 className="text-neutral-400 font-sc uppercase tracking-wider font-bold text-xs mb-2 flex items-center space-x-1">
              <GitBranch size={12} className="text-portal"/>
              <span>Unresolved Plot Threads (One per line)</span>
            </h4>
            <textarea
              value={blueprint.unresolvedPlotThreads?.join('\n') || ''}
              onChange={(e) => setBlueprint({
                ...blueprint,
                unresolvedPlotThreads: e.target.value.split('\n')
              })}
              rows={5}
              className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-mono text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
              placeholder="e.g. Sever the engagement with Chu family&#10;Win the Inner Sect tournament&#10;Find the lightning herb"
            />
          </div>
        </div>

        <div className="flex flex-col xl:flex-row items-center justify-between pt-6 border-t border-neutral-900 gap-4">
          <button
            type="button"
            onClick={onBack}
            disabled={isGenerating}
            className="text-neutral-400 hover:text-signal text-xs font-sc uppercase tracking-widest"
          >
            ← Refine Details
          </button>

          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <button
              type="button"
              onClick={onStartStory}
              disabled={isGenerating}
              className="w-full sm:w-auto font-sc px-6 py-3 rounded text-sm uppercase tracking-widest font-bold flex items-center justify-center space-x-2 bg-human text-signal border border-human hover:bg-void hover:text-human hover:border-human shadow-[0_0_15px_rgba(139,0,0,0.3)] transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  {activeAgentId === 'versa' ? (
                    <img src={AGENTS.VERSA.logoUrl} className="w-5 h-5 object-contain animate-pulse" alt="VERSA" />
                  ) : (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full" />
                  )}
                  <span>{activeAgentId === 'versa' ? 'VERSA is writing...' : 'Generating...'}</span>
                </>
              ) : (
                <><span>Accept Blueprint & Start Matrix</span><ArrowRight size={16} /></>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyBlueprint}
              className="w-full sm:w-auto font-sc px-5 py-3 rounded text-sm uppercase tracking-widest font-bold flex items-center justify-center space-x-2 bg-neutral-950 text-portal border border-neutral-800 hover:border-portal hover:text-signal transition-all shadow-[0_0_15px_rgba(4,172,255,0.1)] cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={16} />
                  <span>Copied Blueprint</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy Blueprint</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyBlueprintJson}
              className="w-full sm:w-auto font-sc px-5 py-3 rounded text-sm uppercase tracking-widest font-bold flex items-center justify-center space-x-2 bg-neutral-950 text-neutral-400 border border-neutral-850 hover:border-neutral-700 hover:text-signal transition-all cursor-pointer"
            >
              {copiedJson ? (
                <>
                  <Check size={16} />
                  <span>Copied JSON</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
