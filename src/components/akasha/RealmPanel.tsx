import React from 'react';
import { ShieldCheck, Award, Zap } from 'lucide-react';
import { StoryMemory } from '../../types';

interface RealmPanelProps {
  memory: StoryMemory;
}

export const RealmPanel: React.FC<RealmPanelProps> = ({ memory }) => {
  return (
    <div className="space-y-4 animate-fadeIn" id="realm-panel">
      <div className="p-4 bg-void border border-neutral-900 rounded flex items-center justify-between">
        <div>
          <span className="text-[10px] text-portal uppercase font-bold tracking-wider block font-sc">Current Ascension Rank</span>
          <span className="text-lg font-display text-signal font-bold mt-0.5 block">{memory.currentPowerStage}</span>
        </div>
        <div className="p-3 bg-portal/5 rounded-full border border-portal/15 text-portal">
          <Zap size={22} className="animate-pulse" />
        </div>
      </div>

      <div className="p-4 bg-void/50 border border-neutral-900 rounded">
        <span className="text-[10px] text-neutral-400 uppercase font-sc tracking-widest block mb-2">Universe Power Tiers</span>
        <p className="text-xs text-neutral-300 leading-relaxed font-serif italic">
          {memory.powerSystem || "No power parameters set in this sphere."}
        </p>
      </div>

      <div className="p-4 bg-neutral-950 border border-neutral-900 rounded space-y-2">
        <span className="text-[10px] text-human uppercase font-bold tracking-widest block font-sc">System Alignment Status</span>
        <div className="flex items-center space-x-2 text-xs text-neutral-400">
          <ShieldCheck size={14} className="text-green-500" />
          <span>Memory Consistency: Standard</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-neutral-400">
          <Award size={14} className="text-portal" />
          <span>Story Resonance Node Activated</span>
        </div>
      </div>
    </div>
  );
};
