import React, { useState } from 'react';
import { Network, HelpCircle, ArrowLeftRight, Trash2, Download } from 'lucide-react';
import { VirtualizedList } from '../VirtualizedList';
import { Character, CharacterRelationship } from '../../types';
import { useCodex } from './CodexContext';
import { useAppStore } from '../../store/useAppStore';

const handleDownload = async (url: string, filename: string) => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('CORS or Network error');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (e) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

interface LivingCodexRelationsProps {
  charsToRender: Character[];
  setDeletePrompt: (p: any) => void;
  selectedNodeChar: Character | null;
  setSelectedNodeChar: (c: Character | null) => void;
}

export function LivingCodexRelations({
  charsToRender,
  setDeletePrompt,
  selectedNodeChar,
  setSelectedNodeChar
}: LivingCodexRelationsProps) {
  const { memory, activeStory, mcName, pushNotification, onUpdateStory } = useCodex();

  const [bondSourceId, setBondSourceId] = useState('');
  const [bondTargetId, setBondTargetId] = useState('');
  const [bondAffinity, setBondAffinity] = useState<number>(0);
  const [bondDesc, setBondDesc] = useState('');

  const handleAddCustomRelationship = () => {
    if (!bondSourceId || !bondTargetId) {
      pushNotification("Two sovereign characters are required to bind a causal relation.");
      return;
    }
    if (bondSourceId === bondTargetId) {
      pushNotification("A cultivator cannot bond with their own split soul.");
      return;
    }
    const sourceChar = memory.characters.find(c => c.id === bondSourceId);
    const targetChar = memory.characters.find(c => c.id === bondTargetId);
    if (!sourceChar || !targetChar) return;

    const newRelationship: CharacterRelationship = {
      id: `bond_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceCharId: bondSourceId,
      sourceCharName: sourceChar.name,
      targetCharId: bondTargetId,
      targetCharName: targetChar.name,
      affinity: bondAffinity,
      description: bondDesc || `${sourceChar.name} and ${targetChar.name} are bound through shared tribulation.`,
      updatedAt: new Date().toISOString()
    };

    const currentBonds = activeStory.relationships || [];
    const currentActiveStory = useAppStore.getState().stories.find(s => s.id === activeStory.id) || activeStory;
    onUpdateStory({
      ...currentActiveStory,
      relationships: [newRelationship, ...currentBonds]
    });

    setBondSourceId('');
    setBondTargetId('');
    setBondDesc('');
    setBondAffinity(0);
    pushNotification(`Successfully bound a karma link between ${sourceChar.name} and ${targetChar.name}!`);
  };
  return (
    <>
{/* PAGE 2: Relationship Map (Karma Web Relationship Graph) */}
        
          <div className="space-y-6 animate-fadeIn" id="codex-relationships">
            <div className="border-b border-neutral-900 pb-3">
              <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Karma</h3>
              <p className="text-[10px] text-neutral-500 font-sans">Click on any Daoist node around {mcName}'s cosmic grid to inspect their physical alignment vectors.</p>
            </div>

            {charsToRender.length === 0 ? (
              <div className="text-center py-20 border border-neutral-900 rounded bg-neutral-950/20 text-xs text-neutral-500 italic">
                No active secondary nodes present. Mapping remains locked to the Void.
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Visual SVG Map block */}
                <div className="flex-1 bg-neutral-950/50 border border-neutral-900 rounded-lg p-4 flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
                  <div className="absolute top-2 left-2 text-[9px] px-2 py-0.5 bg-black border border-neutral-900 rounded font-mono text-neutral-500 uppercase">
                    Interactive Karma Interface
                  </div>

                  {/* SVG Mapping nodes */}
                  <svg className="w-full max-w-[420px] h-[340px]" viewBox="0 0 400 320">
                    <defs>
                      <filter id="glow-portal" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Draw connecting lines */}
                    {charsToRender.map((char, index) => {
                      const total = charsToRender.length;
                      const angle = (index * 2 * Math.PI) / total;
                      const radius = 100;
                      const cx = 200 + radius * Math.cos(angle);
                      const cy = 160 + radius * Math.sin(angle);

                      // Determine thread color based on attitude
                      const attitude = char.relationshipToMC?.toLowerCase() || '';
                      let strokeColor = '#4a4a4a'; // Default neutral gray
                      if (attitude.includes('enemy') || attitude.includes('host') || attitude.includes('hate') || attitude.includes('rival')) {
                        strokeColor = '#8B0000'; // Human Core Blood Red
                      } else if (attitude.includes('ally') || attitude.includes('friend') || attitude.includes('loyal') || attitude.includes('fiance')) {
                        strokeColor = '#04ACFF'; // Portal Cyan
                      } else if (attitude.includes('mentor') || attitude.includes('master') || attitude.includes('teacher') || attitude.includes('elder')) {
                        strokeColor = '#eab308'; // Gold
                      }

                      return (
                        <g key={`line-${char.id}`}>
                          <line 
                            x1="200" 
                            y1="160" 
                            x2={cx} 
                            y2={cy} 
                            stroke={strokeColor} 
                            strokeWidth={selectedNodeChar?.id === char.id ? "3.5" : "1.5"} 
                            opacity={selectedNodeChar ? (selectedNodeChar.id === char.id ? "1" : "0.3") : "0.75"}
                            className="transition-all duration-300"
                          />
                        </g>
                      );
                    })}

                    {/* Render Center Node representing MC */}
                    <g transform="translate(200, 160)" className="cursor-pointer">
                      <circle cx="0" cy="0" r="26" fill="#000000" stroke="#04ACFF" strokeWidth="2.5" filter="url(#glow-portal)" />
                      <circle cx="0" cy="0" r="22" fill="#000000" stroke="#8B0000" strokeWidth="1" />
                      <text 
                        x="0" 
                        y="3" 
                        textAnchor="middle" 
                        fill="#FAFAFA" 
                        className="font-sc text-[9px] font-bold tracking-widest pointer-events-none"
                      >
                        {mcName.split(' ')[0]}
                      </text>
                    </g>

                    {/* Render Circular character nodes */}
                    {charsToRender.map((char, index) => {
                      const total = charsToRender.length;
                      const angle = (index * 2 * Math.PI) / total;
                      const radius = 100;
                      const cx = 200 + radius * Math.cos(angle);
                      const cy = 160 + radius * Math.sin(angle);

                      const isSelected = selectedNodeChar?.id === char.id;
                      const attitude = char.relationshipToMC?.toLowerCase() || '';
                      let strokeColor = '#525252';
                      if (attitude.includes('enemy') || attitude.includes('host') || attitude.includes('hate') || attitude.includes('rival')) {
                        strokeColor = '#8B0000';
                      } else if (attitude.includes('ally') || attitude.includes('friend') || attitude.includes('loyal') || attitude.includes('fiance')) {
                        strokeColor = '#04ACFF';
                      } else if (attitude.includes('mentor') || attitude.includes('master')) {
                        strokeColor = '#eab308';
                      }

                      return (
                        <g 
                          key={`node-${char.id}`} 
                          transform={`translate(${cx}, ${cy})`}
                          className="cursor-pointer group"
                          onClick={() => setSelectedNodeChar(char)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedNodeChar(char); } }}
                        >
                          {/* Inner pulsing layer */}
                          <circle cx="0" cy="0" r={isSelected ? "17" : "13"} fill="#000000" stroke={strokeColor} strokeWidth={isSelected ? "3" : "1.5"} />
                          {char.status === 'deceased' && (
                            <line x1="-8" y1="-8" x2="8" y2="8" stroke="#8B0000" strokeWidth="2" opacity="0.8" />
                          )}
                          <text 
                            x="0" 
                            y="24" 
                            textAnchor="middle" 
                            fill={isSelected ? "#FAFAFA" : "#a3a3a3"} 
                            className="font-sans text-[8px] pointer-events-none font-bold tracking-tight"
                          >
                            {char.name.split(' ')[0]}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Inspect Card Profile Panel */}
                <div className="w-full lg:w-72 bg-neutral-950/80 border border-neutral-900 rounded-lg p-4 flex flex-col justify-between">
                  {selectedNodeChar ? (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="border-b border-neutral-900 pb-2 flex items-center justify-between">
                        <span className="text-[9px] text-portal font-mono uppercase font-bold tracking-widest">Active Resonance details</span>
                        <button 
                           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setSelectedNodeChar(null)}
                          className="text-[9px] text-neutral-600 hover:text-neutral-400 capitalize"
                        >
                          Clear
                        </button>
                      </div>

                      {selectedNodeChar.imageUrl && (
                        <div className="h-28 w-full rounded overflow-hidden border border-neutral-900 relative group/rel">
                          <img src={selectedNodeChar.imageUrl} alt={selectedNodeChar.name} className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" />
                          <button
                             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(selectedNodeChar.imageUrl, `${selectedNodeChar.name.toLowerCase().replace(/\s+/g, '_')}_portrait.png`);
                            }}
                            className="absolute bottom-1.5 right-1.5 z-20 bg-black/85 hover:bg-portal hover:text-void border border-neutral-900 hover:border-portal text-neutral-300 p-1.5 rounded transition-all duration-200 opacity-0 group-hover/rel:opacity-100 flex items-center gap-1 font-mono text-[8px] uppercase tracking-wider backdrop-blur cursor-pointer shadow"
                            title="Download Portrait"
                          >
                            <Download size={8} />
                            <span>Get</span>
                          </button>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="font-sc font-bold text-signal text-sm">{selectedNodeChar.name}</h4>
                        <span className="text-[10px] text-neutral-500 font-sans block">{selectedNodeChar.role}</span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between p-1 px-2 bg-void border border-neutral-900 rounded">
                          <span className="text-neutral-600 text-[8.5px] uppercase tracking-wider font-mono">Bonds to MC:</span>
                          <span className="text-human font-semibold text-[10px]">{selectedNodeChar.relationshipToMC}</span>
                        </div>
                        <div className="flex items-center justify-between p-1 px-2 bg-void border border-neutral-900 rounded">
                          <span className="text-neutral-600 text-[8.5px] uppercase tracking-wider font-mono">Status:</span>
                          <span className="text-neutral-400 font-mono text-[9px] uppercase">{selectedNodeChar.status}</span>
                        </div>
                        {selectedNodeChar.powerLevel && (
                          <div className="flex items-center justify-between p-1 px-2 bg-void border border-neutral-900 rounded">
                            <span className="text-neutral-600 text-[8.5px] uppercase tracking-wider font-mono">Realm:</span>
                            <span className="text-yellow-500 font-mono text-[9.5px]">{selectedNodeChar.powerLevel}</span>
                          </div>
                        )}
                        {selectedNodeChar.faction && (
                          <div className="flex items-center justify-between p-1 px-2 bg-void border border-neutral-900 rounded">
                            <span className="text-neutral-600 text-[8.5px] uppercase tracking-wider font-mono">Sect Affiliation:</span>
                            <span className="text-neutral-400 text-[9.5px] truncate max-w-[130px]">{selectedNodeChar.faction}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] text-neutral-400 leading-normal italic font-serif">
                        "{selectedNodeChar.description}"
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <HelpCircle size={28} className="text-neutral-800 mb-2 animate-pulse" />
                      <h4 className="font-sc text-xs text-neutral-400 uppercase tracking-widest font-semibold">Sensor Idle</h4>
                      <p className="text-[9.5px] text-neutral-600 font-sans mt-1 max-w-xs mx-auto leading-relaxed">
                        Tap any spirit node in the cosmic geometry to inspect special causal relationship bindings.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Custom Interactive Karma Bonds Panel */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-neutral-900 bg-void/50 p-6 rounded-lg border border-neutral-900">
                
                {/* Form to Create Custom Bond */}
                <div className="md:col-span-1 space-y-4">
                  <div>
                    <h4 className="font-sc font-bold text-portal text-xs uppercase tracking-widest flex items-center space-x-1.5">
                      <ArrowLeftRight size={14} />
                      <span>Engrave Karma Bond Link</span>
                    </h4>
                    <p className="text-[10px] text-neutral-500 font-sans mt-1">
                      Forge a manual fate thread linking two sovereign souls together in the persistent cosmic matrix.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block mb-1" htmlFor="a11y-control-${labelCounter}">Source Character</label>
                      <select
                        value={bondSourceId}
                        onChange={(e) => setBondSourceId(e.target.value)}
                        className="w-full bg-black border border-neutral-800 text-xs text-neutral-300 rounded p-2 focus:outline-none" id="a11y-control-${labelCounter}"
                      >
                        <option value="">-- Choose Soul --</option>
                        {memory.characters.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block mb-1" htmlFor="a11y-control-${labelCounter}">Target Character</label>
                      <select
                        value={bondTargetId}
                        onChange={(e) => setBondTargetId(e.target.value)}
                        className="w-full bg-black border border-neutral-800 text-xs text-neutral-300 rounded p-2 focus:outline-none" id="a11y-control-${labelCounter}"
                      >
                        <option value="">-- Choose Soul --</option>
                        {memory.characters.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label htmlFor="bond-affinity-score" className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">Affinity Score</label>
                        <span className={`text-[10px] font-mono font-bold ${bondAffinity < 0 ? 'text-human' : bondAffinity > 0 ? 'text-portal' : 'text-neutral-500'}`}>
                          {bondAffinity > 0 ? `+${bondAffinity}` : bondAffinity}%
                        </span>
                      </div>
                      <input
                        id="bond-affinity-score"
                        type="range"
                        min="-100"
                        max="100"
                        value={bondAffinity}
                        onChange={(e) => setBondAffinity(parseInt(e.target.value))}
                        className="w-full text-portal bg-neutral-900 rounded"
                      />
                      <div className="flex justify-between text-[8px] text-neutral-600 font-mono">
                        <span>Deadly Enemy (-100)</span>
                        <span>Neutral</span>
                        <span>Eternal Mirror (+100)</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block mb-1" htmlFor="a11y-control-${labelCounter}">Causal Narrative / Link Description</label>
                      <textarea
                        placeholder="e.g. Sworn companion, linked by the blood of the Azure Wyrm..."
                        value={bondDesc}
                        onChange={(e) => setBondDesc(e.target.value)}
                        className="w-full h-16 bg-black border border-neutral-800 text-xs text-neutral-300 rounded p-2 focus:outline-none resize-none font-serif" id="a11y-control-${labelCounter}"
                      />
                    </div>

                    <button
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleAddCustomRelationship}
                      className="w-full py-2 bg-portal text-void text-[10px] uppercase font-sc font-bold tracking-widest rounded hover:brightness-115 transition-all"
                    >
                      Bind Thread
                    </button>
                  </div>
                </div>

                {/* Display Active Relationships Ledger */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                    <h4 className="font-sc font-bold text-signal text-xs uppercase tracking-widest flex items-center space-x-1.5">
                      <Network size={14} />
                      <span>Active Custom Bonds Ledger</span>
                    </h4>
                    <span className="text-[10px] font-mono text-neutral-500">{(activeStory.relationships || []).length} registered threads</span>
                  </div>

                  <VirtualizedList
                    items={activeStory.relationships || []}
                    itemHeight={80} // Estimated height of each relationship bond card inside the grid list
                    containerHeight={300}
                    className="pr-2"
                    emptyPlaceholder={
                      <div className="h-full py-16 flex flex-col items-center justify-center text-center border border-dashed border-neutral-900 rounded">
                        <p className="font-serif italic text-neutral-500 text-xs">"No custom karma strands recorded. Link cultivators on your left."</p>
                      </div>
                    }
                    renderItem={(bond: any) => (
                      <div key={bond.id} className="p-3 bg-neutral-950 border border-neutral-900 rounded flex justify-between items-start gap-4">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-sc font-bold text-signal">{bond.sourceCharName}</span>
                            <span className="text-[9px] font-mono text-neutral-600">to</span>
                            <span className="text-xs font-sc font-bold text-signal">{bond.targetCharName}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono uppercase ${
                              bond.affinity < -40 ? 'bg-[#8B0000]/10 border border-[#8B0000]/25 text-human' : 
                              bond.affinity > 40 ? 'bg-portal/10 border border-portal/25 text-portal' :
                              'bg-neutral-900 border border-neutral-800 text-neutral-400'
                            }`}>
                              Affinity: {bond.affinity > 0 ? `+${bond.affinity}` : bond.affinity}%
                            </span>
                          </div>
                          <p className="text-[11px] font-serif text-neutral-400 italic">
                            "{bond.description}"
                          </p>
                        </div>
                        <button
                           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setDeletePrompt({ id: bond.id, type: 'relationship' })}
                          className="p-1 px-1.5 text-neutral-500 hover:text-human hover:bg-neutral-900 rounded transition-colors"
                          title="Purge link"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  />
                </div>

              </div>

            </div>
          
    </>
  );
}
