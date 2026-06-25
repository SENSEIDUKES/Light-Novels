import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Character, Faction } from '../../types';
import { useCodex } from './CodexContext';

interface LivingCodexFactionsProps {
  factionsToRender: Faction[];
  memoryCharacters: Character[];
  setDeletePrompt: (prompt: any) => void;
}

export function LivingCodexFactions({
  factionsToRender,
  memoryCharacters,
  setDeletePrompt
}: LivingCodexFactionsProps) {
  const { memory, onUpdateMemory } = useCodex();
  const [showAddFactionForm, setShowAddFactionForm] = useState(false);
  const [newFaction, setNewFaction] = useState<Partial<Faction>>({
    name: '',
    description: '',
    alignment: 'Neutral',
    headquarters: '',
    status: 'Active'
  });

  const handleAddFaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaction.name?.trim()) return;

    const currentFactions = memory.factions || [];
    const factionObj: Faction = {
      id: `fct-${Date.now()}`,
      name: newFaction.name.trim(),
      description: newFaction.description?.trim() || '',
      alignment: newFaction.alignment,
      headquarters: newFaction.headquarters?.trim() || undefined,
      status: newFaction.status
    };

    onUpdateMemory({
      ...memory,
      factions: [...currentFactions, factionObj]
    });

    setNewFaction({ name: '', description: '', alignment: 'Neutral', headquarters: '', status: 'Active' });
    setShowAddFactionForm(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="codex-sects-and-factions">
      <div className="border-b border-neutral-900 pb-3 flex justify-between items-end">
        <div>
          <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Sect alliances & Hierarchies</h3>
          <p className="text-[10px] text-neutral-500 font-sans">Tree flow mapping describing who commands high elders, lineages, and outer disciples.</p>
        </div>
      </div>

      {/* Input Form to add custom faction */}
      {showAddFactionForm && (
        <form onSubmit={handleAddFaction} className="p-4 bg-neutral-950 border border-neutral-900 rounded-lg space-y-3 animate-fadeIn text-xs max-w-lg">
          <h4 className="font-sc font-extrabold text-xs text-human tracking-wider uppercase">Inscribe Celestial Sect / Power</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-${labelCounter}">Sect Name</label>
              <input 
                type="text"
                value={newFaction.name}
                onChange={(e) => setNewFaction({ ...newFaction, name: e.target.value })}
                placeholder="e.g. Heavenly Peak Sect"
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                required id="a11y-control-${labelCounter}"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-${labelCounter}">Alignment Creed</label>
              <select
                value={newFaction.alignment}
                onChange={(e) => setNewFaction({ ...newFaction, alignment: e.target.value })}
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs" id="a11y-control-${labelCounter}"
              >
                <option value="Righteous">Righteous (Orthodox)</option>
                <option value="Demonic">Demonic (Unorthodox)</option>
                <option value="Neutral">Neutral (Isolated)</option>
                <option value="Mysterious">Mysterious (Primordial)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-${labelCounter}">Headquarters</label>
              <input 
                type="text"
                value={newFaction.headquarters}
                onChange={(e) => setNewFaction({ ...newFaction, headquarters: e.target.value })}
                placeholder="e.g. Cloudrest Peak"
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs" id="a11y-control-${labelCounter}"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-${labelCounter}">Status Status</label>
              <select
                value={newFaction.status}
                onChange={(e) => setNewFaction({ ...newFaction, status: e.target.value })}
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs" id="a11y-control-${labelCounter}"
              >
                <option value="Active">Active & Prosperous</option>
                <option value="Fractured">Fractured Internal Rebellion</option>
                <option value="Destroyed">Destroyed Ruins (Extinct)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-neutral-400 block mb-1 font-sc" htmlFor="a11y-control-${labelCounter}">Sect History & Grand Creed</label>
            <textarea 
              value={newFaction.description}
              onChange={(e) => setNewFaction({ ...newFaction, description: e.target.value })}
              placeholder="e.g. Masters of the Nine Heavenly Sword Arrays..."
              rows={2}
              className="bg-neutral-950 border border-neutral-800 text-signal p-2 rounded w-full text-xs" id="a11y-control-${labelCounter}"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-1 font-mono">
            <button type="button"  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowAddFactionForm(false)} className="text-neutral-500">Cancel</button>
            <button type="submit" className="bg-portal text-void px-3 py-1 font-bold rounded">Inscribe</button>
          </div>
        </form>
      )}

      {/* Structured Collapsible Hierarchical grid */}
      <div className="grid grid-cols-1 gap-5">
        {!factionsToRender || factionsToRender.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-neutral-900 rounded bg-neutral-950/20 text-xs text-neutral-500 italic">
            No registered religious sects found. Fabricate your starting sects in chapter writing or add one above!
          </div>
        ) : (
          factionsToRender.map((fac) => {
            // Find all living characters whose sector affiliation matches this faction
            const mates = memoryCharacters.filter(c => c.faction?.toLowerCase().includes((fac.name || '').toLowerCase()));
            const alignmentColor = 
              fac.alignment === 'Righteous' ? 'text-green-400 border-green-950 bg-green-950/10' :
              fac.alignment === 'Demonic' ? 'text-human border-red-950 bg-red-950/10' :
              fac.alignment === 'Mysterious' ? 'text-portal border-cyan-950 bg-cyan-950/10 animate-pulse' :
              'text-neutral-400 border-neutral-850 bg-neutral-950';

            return (
              <div key={fac.id} className="p-4 bg-neutral-950/60 border border-neutral-900 rounded-lg space-y-4">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <span className={`text-[8.5px] font-mono border px-2 py-0.5 rounded uppercase tracking-wider ${alignmentColor}`}>
                      {fac.alignment} Sector
                    </span>
                    <h4 className="font-sc font-bold text-signal text-base mt-2">{fac.name}</h4>
                    <span className="text-[10px] text-neutral-500 font-sans block mt-0.5">HQ: {fac.headquarters || 'Unknown Space coordinates'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[9px] px-1.5 py-0.25 rounded border font-mono ${
                      fac.status === 'Active' ? 'text-green-500 border-green-950' : 'text-yellow-500 border-yellow-950'
                    }`}>
                      {fac.status}
                    </span>
                    <button
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setDeletePrompt({ id: fac.id, type: 'faction', name: fac.name })}
                      className="text-neutral-600 hover:text-human text-[9px] font-mono"
                    >
                      Dismantle
                    </button>
                  </div>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed font-serif bg-void/50 p-2.5 rounded border border-neutral-950">
                  "{fac.description || 'Creed manual is unreleased or holds secret legacy properties.'}"
                </p>

                {/* SECTION COMPONENT DIRECTLY LISTING HEIRARCHICAL TREE MEMBERS */}
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold block mb-2">Sect Lineage tree members</span>
                  {mates.length === 0 ? (
                    <div className="text-[10.5px] text-neutral-600 bg-void/25 p-2 rounded border border-neutral-950 italic font-serif text-center">
                      No active Daoists currently bound to this sect's lineage.
                    </div>
                  ) : (
                    <div className="space-y-1.5 pl-3 border-l border-neutral-900">
                      {/* Compute hierarchy branches based on simple keyword search inside roles */}
                      {mates.some(c => c.role.toLowerCase().includes('leader') || c.role.toLowerCase().includes('master') || c.role.toLowerCase().includes('ancestor') || c.role.toLowerCase().includes('head')) && (
                        <div className="space-y-1">
                          <span className="text-[9.5px] uppercase font-sc text-human block tracking-widest">Sect Leader / Pillar:</span>
                          {mates.filter(c => c.role.toLowerCase().includes('leader') || c.role.toLowerCase().includes('master') || c.role.toLowerCase().includes('ancestor') || c.role.toLowerCase().includes('head')).map(mx => (
                            <div key={mx.id} className="text-xs pl-2 text-neutral-300 font-sans flex items-center space-x-1">
                              <span>├─</span>
                              <strong className="text-signal">{mx.name}</strong>
                              <span className="text-[9px] text-neutral-500">({mx.role})</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {mates.some(c => c.role.toLowerCase().includes('elder') || c.role.toLowerCase().includes('mentor') || c.role.toLowerCase().includes('grandmaster')) && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[9.5px] uppercase font-sc text-yellow-500 block tracking-widest">Elders Council:</span>
                          {mates.filter(c => c.role.toLowerCase().includes('elder') || c.role.toLowerCase().includes('mentor') || c.role.toLowerCase().includes('grandmaster')).map(mx => (
                            <div key={mx.id} className="text-xs pl-2 text-neutral-300 font-sans flex items-center space-x-1">
                              <span>├─</span>
                              <span>{mx.name}</span>
                              <span className="text-[9px] text-neutral-500">({mx.role})</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {mates.some(c => !c.role.toLowerCase().includes('elder') && !c.role.toLowerCase().includes('mentor') && !c.role.toLowerCase().includes('grandmaster') && !c.role.toLowerCase().includes('leader') && !c.role.toLowerCase().includes('master') && !c.role.toLowerCase().includes('ancestor') && !c.role.toLowerCase().includes('head')) && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[9.5px] uppercase font-sc text-portal block tracking-widest">Core & Outer Disciples:</span>
                          {mates.filter(c => !c.role.toLowerCase().includes('elder') && !c.role.toLowerCase().includes('mentor') && !c.role.toLowerCase().includes('grandmaster') && !c.role.toLowerCase().includes('leader') && !c.role.toLowerCase().includes('master') && !c.role.toLowerCase().includes('ancestor') && !c.role.toLowerCase().includes('head')).map(mx => (
                            <div key={mx.id} className="text-xs pl-2 text-neutral-300 font-sans flex items-center space-x-1">
                              <span>└─</span>
                              <span>{mx.name}</span>
                              <span className="text-[9px] text-neutral-500">({mx.role})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
