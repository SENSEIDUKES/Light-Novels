import React, { useState } from 'react';
import { 
  Zap, Compass
} from 'lucide-react';
import { StoryMemory, StoryWorld } from '../../types';

interface LivingCodexPowerProps {
  memory: StoryMemory;
  activeStory: StoryWorld;
  getPowerStageLevel: (stage?: string) => { score: number, title: string };
  mcName: string;
  getPowerRankScore: (s?: string) => { score: number, title: string };
  charsToRender: any[];
}

export function LivingCodexPower({
  memory,
  activeStory,
  getPowerStageLevel,
  mcName,
  getPowerRankScore,
  charsToRender
}: LivingCodexPowerProps) {
  return (
    <>
{/* PAGE 3: Power system (Sovereign Cultivation Power-Ranking Chart) */}
        
          <div className="space-y-6 animate-fadeIn" id="codex-power-system-leadboard">
            <div className="border-b border-neutral-900 pb-3 flex justify-between items-end">
              <div>
                <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Power Rankings</h3>
                <p className="text-[10px] text-neutral-500 font-sans">Power rankings distill standard cultivation tiers into exact energetic indexes.</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 font-mono bg-neutral-950 border border-neutral-900 text-yellow-500 rounded">
                Active Tier: {memory.currentPowerStage}
              </span>
            </div>

            {/* Dynamic visual ranking bar charts */}
            <div className="space-y-5 bg-neutral-950/60 p-4 rounded-lg border border-neutral-900">
              <span className="text-[10px] font-mono tracking-widest uppercase text-portal font-semibold block">Combat Prowess Graph</span>
              
              <div className="space-y-3">
                {/* Always include Main Character Han Feng / MC at their current live rank */}
                {(() => {
                  const mcScore = getPowerRankScore(memory.currentPowerStage);
                  
                  return (
                    <div className="space-y-1 bg-void/50 p-2.5 rounded border border-portal/20">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-[9.5px] px-1.5 bg-portal/10 text-portal font-mono rounded">MC</span>
                          <strong className="text-signal">{mcName} (You)</strong>
                        </div>
                        <span className="text-portal font-mono font-bold text-[11px]">Rank Index: {mcScore.score}/100</span>
                      </div>
                      <div className="h-2 bg-neutral-900 rounded overflow-hidden relative">
                        <div className="bg-gradient-to-r from-portal via-cyan-400 to-signal h-full rounded transition-all duration-1000" style={{ width: `${mcScore.score}%` }}></div>
                        <div className="absolute inset-y-0 right-0 w-[1.5px] bg-white animate-pulse"></div>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-neutral-500 font-mono">
                        <span>Min Stage</span>
                        <span>{memory.currentPowerStage} ({mcScore.title})</span>
                        <span>Max Sovereign</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Secondary characters in order of power level */}
                {charsToRender
                  .map(c => ({ char: c, stats: getPowerRankScore(c.powerLevel) }))
                  .sort((a, b) => b.stats.score - a.stats.score)
                  .map(({ char, stats }) => {
                    return (
                      <div key={char.id} className="space-y-1 bg-void/30 p-2.5 border border-neutral-900/40 rounded hover:border-neutral-800 transition-all">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="text-[9.5px] font-mono uppercase px-1 rounded bg-neutral-900 text-neutral-500">Node</span>
                            <span className="text-neutral-200 font-medium">{char.name}</span>
                            <span className="text-[10px] text-neutral-500 font-sans italic">({char.role.split(',')[0]})</span>
                          </div>
                          <span className="text-yellow-500 font-mono font-bold text-[11px]">{stats.score}/100</span>
                        </div>
                        <div className="h-2 bg-neutral-900/60 rounded overflow-hidden">
                          <div className="bg-gradient-to-r from-yellow-700 via-yellow-500 to-amber-300 h-full rounded" style={{ width: `${stats.score}%` }}></div>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-neutral-500 font-mono">
                          <span>{char.powerLevel || 'Level Unlisted'}</span>
                          <span>Realm Title: {stats.title}</span>
                        </div>
                      </div>
                    );
                  })
                }

                {charsToRender.length === 0 && (
                  <div className="text-center py-6 text-neutral-600 font-serif italic text-xs">
                    No secondary Daoist ranks mapped yet. Introduce them in scriptures.
                  </div>
                )}
              </div>
            </div>

            {/* General World system explanation definition rules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-neutral-950/40 border border-neutral-900 rounded-lg text-xs leading-relaxed space-y-2">
                <span className="text-[10px] text-human uppercase font-bold tracking-widest block font-sc">Cultivation System Rules</span>
                <p className="text-neutral-400 font-serif italic font-light">“{memory.powerSystem}”</p>
              </div>

              <div className="p-4 bg-neutral-950/40 border border-neutral-900 rounded-lg text-xs leading-relaxed space-y-2">
                <span className="text-[10px] text-portal uppercase font-bold tracking-widest block font-sc">Universal Laws of Void</span>
                <ul className="list-disc pl-4 space-y-1.5 text-neutral-400">
                  {memory.worldRules?.map((rule, idx) => (
                    <li key={idx} className="font-sans font-light">{rule}</li>
                  ))}
                  {(!memory.worldRules || memory.worldRules.length === 0) && (
                    <li>No laws codified yet. Survival is standard.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        
    </>
  );
}
