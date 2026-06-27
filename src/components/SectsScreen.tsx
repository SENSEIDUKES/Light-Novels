import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Shield, Trophy, Target, BookOpen, Star, Crown, ChevronRight, Activity, Castle, Search, Plus, Swords, Flame, Sparkles, User, LogOut, Map } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

type SectViewState = 'discovery' | 'create' | 'detail';

type FactionType = 'Orthodox Alliance' | 'Demonic Path' | 'Wandering Dao' | 'Archivist Order';

interface SectData {
  id: string;
  name: string;
  description: string;
  emblem: React.ElementType;
  members: number;
  featuredWorld: string;
  faction: FactionType;
}

const FACTIONS: { id: string, name: FactionType, vibe: string, rewards: string, colorClass: string, bgClass: string, borderClass: string }[] = [
  {
    id: 'orthodox',
    name: 'Orthodox Alliance',
    vibe: 'Righteous sects, order, protection',
    rewards: 'Saving worlds, preserving canon, law, destiny, heroic choices',
    colorClass: 'text-portal',
    bgClass: 'bg-portal',
    borderClass: 'border-portal/20',
  },
  {
    id: 'demonic',
    name: 'Demonic Path',
    vibe: 'Power, betrayal, domination',
    rewards: 'Villain routes, forbidden arts, breaking canon, catastrophic branches',
    colorClass: 'text-human',
    bgClass: 'bg-human',
    borderClass: 'border-human/20',
  },
  {
    id: 'wandering',
    name: 'Wandering Dao',
    vibe: 'Rogues, loners, mercenaries',
    rewards: 'Unique forks, survival, exploration',
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500',
    borderClass: 'border-emerald-500/20',
  },
  {
    id: 'archivist',
    name: 'Archivist Order',
    vibe: 'Lore, codex, preservation',
    rewards: 'Clean worldbuilding, strong continuity, lore accuracy, artifacts',
    colorClass: 'text-gold-accent',
    bgClass: 'bg-gold-accent',
    borderClass: 'border-gold-accent/20',
  }
];

const MOCK_SECTS: SectData[] = [
  { id: '1', name: 'Void Weavers', description: 'Shaping worlds and defying fate together.', emblem: Shield, members: 248, featuredWorld: 'Chronicles of the Void', faction: 'Archivist Order' },
  { id: '2', name: 'Astral Blades', description: 'Severing karma with a single strike.', emblem: Swords, members: 112, featuredWorld: 'Heavenly Sword Domain', faction: 'Orthodox Alliance' },
  { id: '3', name: 'Eternal Flame Valley', description: 'Refining the soul through the dao of fire.', emblem: Flame, members: 89, featuredWorld: 'Nine Suns Universe', faction: 'Demonic Path' },
];

const MOCK_MEMBERS = [
  { name: 'Daoist Qing', rank: 'Sect Master', tier: 7, power: '99k' },
  { name: 'Fairy Lin', rank: 'Grand Elder', tier: 6, power: '85k' },
  { name: 'Wang Jin', rank: 'Elder', tier: 5, power: '72k' },
  { name: 'Li Qiang', rank: 'Core Disciple', tier: 4, power: '45k' },
  { name: 'Chen Mo', rank: 'Inner Disciple', tier: 3, power: '28k' },
];

const SHARED_BADGES = [
  { name: 'First Fork', icon: BookOpen, desc: 'Successfully created a stable fork of a major universe.' },
  { name: 'Void Survivor', icon: Activity, desc: 'Survived the Demonic Tribulation challenge.' },
  { name: 'Dao Seekers', icon: Star, desc: 'Reached 100 active disciples.' },
];

