import React from 'react';
import { Plus, Sword, RefreshCcw, Sparkles } from 'lucide-react';
import { Artifact, StoryWorld } from '../../types';

interface LivingCodexArtifactsProps {
  artifactsToRender: Artifact[];
  showAddArtifactForm: boolean;
  setShowAddArtifactForm: (show: boolean) => void;
  newArtifact: any;
  setNewArtifact: (artifact: any) => void;
  handleAddArtifact: (e: React.FormEvent) => void;
  setDeletePrompt: (prompt: any) => void;
  handleAwakenCardImage: (id: string, type: 'artifact', entity: any) => void;
  renderImageHistoryGallery: (id: string, type: 'artifact', history: any) => React.ReactNode;
  generatingId: string | null;
  previews: any;
  activeStory: StoryWorld;
}

export function LivingCodexArtifacts({
  artifactsToRender,
  showAddArtifactForm,
  setShowAddArtifactForm,
  newArtifact,
  setNewArtifact,
  handleAddArtifact,
  setDeletePrompt,
  handleAwakenCardImage,
  renderImageHistoryGallery,
  generatingId,
  previews,
  activeStory
}: LivingCodexArtifactsProps) {
  return (
    <div className="space-y-6 animate-fadeIn" id="codex-divine-artifacts">
      <div className="border-b border-neutral-900 pb-3 flex justify-between items-end">
        <div>
          <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Artifacts</h3>
          <p className="text-[10px] text-neutral-500 font-sans">Behold artifacts, weapons, secret arrays, or sacred medicinal pills currently existing in memory.</p>
        </div>
        <button
          onClick={() => setShowAddArtifactForm(!showAddArtifactForm)}
          className="px-2 py-1 bg-void hover:bg-neutral-900 font-sc font-bold border border-neutral-850 hover:border-neutral-700 text-neutral-400 hover:text-signal rounded text-[9px] uppercase tracking-wider flex items-center space-x-1"
        >
          <Plus size={10} />
          <span>Forge Artifact</span>
        </button>
      </div>

      {/* Input form to add custom artifact */}
      {showAddArtifactForm && (
        <form onSubmit={handleAddArtifact} className="p-4 bg-neutral-950 border border-neutral-900 rounded-lg space-y-3 animate-fadeIn text-xs max-w-lg">
          <h4 className="font-sc font-extrabold text-xs text-human tracking-wider uppercase">Forge relic description</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">Artifact Name</label>
              <input 
                type="text"
                value={newArtifact.name}
                onChange={(e) => setNewArtifact({ ...newArtifact, name: e.target.value })}
                placeholder="e.g. Heavenly Cauldron"
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">Spiritual Tier Rank</label>
              <select
                value={newArtifact.tier}
                onChange={(e) => setNewArtifact({ ...newArtifact, tier: e.target.value })}
                className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
              >
                <option value="Mortal">Mortal (Ordinary)</option>
                <option value="Earth">Earth Rank (Spiritual)</option>
                <option value="Heaven">Heaven Rank (Sacred)</option>
                <option value="Primordial">Primordial Rank (Cosmic)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-neutral-400 block mb-1 font-sc">Current Bearer / Owner</label>
            <input 
              type="text"
              value={newArtifact.currentOwner}
              onChange={(e) => setNewArtifact({ ...newArtifact, currentOwner: e.target.value })}
              placeholder="e.g. Han Feng or Elder Qin"
              className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] text-neutral-400 block mb-1 font-sc">Description / Unique Capacity</label>
            <textarea 
              value={newArtifact.description}
              onChange={(e) => setNewArtifact({ ...newArtifact, description: e.target.value })}
              placeholder="What cosmic impact does this weapon hold? e.g. Speeds alchemical processes by tenfold..."
              rows={2}
              className="bg-neutral-950 border border-neutral-800 text-signal p-2 rounded w-full text-xs resize-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <button type="button" onClick={() => setShowAddArtifactForm(false)} className="text-neutral-500">Abort</button>
            <button type="submit" className="bg-human text-signal px-4 py-1 rounded font-bold font-sc uppercase">Forge Relic</button>
          </div>
        </form>
      )}

      {/* List Artifacts Grid Gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
        {!artifactsToRender || artifactsToRender.length === 0 ? (
          <div className="col-span-2 text-center py-12 border border-dashed border-neutral-900 rounded bg-neutral-950/20 text-xs text-neutral-500 italic">
            No legendary relics found. Gather rare ores or let chapters uncover divine relics!
          </div>
        ) : (
          artifactsToRender.map((art) => {
            const isGenerating = generatingId === art.id;
            const hasImage = !!art.imageUrl;
            const activePreview = previews[art.id];
            const canGenerate = !hasImage || art.evolutionReady;
            const displayedImage = activePreview ? activePreview.urls[activePreview.selectedIndex] : art.imageUrl;
            const tierColor = 
              art.tier === 'Primordial' ? 'text-yellow-400 border-yellow-950 bg-yellow-950/20' :
              art.tier === 'Heaven' ? 'text-portal border-cyan-950 bg-cyan-950/20 animate-pulse' :
              art.tier === 'Earth' ? 'text-green-400 border-green-950 bg-green-950/20' :
              'text-neutral-500 border-neutral-900 bg-neutral-950';

            return (
              <div key={art.id} className={`p-4 bg-neutral-950/80 border ${art.evolutionReady && !activePreview ? 'border-portal/50 shadow-[0_0_15px_rgba(4,172,255,0.15)]' : 'border-neutral-900'} rounded-lg hover:border-neutral-850 flex flex-col justify-between transition-all`}>
                <div>
                  <div className="relative group overflow-hidden rounded mb-3">
                    {/* Render relational artifact card portrait if available */}
                    {renderImageHistoryGallery(art.id, 'artifact', activeStory.imageHistory?.filter(img => img.entityId === art.id))}
                    {displayedImage ? (
                      <div className="h-32 w-full border border-neutral-900 relative">
                        <img src={displayedImage} alt={art.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        {activePreview && (
                          <div className="absolute inset-x-0 bottom-0 bg-neutral-950/90 text-[9px] font-mono font-bold uppercase py-1 text-center text-gold-accent border-t border-gold-accent/30 tracking-widest z-10 animate-pulse">
                            Evolution Preview
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-32 w-full border border-dashed border-neutral-800 flex flex-col items-center justify-center bg-black/40 text-neutral-600 rounded">
                        <Sword size={24} className="mb-2 opacity-50" />
                        <span className="text-[8px] tracking-widest font-mono uppercase">Unmanifested</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-sc font-bold text-signal text-sm tracking-wide">{art.name}</h4>
                    <span className={`text-[9px] border px-2 py-0.5 rounded font-mono uppercase tracking-widest ${tierColor}`}>
                      {art.tier}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-normal font-sans font-light italic mt-1 bg-void/50 p-2 border border-neutral-950 rounded">
                    "{art.description || 'Mystical values remain currently secret from mortal cultivators.'}"
                  </p>
                </div>

                <div className="border-t border-neutral-900 mt-4 pt-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-neutral-500 font-sans">
                      Bearer: <strong className="text-neutral-300 font-mono">{art.currentOwner || 'Unknown'}</strong>
                    </span>
                  </div>
                  
                  {art.evolutionReady && !activePreview && (
                    <div className="text-[9px] font-mono text-portal animate-pulse flex items-center gap-1.5 mb-1">
                      <Sparkles size={8} />
                      <span>Evolution Available: {art.evolutionReason || "Ownership Change"}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-1 gap-2 border-t border-neutral-900/50 pt-2">
                        <button
                          onClick={() => setDeletePrompt({ id: art.id, type: 'artifact', name: art.name })}
                          className="text-[9px] text-neutral-600 hover:text-human uppercase font-mono flex-shrink-0"
                        >
                          Shatter
                        </button>
                        <button
                          onClick={() => handleAwakenCardImage(art.id, 'artifact', art)}
                          disabled={isGenerating || !canGenerate}
                          className={`px-2 flex-grow py-1 rounded text-[8.5px] border uppercase font-mono tracking-wider flex items-center justify-center space-x-1 font-bold ${
                            isGenerating
                              ? 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-wait'
                              : !canGenerate
                              ? 'bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-75'
                              : art.evolutionReady
                              ? 'bg-portal border-portal text-void shadow-[0_0_10px_rgba(4,172,255,0.4)]'
                              : 'bg-void border-portal/15 text-portal hover:border-portal hover:bg-portal/5 hover:shadow-[0_0_8px_rgba(4,172,255,0.2)]'
                          }`}
                          title={!canGenerate ? "Progression required to awaken Relic." : ""}
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCcw size={8} className="animate-spin" />
                              <span>Forging...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={8} className={art.evolutionReady ? 'text-void' : 'text-gold-accent'} />
                              <span>{art.evolutionReady ? 'Awaken Evolution' : hasImage ? 'Requires Progression' : 'Generate Aura'}</span>
                            </>
                          )}
                        </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
