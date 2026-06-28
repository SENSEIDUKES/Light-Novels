import React, { useState } from 'react';
import { UserProfile as UserProfileType } from '../types';
import { Award, Search, Sparkles, HelpCircle, Shield, Zap, RefreshCw, Save, Sliders, Compass, Globe, Key } from 'lucide-react';

interface UserProfileInventoryPanelProps {
  profile: UserProfileType | null;
  handleAttuneArtifact: (artifactId: string) => Promise<void>;
}

export function UserProfileInventoryPanel({ profile, handleAttuneArtifact }: UserProfileInventoryPanelProps) {
  const [inventorySearch, setInventorySearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [milestoneFilter, setMilestoneFilter] = useState('all');
  const [inspectArtifact, setInspectArtifact] = useState<any | null>(null);

  const artifacts = profile?.cosmicInventory || [];
  const filteredArtifacts = artifacts.filter(art => {
    const matchesSearch = 
      art.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      art.description.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      (art.attributeBoost && art.attributeBoost.toLowerCase().includes(inventorySearch.toLowerCase())) ||
      art.milestoneName.toLowerCase().includes(inventorySearch.toLowerCase());
      
    const matchesRarity = rarityFilter === 'all' || art.rarity === rarityFilter;
    const matchesMilestone = milestoneFilter === 'all' || art.milestoneType === milestoneFilter;
    
    return matchesSearch && matchesRarity && matchesMilestone;
  });

  const renderArtifactIcon = (name: string, rarity: string) => {
    const lower = name.toLowerCase();
    const size = 20;
    let className = "";
    
    if (rarity === 'Transcendent') className = "text-cyan-400 animate-pulse drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]";
    else if (rarity === 'Mythic') className = "text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]";
    else if (rarity === 'Legendary') className = "text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]";
    else if (rarity === 'Epic') className = "text-purple-400";
    else if (rarity === 'Rare') className = "text-emerald-400";
    else className = "text-neutral-500";

    if (lower.includes('medallion') || lower.includes('badge')) return <Award size={size} className={className} />;
    if (lower.includes('seal') || lower.includes('signet')) return <Shield size={size} className={className} />;
    if (lower.includes('gourd') || lower.includes('nectar') || lower.includes('cauldron') || lower.includes('potion')) return <Zap size={size} className={className} />;
    if (lower.includes('spindle') || lower.includes('thread') || lower.includes('matrix')) return <RefreshCw size={size} className={className} />;
    if (lower.includes('pen') || lower.includes('brush') || lower.includes('scribe')) return <Save size={size} className={className} />;
    if (lower.includes('crown') || lower.includes('circlet') || lower.includes('tiara')) return <Sliders size={size} className={className} />;
    if (lower.includes('compass')) return <Compass size={size} className={className} />;
    if (lower.includes('mirror')) return <Globe size={size} className={className} />;
    if (lower.includes('key')) return <Key size={size} className={className} />;
    return <Sparkles size={size} className={className} />;
  };

  return (
    <>
      {/* Cosmic Inventory Section */}
      <div className="pt-10 border-t border-neutral-900/50 mt-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-[11px] uppercase font-bold tracking-widest text-neutral-500 font-sc flex items-center gap-2">
            <Award size={14} className="text-portal animate-pulse" />
            Cosmic Inventory (Sacred Treasury)
          </h3>
          <div className="text-[10px] text-neutral-400 font-mono bg-neutral-900/40 border border-neutral-850 px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
            <Sparkles size={11} className="text-portal" />
            <span>Unlocked: {(profile?.cosmicInventory || []).length} Relics</span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search sacred relics..."
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              className="w-full bg-black/50 border border-neutral-900 rounded-lg pl-9 pr-4 py-2 text-xs text-signal focus:border-portal/50 outline-none transition-all placeholder:text-neutral-600 font-sans"
            />
          </div>

          {/* Rarity Filter */}
          <div>
            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
              className="w-full bg-black/50 border border-neutral-900 rounded-lg px-3 py-2 text-xs text-neutral-400 focus:border-portal/50 outline-none transition-all appearance-none cursor-pointer font-sans"
            >
              <option value="all">All Rarities</option>
              <option value="Common">Common</option>
              <option value="Rare">Rare</option>
              <option value="Epic">Epic</option>
              <option value="Legendary">Legendary</option>
              <option value="Mythic">Mythic</option>
              <option value="Transcendent">Transcendent</option>
            </select>
          </div>

          {/* Milestone Filter */}
          <div>
            <select
              value={milestoneFilter}
              onChange={(e) => setMilestoneFilter(e.target.value)}
              className="w-full bg-black/50 border border-neutral-900 rounded-lg px-3 py-2 text-xs text-neutral-400 focus:border-portal/50 outline-none transition-all appearance-none cursor-pointer font-sans"
            >
              <option value="all">All Milestones</option>
              <option value="rank_up">Dao Breakthroughs</option>
              <option value="chapter_seal">Chapter Sealing</option>
              <option value="chapter_5">Story Depth (Ch. 5)</option>
              <option value="challenge_complete">Fate Survival Runs</option>
            </select>
          </div>
        </div>

        {/* Artifacts Grid */}
        {filteredArtifacts.length === 0 ? (
          <div className="border border-dashed border-neutral-900 rounded-xl p-8 text-center bg-black/10">
            <HelpCircle size={32} className="text-neutral-700 mx-auto mb-2.5 animate-pulse" />
            <p className="text-xs font-serif text-neutral-500">
              No sacred relics manifest under current filters. Ascend your Dao level, seal chapters, or succeed in challenges to gain relics!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArtifacts.map((art) => {
              const isEquipped = profile?.equippedArtifactId === art.id;
              const isTranscendent = art.rarity === 'Transcendent';
              const isMythic = art.rarity === 'Mythic';
              const isLegendary = art.rarity === 'Legendary';
              const isEpic = art.rarity === 'Epic';
              const isRare = art.rarity === 'Rare';

              let borderClass = 'border-neutral-900 hover:border-neutral-800';
              let bgGlowClass = 'bg-[#030303]';
              let rarityTextClass = 'text-neutral-500';

              if (isTranscendent) {
                borderClass = 'border-cyan-500/30 hover:border-cyan-400/50';
                bgGlowClass = 'bg-cyan-950/5 shadow-[0_0_20px_rgba(6,182,212,0.15)]';
                rarityTextClass = 'bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-rose-400 to-yellow-400 font-extrabold animate-pulse';
              } else if (isMythic) {
                borderClass = 'border-red-950/60 hover:border-red-500/30';
                bgGlowClass = 'bg-red-950/5 shadow-[0_0_15px_rgba(220,38,38,0.1)]';
                rarityTextClass = 'text-red-400 font-extrabold animate-pulse';
              } else if (isLegendary) {
                borderClass = 'border-amber-950/80 hover:border-amber-500/30';
                bgGlowClass = 'bg-amber-950/5 shadow-[0_0_12px_rgba(245,158,11,0.08)]';
                rarityTextClass = 'text-amber-400 font-bold';
              } else if (isEpic) {
                borderClass = 'border-purple-950/80 hover:border-purple-500/20';
                bgGlowClass = 'bg-purple-950/5 shadow-[0_0_10px_rgba(139,92,246,0.05)]';
                rarityTextClass = 'text-purple-400';
              } else if (isRare) {
                borderClass = 'border-emerald-950/80 hover:border-emerald-500/20';
                bgGlowClass = 'bg-emerald-950/5';
                rarityTextClass = 'text-emerald-400';
              }

              return (
                <button
                  type="button"
                  key={art.id}
                  className={`text-left w-full border rounded-xl p-4 flex flex-col justify-between transition-all duration-300 relative group cursor-pointer ${borderClass} ${bgGlowClass}`}
                  onClick={() => setInspectArtifact(art)}
                >
                  {/* Equipped indicator */}
                  {isEquipped && (
                    <div className="absolute top-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-black/40 border border-neutral-900 flex items-center justify-center relative overflow-hidden group-hover:border-neutral-850 transition-all shrink-0">
                        {renderArtifactIcon(art.name, art.rarity)}
                        {isEquipped && (
                          <div className="absolute inset-0 border border-amber-500/40 rounded-lg animate-pulse"></div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-sans font-medium text-signal truncate group-hover:text-portal transition-colors flex items-center gap-1.5">
                          {art.name}
                        </h4>
                        <span className={`text-[9px] uppercase tracking-widest font-mono font-medium block ${rarityTextClass}`}>
                          {art.rarity}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] font-serif text-neutral-400 line-clamp-2 leading-relaxed italic">
                      "{art.description}"
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-900/40 flex items-center justify-between text-[9px] text-neutral-500 font-mono">
                    <div className="flex items-center gap-1 text-portal/70">
                      <Sparkles size={10} />
                      <span>{art.attributeBoost}</span>
                    </div>
                    <span className="text-neutral-600 truncate max-w-[100px] text-right">
                      {art.milestoneName}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detailed Artifact Inspect Modal */}
      {inspectArtifact && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" 
          role="button"
          tabIndex={0}
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectArtifact(null);
          }}
          onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') setInspectArtifact(null); }}
        >
          <div 
            className="w-full max-w-md bg-void border border-neutral-900 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(4,172,255,0.1)] relative"
            role="dialog"
            aria-modal="true"
          >
            {/* Top glow indicator */}
            <div className={`absolute top-0 inset-x-0 h-[2px] ${
              inspectArtifact.rarity === 'Transcendent' 
                ? 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent' 
                : inspectArtifact.rarity === 'Mythic' 
                ? 'bg-gradient-to-r from-transparent via-red-500 to-transparent' 
                : inspectArtifact.rarity === 'Legendary' 
                ? 'bg-gradient-to-r from-transparent via-amber-500 to-transparent'
                : inspectArtifact.rarity === 'Epic'
                ? 'bg-gradient-to-r from-transparent via-purple-500 to-transparent'
                : inspectArtifact.rarity === 'Rare'
                ? 'bg-gradient-to-r from-transparent via-emerald-500 to-transparent'
                : 'bg-gradient-to-r from-transparent via-neutral-500 to-transparent'
            }`}></div>
            
            <div className="p-6 space-y-6">
              {/* Icon & Title */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-black/60 border border-neutral-900 flex items-center justify-center relative shadow-inner overflow-hidden">
                  {(() => {
                    const lower = inspectArtifact.name.toLowerCase();
                    const size = 28;
                    let className = "";
                    const rarity = inspectArtifact.rarity;
                    
                    if (rarity === 'Transcendent') className = "text-cyan-400 animate-pulse drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]";
                    else if (rarity === 'Mythic') className = "text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]";
                    else if (rarity === 'Legendary') className = "text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]";
                    else if (rarity === 'Epic') className = "text-purple-400";
                    else if (rarity === 'Rare') className = "text-emerald-400";
                    else className = "text-neutral-500";

                    if (lower.includes('medallion') || lower.includes('badge')) return <Award size={size} className={className} />;
                    if (lower.includes('seal') || lower.includes('signet')) return <Shield size={size} className={className} />;
                    if (lower.includes('gourd') || lower.includes('nectar') || lower.includes('cauldron') || lower.includes('potion')) return <Zap size={size} className={className} />;
                    if (lower.includes('spindle') || lower.includes('thread') || lower.includes('matrix')) return <RefreshCw size={size} className={className} />;
                    if (lower.includes('pen') || lower.includes('brush') || lower.includes('scribe')) return <Save size={size} className={className} />;
                    if (lower.includes('crown') || lower.includes('circlet') || lower.includes('tiara')) return <Sliders size={size} className={className} />;
                    if (lower.includes('compass')) return <Compass size={size} className={className} />;
                    if (lower.includes('mirror')) return <Globe size={size} className={className} />;
                    if (lower.includes('key')) return <Key size={size} className={className} />;
                    return <Sparkles size={size} className={className} />;
                  })()}
                  <div className="absolute inset-0 bg-gradient-to-t from-portal/5 via-transparent to-transparent"></div>
                </div>
                
                <div className="space-y-1">
                  <span className={`text-[10px] uppercase font-bold tracking-widest font-mono block px-3 py-1 rounded-full bg-neutral-900/50 border border-neutral-850 max-w-fit mx-auto ${
                    inspectArtifact.rarity === 'Transcendent' 
                      ? 'text-cyan-400 border-cyan-950 bg-cyan-950/20' 
                      : inspectArtifact.rarity === 'Mythic' 
                      ? 'text-red-400 border-red-950 bg-red-950/20' 
                      : inspectArtifact.rarity === 'Legendary' 
                      ? 'text-amber-400 border-amber-950 bg-amber-950/20'
                      : inspectArtifact.rarity === 'Epic'
                      ? 'text-purple-400 border-purple-950 bg-purple-950/20'
                      : inspectArtifact.rarity === 'Rare'
                      ? 'text-emerald-400 border-emerald-950 bg-emerald-950/20'
                      : 'text-neutral-400'
                  }`}>
                    {inspectArtifact.rarity} Relic
                  </span>
                  <h3 className="font-display text-xl text-signal">{inspectArtifact.name}</h3>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    Acquired on {new Date(inspectArtifact.unlockedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Lore / Story description */}
              <div className="bg-[#030303] border border-neutral-900 p-4 rounded-xl space-y-2 shadow-inner">
                <h4 className="text-[9px] uppercase font-bold tracking-widest text-neutral-500 font-sc">Sacred Relic Lore</h4>
                <p className="text-xs font-serif text-neutral-300 leading-relaxed italic">
                  "{inspectArtifact.description}"
                </p>
              </div>

              {/* Meridian Attribute Boost */}
              <div className="bg-[#030303] border border-neutral-900 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-[9px] uppercase font-bold tracking-widest text-neutral-500 font-sc">Karmic Resonance</h4>
                  <p className="text-[10px] text-neutral-500 font-sans mt-0.5">Continuous soul-meridian boost</p>
                </div>
                <div className="px-3 py-1.5 bg-portal/10 border border-portal/30 rounded-lg text-xs font-bold font-mono text-portal animate-pulse flex items-center gap-1.5 shadow-[0_0_10px_rgba(4,172,255,0.1)]">
                  <Sparkles size={12} />
                  <span>{inspectArtifact.attributeBoost}</span>
                </div>
              </div>

              {/* Milestone Details */}
              <div className="text-[10px] text-neutral-500 font-mono flex justify-between items-center px-1">
                <span>Unlock Catalyst:</span>
                <span className="text-neutral-300 font-sans font-medium">{inspectArtifact.milestoneName}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                    handleAttuneArtifact(inspectArtifact.id);
                  }}
                  className={`flex-1 py-2.5 border rounded-full font-sc uppercase tracking-widest text-[11px] font-bold transition-all ${
                    profile?.equippedArtifactId === inspectArtifact.id
                      ? 'bg-transparent border-amber-500/40 text-amber-500 hover:bg-amber-500/10'
                      : 'bg-portal/10 border border-portal/30 text-portal hover:bg-portal hover:text-void shadow-[0_0_15px_rgba(4,172,255,0.1)]'
                  }`}
                >
                  {profile?.equippedArtifactId === inspectArtifact.id ? 'Sever Attunement' : 'Attune Soul to Relic'}
                </button>
                <button
                  type="button"
                  onClick={() => setInspectArtifact(null)}
                  className="px-6 py-2.5 border border-neutral-800 text-neutral-400 hover:text-signal hover:border-neutral-700 rounded-full font-sc uppercase tracking-widest text-[11px] font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