export const SectsScreen: React.FC = () => {
  const { setCurrentScreen } = useAppStore();
  
  const [view, setView] = useState<SectViewState>('discovery');
  const [activeSect, setActiveSect] = useState<SectData | null>(null);
  const [mySectId, setMySectId] = useState<string | null>(null);
  
  // Create Form State
  const [newSectName, setNewSectName] = useState('');
  const [newSectDesc, setNewSectDesc] = useState('');
  const [newSectFaction, setNewSectFaction] = useState<FactionType>('Orthodox Alliance');

  const handleJoinSect = (sect: SectData) => {
    setMySectId(sect.id);
    setActiveSect(sect);
    setView('detail');
  };

  const handleCreateSect = () => {
    if (!newSectName.trim()) return;
    const newSect: SectData = {
      id: `custom-${Date.now()}`,
      name: newSectName,
      description: newSectDesc || 'A newly founded sect.',
      emblem: Sparkles,
      members: 1,
      featuredWorld: 'Awaiting Foundation',
      faction: newSectFaction,
    };
    setMySectId(newSect.id);
    setActiveSect(newSect);
    setView('detail');
  };

  const renderDiscovery = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-black/40 border border-neutral-900 p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-display font-bold text-signal mb-1">Find Your Path</h2>
          <p className="text-sm font-serif text-neutral-400">Join a sect to earn rewards by reading, forking, and shaping worlds together.</p>
        </div>
        <button 
           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setView('create')}
          className="flex items-center gap-2 px-4 py-2 bg-portal/10 text-portal border border-portal/20 hover:bg-portal hover:text-white rounded-lg transition-colors text-sm font-sans font-medium"
        >
          <Plus size={16} />
          Found a Sect
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_SECTS.map((sect) => {
          const isMember = mySectId === sect.id;
          const factionData = FACTIONS.find(f => f.name === sect.faction) || FACTIONS[0];
          return (
            <div key={sect.id} className="bg-neutral-950/40 border border-neutral-900 rounded-2xl overflow-hidden hover:border-neutral-800 transition-colors group flex flex-col">
              <div className="h-24 bg-gradient-to-br from-neutral-900 to-black relative">
                 <div className={`absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm border ${factionData.borderClass} rounded text-[9px] font-mono uppercase tracking-widest ${factionData.colorClass}`}>
                   {factionData.name}
                 </div>
                 <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542281286-9e0a16bb7366')] bg-cover bg-center opacity-10 mix-blend-overlay group-hover:scale-105 transition-transform duration-700"></div>
                 <div className={`absolute -bottom-6 left-6 w-12 h-12 rounded-xl bg-void border ${factionData.borderClass} flex items-center justify-center shadow-lg`}>
                    <sect.emblem size={20} className={factionData.colorClass} />
                 </div>
              </div>
              <div className="p-6 pt-10 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-signal font-sans">{sect.name}</h3>
                <p className="text-xs text-neutral-500 font-serif mt-1 flex-1">{sect.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
                    <Users size={12} /> {sect.members} Disciples
                  </div>
                  <button 
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                      setActiveSect(sect);
                      if (isMember) {
                        setView('detail');
                      } else {
                        handleJoinSect(sect);
                      }
                    }}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      isMember 
                        ? 'bg-neutral-800 text-signal hover:bg-neutral-700' 
                        : 'bg-portal text-white hover:bg-portal-glow'
                    }`}
                  >
                    {isMember ? 'View Details' : 'Join Sect'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );

  const renderCreate = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-xl mx-auto space-y-8 pt-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-signal mb-2 text-center">Found a New Sect</h2>
        <p className="text-sm font-serif text-neutral-400 text-center">Establish your own legacy and gather disciples to shape the cosmos.</p>
      </div>

      <div className="bg-neutral-950/40 border border-neutral-900 p-6 rounded-2xl space-y-6">
        <div className="space-y-2">
          <label htmlFor="sectName" className="block text-xs font-mono uppercase tracking-widest text-neutral-500 mb-1">Sect Name</label>
          <input 
            id="sectName"
            type="text" 
            value={newSectName}
            onChange={(e) => setNewSectName(e.target.value)}
            placeholder="e.g. Divine Heavens Pavilion"
            className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-signal focus:outline-none focus:border-portal transition-colors placeholder:text-neutral-700"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="sectDesc" className="block text-xs font-mono uppercase tracking-widest text-neutral-500 mb-1">Doctrine / Motto</label>
          <textarea 
            id="sectDesc"
            value={newSectDesc}
            onChange={(e) => setNewSectDesc(e.target.value)}
            placeholder="What principles guide your sect?"
            className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-signal focus:outline-none focus:border-portal transition-colors placeholder:text-neutral-700 h-24 resize-none"
          />
        </div>

        <div className="space-y-3">
          <span className="block text-xs font-mono uppercase tracking-widest text-neutral-500 mb-1">Major Faction Alignment</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FACTIONS.map(faction => (
              <button 
                type="button"
                key={faction.id}
                onClick={() => setNewSectFaction(faction.name)}
                className={`text-left p-4 rounded-xl border cursor-pointer transition-colors ${newSectFaction === faction.name ? 'bg-black ' + faction.borderClass : 'bg-black/50 border-neutral-900 hover:border-neutral-800'}`}
              >
                <div className={`text-sm font-bold font-sans mb-1 ${newSectFaction === faction.name ? faction.colorClass : 'text-neutral-300'}`}>
                  {faction.name}
                </div>
                <div className="text-[10px] text-neutral-500 font-serif mb-2">
                  {faction.vibe}
                </div>
                <div className="text-[9px] font-mono text-neutral-600 uppercase">
                  Rewards: {faction.rewards}
                </div>
              </button>
            ))}
          </div>
        </div>

        <button 
           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleCreateSect}
          disabled={!newSectName.trim()}
          className="w-full py-3 bg-portal text-white rounded-lg font-sans font-bold hover:bg-portal-glow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Establish Foundation
        </button>
        <button 
          onClick={() => setView('discovery')}
          className="w-full py-3 text-neutral-500 font-sans text-sm hover:text-signal transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );

  const renderDetail = () => {
    if (!activeSect) return null;
    const isMember = mySectId === activeSect.id;
    const factionData = FACTIONS.find(f => f.name === activeSect.faction) || FACTIONS[0];

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Overview & Sect Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-neutral-950/40 border border-neutral-900 rounded-2xl overflow-hidden relative">
              <div className="h-48 bg-gradient-to-br from-neutral-900 to-black relative">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542281286-9e0a16bb7366')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
                <div className="absolute bottom-4 left-6 flex items-end space-x-4">
                  <div className={`w-20 h-20 rounded-xl bg-void border ${factionData.borderClass} flex items-center justify-center shadow-lg backdrop-blur-md`}>
                    <activeSect.emblem size={32} className={factionData.colorClass} />
                  </div>
                  <div className="mb-2">
                    <h2 className="font-display font-bold text-3xl text-signal">{activeSect.name}</h2>
                    <p className="text-neutral-400 font-serif text-sm">{activeSect.description}</p>
                  </div>
                </div>
                {!isMember && (
                  <div className="absolute top-4 right-4 flex items-center gap-3">
                    <div className={`px-3 py-1.5 bg-black/60 backdrop-blur-sm border ${factionData.borderClass} rounded-full flex items-center gap-2`}>
                       <span className={`w-2 h-2 rounded-full ${factionData.bgClass}`}></span>
                       <span className={`text-[10px] font-mono uppercase tracking-widest ${factionData.colorClass}`}>{factionData.name}</span>
                    </div>
                    <button  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleJoinSect(activeSect)} className={`px-4 py-2 ${factionData.bgClass} text-white rounded-lg text-sm font-sans font-bold shadow-lg hover:opacity-90 transition-colors`}>
                      Join Sect
                    </button>
                  </div>
                )}
                {isMember && (
                   <div className="absolute top-4 right-4 flex items-center gap-3">
                     <div className={`px-3 py-1.5 bg-black/60 backdrop-blur-sm border ${factionData.borderClass} rounded-full flex items-center gap-2`}>
                        <span className={`w-2 h-2 rounded-full ${factionData.bgClass}`}></span>
                        <span className={`text-[10px] font-mono uppercase tracking-widest ${factionData.colorClass}`}>{factionData.name}</span>
                     </div>
                     <div className="bg-black/60 backdrop-blur-sm border border-neutral-800 px-3 py-1.5 rounded-full flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                       <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Active Member</span>
                     </div>
                   </div>
                )}
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  <div className="bg-black border border-neutral-900 p-4 rounded-xl text-center">
                    <Users size={16} className="text-human mx-auto mb-2" />
                    <div className="font-bold font-sans text-xl text-signal">{activeSect.members}</div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">Disciples</div>
                  </div>
                  <div className="bg-black border border-neutral-900 p-4 rounded-xl text-center">
                    <BookOpen size={16} className="text-portal mx-auto mb-2" />
                    <div className="font-bold font-sans text-xl text-signal">12.4k</div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">Chapters Read</div>
                  </div>
                  <div className="bg-black border border-neutral-900 p-4 rounded-xl text-center">
                    <Activity size={16} className="text-emerald-500 mx-auto mb-2" />
                    <div className="font-bold font-sans text-xl text-signal">89</div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">Fates Survived</div>
                  </div>
                  <div className="bg-black border border-neutral-900 p-4 rounded-xl text-center">
                    <Trophy size={16} className="text-gold-accent mx-auto mb-2" />
                    <div className="font-bold font-sans text-xl text-signal">Top 10</div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">Global Rank</div>
                  </div>
                </div>


              </div>
            </div>

              <div className="bg-neutral-950/40 border border-neutral-900 p-6 rounded-2xl">
                <h3 className="font-sc font-bold uppercase tracking-widest text-xs text-neutral-500 flex items-center gap-2 mb-4">
                  <Map size={14} /> Faction Rewards & Standing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border ${factionData.borderClass} bg-black/30 flex flex-col justify-center`}>
                     <div className="text-xs font-bold text-signal mb-1">Affiliation</div>
                     <div className={`text-sm font-sans font-bold ${factionData.colorClass} mb-2`}>{factionData.name}</div>
                     <div className="text-[10px] font-mono text-neutral-500">{factionData.vibe}</div>
                  </div>
                  <div className="p-4 rounded-xl border border-neutral-800 bg-black/30">
                     <div className="text-xs font-bold text-signal mb-2">Rewarded Path Actions</div>
                     <p className="text-xs text-neutral-400 font-serif leading-relaxed">
                        {factionData.rewards}
                     </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {/* Artifact Vault */}
              <div className="bg-neutral-950/40 border border-neutral-900 p-6 rounded-2xl">
                <h3 className="font-sc font-bold uppercase tracking-widest text-xs text-neutral-500 flex items-center gap-2 mb-4">
                  <Castle size={14} /> Shared Artifact Vault
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {SHARED_BADGES.map((badge, i) => (
                    <div key={i} className="bg-black border border-portal/20 rounded-xl flex flex-col items-center text-center p-4">
                      <badge.icon size={20} className="text-portal mb-2" />
                      <span className="text-xs font-bold text-signal font-sans">{badge.name}</span>
                      <span className="text-[9px] font-serif text-neutral-500 mt-1">{badge.desc}</span>
                    </div>
                  ))}
                  <div className="bg-black border border-neutral-900 rounded-xl flex flex-col items-center justify-center p-4 opacity-50 border-dashed">
                    <Star size={20} className="text-neutral-700 mb-2" />
                    <span className="text-[10px] font-mono text-neutral-500">Locked Slot</span>
                  </div>
                </div>
              </div>

              {/* Members List */}
              <div className="bg-neutral-950/40 border border-neutral-900 p-6 rounded-2xl">
                <h3 className="font-sc font-bold uppercase tracking-widest text-xs text-neutral-500 flex items-center gap-2 mb-4">
                  <Users size={14} /> Disciple Registry
                </h3>
                <div className="space-y-3">
                  {MOCK_MEMBERS.map((member, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-black border border-neutral-800">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-700">
                           <User size={14} className="text-neutral-500" />
                         </div>
                         <div>
                           <div className="text-sm font-sans font-bold text-signal">{member.name}</div>
                           <div className="text-[10px] font-mono text-neutral-500">{member.rank}</div>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-xs text-portal font-mono">{member.power} Qi</div>
                      </div>
                    </div>
                  ))}
                  <button className="w-full py-2 text-[10px] font-mono uppercase tracking-widest text-neutral-500 hover:text-signal transition-colors mt-2">
                    View All {activeSect.members} Disciples
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Hierarchy & Info */}
          <div className="space-y-6">
            <div className="bg-neutral-950/40 border border-neutral-900 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="font-sc font-bold uppercase tracking-widest text-xs text-neutral-500">
                   Active Campaign
                 </h3>
                 <span className="text-[9px] font-mono text-portal uppercase border border-portal/20 px-2 py-0.5 rounded-full bg-portal/10">In Progress</span>
              </div>
              
              <div className="bg-black border border-portal/20 p-4 rounded-xl text-center hover:border-portal/50 transition-colors cursor-pointer group mb-4">
                <div className="w-full h-24 bg-neutral-900 rounded-lg mb-3 flex items-center justify-center border border-neutral-800 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe')] bg-cover bg-center opacity-20 group-hover:scale-105 transition-transform duration-700"></div>
                  <BookOpen size={24} className="text-portal/50 relative z-10 group-hover:text-portal transition-colors" />
                </div>
                <h4 className="text-sm font-bold text-signal font-display">{activeSect.featuredWorld}</h4>
                <p className="text-[10px] text-neutral-500 mt-1 uppercase font-mono tracking-widest">Featured World</p>
              </div>

              {/* Group Progress */}
              <div className="space-y-2 mb-6">
                 <div className="flex justify-between text-xs font-sans">
                    <span className="text-neutral-400">Sect Synchronization</span>
                    <span className="text-portal font-bold">68%</span>
                 </div>
                 <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                    <div className="h-full bg-portal w-[68%] rounded-full shadow-[0_0_10px_rgba(4,172,255,0.5)]"></div>
                 </div>
              </div>

              {/* Weekly Challenge */}
              <div className="space-y-3 mb-6">
                 <h4 className="font-sc font-bold uppercase tracking-widest text-[10px] text-neutral-500 flex items-center gap-2">
                   <Target size={12} /> Weekly Challenge
                 </h4>
                 <div className="bg-void border border-neutral-800 p-3 rounded-lg">
                    <div className="text-xs font-bold text-signal mb-1">The Grand Forking</div>
                    <div className="text-[10px] text-neutral-400 mb-2">Fork the featured world and survive the Demonic tribulation.</div>
                    <div className="flex items-center gap-2">
                       <div className="flex-1 h-1 bg-neutral-900 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-[24%]"></div>
                       </div>
                       <span className="text-[9px] font-mono text-emerald-500">24%</span>
                    </div>
                 </div>
              </div>

              {/* Reward Chest */}
              <div className="bg-gradient-to-b from-neutral-900/50 to-black border border-neutral-800 p-4 rounded-xl flex items-center gap-4">
                 <div className="w-10 h-10 rounded-lg bg-black border border-gold-accent/30 flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.1)] relative">
                    <Trophy size={16} className="text-gold-accent" />
                    <div className={`absolute -top-1 -right-1 w-4 h-4 ${factionData.bgClass} rounded-full flex items-center justify-center border border-black`}>
                       <span className="text-[8px] font-bold text-white">3</span>
                    </div>
                 </div>
                 <div>
                    <div className="text-xs font-bold text-gold-accent font-sans mb-0.5">Campaign Treasury</div>
                    <div className="text-[9px] text-neutral-500 font-mono uppercase tracking-wider">3 Keys Available</div>
                 </div>
              </div>
            </div>

            <div className="bg-black border border-neutral-900 p-6 rounded-2xl">
              <h3 className={`font-sc font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-6 ${factionData.colorClass}`}>
                <Crown size={14} /> Sect Hierarchy
              </h3>
              <div className="space-y-3">
                {[
                  { rank: 'Founder', color: 'text-gold-accent' },
                  { rank: 'Sect Master', color: factionData.colorClass },
                  { rank: 'Grand Elder', color: 'text-human' },
                  { rank: 'Elder', color: 'text-purple-400' },
                  { rank: 'Core Disciple', color: 'text-emerald-400' },
                  { rank: 'Inner Disciple', color: 'text-blue-300' },
                  { rank: 'Outer Disciple', color: 'text-neutral-400' },
                ].map((tier, idx) => (
                  <div key={tier.rank} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-900 transition-colors">
                    <span className={`text-sm font-semibold font-sans ${tier.color}`}>{tier.rank}</span>
                    <span className="text-[10px] font-mono text-neutral-600">Tier {7 - idx}</span>
                  </div>
                ))}
              </div>
            </div>

            {isMember && (
              <div className="pt-4 border-t border-neutral-900">
                <button 
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                    setMySectId(null);
                    setView('discovery');
                    setActiveSect(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-void border border-human/30 text-human hover:bg-human/10 hover:border-human transition-colors text-sm font-sans font-bold"
                >
                  <LogOut size={16} /> Leave Sect
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fadeIn min-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-8">
        <button
           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
            if (view !== 'discovery' && !mySectId) {
              setView('discovery');
            } else {
              setCurrentScreen('home');
            }
          }}
          className="group flex items-center space-x-2 text-xs font-mono text-neutral-400 hover:text-portal transition-colors"
        >
          <ChevronRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
          <span>{view !== 'discovery' && !mySectId ? 'Back to Sects' : 'Back to Library'}</span>
        </button>
        <div className="flex items-center space-x-4">
          {mySectId && view === 'discovery' && (
            <button 
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                const sect = MOCK_SECTS.find(s => s.id === mySectId) || activeSect;
                if (sect) {
                  setActiveSect(sect);
                  setView('detail');
                }
              }}
              className="text-xs font-sans font-bold text-portal hover:text-portal-glow transition-colors px-3 py-1 bg-portal/10 rounded-lg border border-portal/20"
            >
              My Sect
            </button>
          )}
          <div className="flex items-center space-x-1.5 bg-neutral-950 px-3 py-1 rounded-full border border-neutral-850">
            <span className="w-2 h-2 rounded-full bg-portal animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-portal">Sects System Active</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'discovery' && renderDiscovery()}
        {view === 'create' && renderCreate()}
        {view === 'detail' && renderDetail()}
      </AnimatePresence>
    </div>
  );
};

