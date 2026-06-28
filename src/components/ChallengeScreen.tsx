import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Shield, Flame, Activity, Sparkles, Heart, Award, RotateCcw, Compass, BookOpen } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const ChallengeScreen: React.FC = () => {
  const activeChallenge = useAppStore(state => state.activeChallenge);
    const activeChallengeRun = useAppStore(state => state.activeChallengeRun);
    const progressChallenge = useAppStore(state => state.progressChallenge);
    const resetChallenge = useAppStore(state => state.resetChallenge);

  if (!activeChallenge || !activeChallengeRun) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-black text-signal">
        <Activity className="text-red-500 animate-spin mb-4" size={48} />
        <h3 className="font-display font-bold text-xl">Sensing Fate Ripple...</h3>
        <p className="text-sm text-neutral-500 mt-2">The cosmic strands are aligning. Please wait.</p>
        <button 
           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={resetChallenge}
          className="mt-6 px-6 py-2 border border-neutral-800 rounded-lg text-xs font-mono hover:border-portal transition-all"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const { title, description, fatedOutcome, totalSteps, successCondition, failureCondition, rewards } = activeChallenge;
  const { currentStep, state, result, qiAwarded } = activeChallengeRun;

  const currentChoicePoint = activeChallenge.choicePoints.find(
    cp => cp.stepNumber === currentStep
  );

  const getResultTitle = () => {
    if (result === 'success') return 'FATE SHATTERED';
    if (result === 'partial_success') return 'KARMIC SCARRED';
    return 'DOOM MANIFESTED';
  };

  const getResultColor = () => {
    if (result === 'success') return 'text-jade-accent border-jade-accent/20 bg-jade-accent/5';
    if (result === 'partial_success') return 'text-gold-accent border-gold-accent/20 bg-gold-accent/5';
    return 'text-red-500 border-red-500/20 bg-red-500/5';
  };

  const getResultDescription = () => {
    if (result === 'success') {
      return `You have successfully defied the heavens! Through resolute choices, you amassed enough Fate Resistance (${state.fateResistance}) and maintained minimal Danger (${state.danger}) to avert the destined tragedy. You stand united, victorious against destiny.`;
    }
    if (result === 'partial_success') {
      return `A bittersweet resolution. While you managed to stir the winds of destiny (${state.fateResistance}), the lingering Danger (${state.danger}) left permanent scars on your path. The fated outcome was bent, but not entirely broken.`;
    }
    return `Destiny is relentless. With insufficient Fate Resistance (${state.fateResistance}) or high demonic Danger (${state.danger}), you were swept away by the river of time. The fated outcome of separation and ruin has fully manifested.`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn min-h-[85vh] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-8">
        <button
           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={resetChallenge}
          className="group flex items-center space-x-2 text-xs font-mono text-neutral-400 hover:text-portal transition-colors"
          aria-label="Back to Library"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          <span>Leave Challenge</span>
        </button>
        <div className="flex items-center space-x-1.5 bg-neutral-950 px-3 py-1 rounded-full border border-neutral-850">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Fate Challenge Mode</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center">
        {currentStep < totalSteps ? (
          // ACTIVE GAMEPLAY
          <div className="space-y-8">
            {/* Title / Info card */}
            <div className="text-center space-y-3">
              <span className="text-xs font-sc font-bold uppercase tracking-[0.2em] text-portal">{activeChallenge.genre}</span>
              <h2 className="font-display font-bold text-2xl sm:text-4xl text-signal leading-tight">{title}</h2>
              <p className="text-neutral-400 max-w-xl mx-auto text-xs sm:text-sm leading-relaxed">{description}</p>
              
              {/* Progress Indicator */}
              <div className="max-w-md mx-auto pt-4 space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-neutral-500 uppercase">
                  <span>Deconstruction Phase</span>
                  <span>Step {currentStep} of {totalSteps - 1}</span>
                </div>
                <div className="h-1 w-full bg-void border border-neutral-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-portal transition-all duration-500"
                    style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Core Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-3xl mx-auto">
              {/* Survival */}
              <div className="bg-neutral-950/40 border border-neutral-900 p-3 rounded-xl flex flex-col justify-between space-y-1 hover:border-neutral-850 transition-all">
                <span className="text-[10px] font-mono text-neutral-500 uppercase flex items-center gap-1">
                  <Activity size={12} className="text-emerald-500" /> Survival
                </span>
                <span className="text-xl font-bold font-sans text-signal">{state.survival || 5}</span>
              </div>
              {/* Relationship */}
              <div className="bg-neutral-950/40 border border-neutral-900 p-3 rounded-xl flex flex-col justify-between space-y-1 hover:border-neutral-850 transition-all">
                <span className="text-[10px] font-mono text-neutral-500 uppercase flex items-center gap-1">
                  <Heart size={12} className="text-pink-500" /> Karmic Link
                </span>
                <span className="text-xl font-bold font-sans text-signal">{state.relationship || 5}</span>
              </div>
              {/* Danger */}
              <div className="bg-neutral-950/40 border border-neutral-900 p-3 rounded-xl flex flex-col justify-between space-y-1 hover:border-neutral-850 transition-all">
                <span className="text-[10px] font-mono text-neutral-500 uppercase flex items-center gap-1">
                  <Flame size={12} className="text-red-500" /> Danger
                </span>
                <span className="text-xl font-bold font-sans text-signal">{state.danger || 0}</span>
              </div>
              {/* Fate Resistance */}
              <div className="bg-neutral-950/40 border border-neutral-900 p-3 rounded-xl flex flex-col justify-between space-y-1 hover:border-neutral-850 transition-all">
                <span className="text-[10px] font-mono text-neutral-500 uppercase flex items-center gap-1">
                  <Shield size={12} className="text-[#04acff]" /> Resistance
                </span>
                <span className="text-xl font-bold font-sans text-signal">{state.fateResistance || 0}</span>
              </div>
              {/* Trust */}
              <div className="bg-neutral-950/40 border border-neutral-900 p-3 rounded-xl flex flex-col justify-between space-y-1 hover:border-neutral-850 transition-all col-span-2 sm:col-span-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase flex items-center gap-1">
                  <Sparkles size={12} className="text-purple-500" /> Trust
                </span>
                <span className="text-xl font-bold font-sans text-signal">{state.trust || 5}</span>
              </div>
            </div>

            {/* Scenario Prompt Section */}
            <div className="max-w-2xl mx-auto bg-neutral-950/60 border border-neutral-900 p-6 sm:p-8 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-4">
              {currentStep === 1 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-sc">The Starting Scenario</h4>
                  <p className="text-sm font-serif leading-relaxed text-neutral-300">{activeChallenge.startingScenario}</p>
                  <div className="h-[1px] bg-neutral-900 my-4" />
                </div>
              )}
              
              {currentChoicePoint ? (
                <div className="space-y-6">
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-portal font-sc flex items-center gap-1.5">
                    <Compass size={12} className="animate-spin" style={{ animationDuration: '6s' }} /> Choice Point {currentStep}
                  </h4>
                  <p className="text-base font-serif leading-relaxed text-signal">{currentChoicePoint.prompt}</p>
                  
                  {/* Choices list */}
                  <div className="grid grid-cols-1 gap-3 pt-2">
                    {currentChoicePoint.choices.map((choice) => (
                      <button
                        key={choice.id}
                         tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => progressChallenge(choice.id)}
                        className="group w-full text-left bg-black hover:bg-neutral-950/80 border border-neutral-900 hover:border-portal/50 p-4 rounded-xl transition-all duration-300 flex justify-between items-center gap-4 hover:shadow-[0_0_15px_rgba(4,172,255,0.06)]"
                      >
                        <div className="space-y-1">
                          <span className="text-sm font-semibold text-signal group-hover:text-portal transition-colors">{choice.label}</span>
                          {choice.description && (
                            <p className="text-xs text-neutral-500 group-hover:text-neutral-400 leading-normal">{choice.description}</p>
                          )}
                        </div>
                        <span className="text-neutral-700 group-hover:text-portal/60 text-xs font-mono select-none shrink-0 transition-colors">
                          Select Path →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-neutral-500 font-mono">End of cycle. Awaiting resolution.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // GAME COMPLETED / RESULT SCREEN
          <div className="space-y-8 animate-fadeIn">
            {/* Resolution Title */}
            <div className="text-center space-y-4">
              <span className="text-xs font-sc font-bold uppercase tracking-[0.25em] text-neutral-500">Fate Resolution</span>
              <div className={`inline-block border rounded-full px-6 py-2 text-sm sm:text-base font-sc font-extrabold uppercase tracking-widest ${getResultColor()} shadow-2xl`}>
                {getResultTitle()}
              </div>
              <h2 className="font-display font-bold text-3xl sm:text-5xl text-signal leading-tight">{title}</h2>
            </div>

            {/* Result Narrative Card */}
            <div className="max-w-2xl mx-auto bg-neutral-950/60 border border-neutral-900 p-6 sm:p-8 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] space-y-6">
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-sc">Timeline Consequences</h4>
                <p className="text-sm font-serif leading-relaxed text-neutral-300">{getResultDescription()}</p>
              </div>

              {/* Reward Block */}
              {qiAwarded !== undefined && (
                <div className="bg-void border border-neutral-900 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-portal/10 rounded-lg text-portal">
                      <Award size={20} className="drop-shadow-[0_0_8px_rgba(4,172,255,0.6)]" />
                    </div>
                    <div>
                      <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-signal">Registry Award</h5>
                      <p className="text-[10px] text-neutral-500 font-sans">Qi successfully integrated into your cosmic soul records.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold font-mono text-portal">+{qiAwarded} Qi</span>
                  </div>
                </div>
              )}

              {/* Conditions audit */}
              <div className="grid grid-cols-2 gap-4 border-t border-neutral-900 pt-6">
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 uppercase block mb-1">Success Criteria</span>
                  <span className="text-xs font-sans text-neutral-300 block">{successCondition}</span>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-neutral-500 uppercase block mb-1">Destined Outcome</span>
                  <span className="text-xs font-sans text-neutral-400 italic block">"{fatedOutcome}"</span>
                </div>
              </div>
            </div>

            {/* Final state summary */}
            <div className="max-w-2xl mx-auto grid grid-cols-5 gap-3">
              {/* Survival */}
              <div className="bg-neutral-950/30 border border-neutral-900/60 p-3 rounded-lg text-center">
                <span className="text-[9px] font-mono text-neutral-500 uppercase block">Survival</span>
                <span className="text-lg font-bold font-sans text-signal">{state.survival}</span>
              </div>
              {/* Relationship */}
              <div className="bg-neutral-950/30 border border-neutral-900/60 p-3 rounded-lg text-center">
                <span className="text-[9px] font-mono text-neutral-500 uppercase block">Karmic</span>
                <span className="text-lg font-bold font-sans text-signal">{state.relationship}</span>
              </div>
              {/* Danger */}
              <div className="bg-neutral-950/30 border border-neutral-900/60 p-3 rounded-lg text-center">
                <span className="text-[9px] font-mono text-neutral-500 uppercase block">Danger</span>
                <span className="text-lg font-bold font-sans text-signal">{state.danger}</span>
              </div>
              {/* Fate Resistance */}
              <div className="bg-neutral-950/30 border border-neutral-900/60 p-3 rounded-lg text-center">
                <span className="text-[9px] font-mono text-neutral-500 uppercase block">Resistance</span>
                <span className="text-lg font-bold font-sans text-signal">{state.fateResistance}</span>
              </div>
              {/* Trust */}
              <div className="bg-neutral-950/30 border border-neutral-900/60 p-3 rounded-lg text-center">
                <span className="text-[9px] font-mono text-neutral-500 uppercase block">Trust</span>
                <span className="text-lg font-bold font-sans text-signal">{state.trust}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="max-w-md mx-auto flex gap-4 justify-center pt-4">
              <button
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => useAppStore.getState().startChallenge(activeChallenge)}
                className="flex-1 py-3 bg-portal hover:bg-portal/90 text-void font-sc font-bold uppercase tracking-widest text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(4,172,255,0.3)] flex items-center justify-center space-x-2"
              >
                <RotateCcw size={14} />
                <span>Restart Cycle</span>
              </button>
              <button
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={resetChallenge}
                className="flex-1 py-3 bg-black hover:bg-neutral-950 border border-neutral-900 hover:border-neutral-800 text-neutral-300 font-sc font-bold uppercase tracking-widest text-xs rounded-xl transition-all flex items-center justify-center space-x-2"
              >
                <BookOpen size={14} />
                <span>Back to Hub</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="border-t border-neutral-950 pt-6 mt-12 text-center text-[10px] text-neutral-600 font-mono tracking-wider">
        THE CELESTIAL LIBRARY • BRAVING IMMORTAL CHRONICLES
      </div>
    </div>
  );
};
