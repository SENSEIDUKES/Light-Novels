import React, { useState } from 'react';
import { 
  Users, MapPin, Sparkles, BookMarked, Eye, Trash2, HelpCircle, Compass, Award, RefreshCcw, Plus, Download, Lock, Play, Square, Loader2, Volume2
} from 'lucide-react';
import { Character, Location } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentBadge } from '../AgentBadge';
import { AGENTS } from '../../lib/agents';
import { useCodex } from './CodexContext';
import { useAppStore } from '../../store/useAppStore';
import { LivingCodexImageGallery } from './LivingCodexImageGallery';
import { useCodexVoiceCards } from '../../hooks/useCodexVoiceCards';
import { useCodexLocations } from '../../hooks/useCodexLocations';
import { useCodexCharacterEditing } from '../../hooks/useCodexCharacterEditing';
import { handleDownload } from '../../utils/downloadUtils';


interface LivingCodexCharactersProps {
  charsToRender: Character[];
  locationsToRender: Location[];
  setDeletePrompt: (prompt: any) => void;
  selectedNodeChar: Character | null;
  setSelectedNodeChar: (c: Character | null) => void;
}

export function LivingCodexCharacters({
  charsToRender,
  locationsToRender,
  setDeletePrompt,
  selectedNodeChar,
  setSelectedNodeChar
}: LivingCodexCharactersProps) {
  const { 
    memory, 
    activeStory, 
    onUpdateMemory, 
    generatingId, 
    previews, 
    handleAwakenCardImage,
    getPowerRankScore
  } = useCodex();

  const userProfile = useAppStore(state => state.userProfile);
  const isHubStory = activeStory?.id ? (
    activeStory.id.startsWith('demo-matrix-') || 
    activeStory.id.startsWith('challenge-') || 
    activeStory.id.includes('demo-matrix-') || 
    activeStory.id.includes('challenge-')
  ) : false;
  const isFreeUser = !userProfile || !userProfile.premiumTier || userProfile.premiumTier === 'mortal';
  const isFreeUserOnHubStory = isFreeUser && isHubStory;

  const [charViewStyle, setCharViewStyle] = useState<'cards' | 'profiles'>('cards');
  const {
    generatingVoiceId,
    playingVoiceId,
    handleGenerateVoiceCard,
    handlePlayVoice,
    handleStopVoice,
  } = useCodexVoiceCards({ memory, onUpdateMemory });

  const {
    showAddLocationForm,
    setShowAddLocationForm,
    newLocation,
    setNewLocation,
    handleAddLocation,
  } = useCodexLocations({ memory, onUpdateMemory });

  const {
    editingCharId,
    setEditingCharId,
    editingCharData,
    setEditingCharData,
    handleSaveCharEdit,
    beginCharEdit,
    addAbility,
    updateAbility,
    removeAbility,
  } = useCodexCharacterEditing({ memory, onUpdateMemory });

  return (
    <>
{/* PAGE 1: Character & Location Cards (Illustrated Profiles & Cards) */}
        
          <div className="space-y-6 animate-fadeIn" id="codex-characters-and-locations">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-3">
              <div>
                <h3 className="font-sc text-sm text-signal font-bold uppercase tracking-widest">Portraits</h3>
                <p className="text-[10px] text-neutral-500 font-sans">Toggle profiles and locations, awaken visual aura portraits directly from the Void.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setCharViewStyle('cards')}
                  className={`px-3 py-1 text-[10px] font-mono rounded border capitalize transition-all ${
                    charViewStyle === 'cards' ? 'bg-portal/10 text-portal border-portal-300' : 'text-neutral-500 border-neutral-900 hover:text-neutral-300'
                  }`}
                >
                  Illustrated Cards
                </button>
                <button
                  onClick={() => setCharViewStyle('profiles')}
                  className={`px-3 py-1 text-[10px] font-mono rounded border capitalize transition-all ${
                    charViewStyle === 'profiles' ? 'bg-portal/10 text-portal border-portal-300' : 'text-neutral-500 border-neutral-900 hover:text-neutral-300'
                  }`}
                >
                  Detailed Lists
                </button>
              </div>
            </div>

            {/* Sub-section: CHARACTER ILLUSTRATED CARDS VIEW */}
            {charViewStyle === 'cards' ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[11px] text-human tracking-widest font-sc font-bold uppercase mb-3">Divine Character Cards</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Character Cards Loop */}
                    {charsToRender.map((char) => {
                      const isGenerating = generatingId === char.id;
                      const hasImage = !!char.imageUrl;
                      const currentChapter = activeStory.currentChapterNumber || 1;
                      const hasAppeared = char.firstAppeared === undefined || char.firstAppeared <= currentChapter;
                      const cScore = (getPowerRankScore || (() => ({ score: 0, title: '' })))(char.powerLevel);
                      const activePreview = previews[char.id];
                      const canGenerate = hasAppeared && (!hasImage || char.evolutionReady) && !isFreeUserOnHubStory;
                      const displayedImage = activePreview ? activePreview.urls[activePreview.selectedIndex] : char.imageUrl;
                      
                      return (
                        <div 
                          key={char.id} 
                          className={`bg-neutral-950 border ${char.evolutionReady && !activePreview ? 'border-portal/50 shadow-[0_0_15px_rgba(4,172,255,0.15)]' : 'border-neutral-900'} hover:border-neutral-800 rounded-lg overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-lg relative`}
                        >
                          {/* Visual Stage illustration header */}
                          <div className="h-44 w-full bg-void relative flex items-center justify-center overflow-hidden border-b border-neutral-900 group">
                            <LivingCodexImageGallery 
                              entityId={char.id} 
                              type={char.isBeast ? 'beast' : 'character'} 
                              imageHistory={activeStory.imageHistory?.filter(img => img.entityId === char.id)} 
                            />
                            {displayedImage ? (
                              <>
                                <img 
                                  src={displayedImage} 
                                  alt={char.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-contain group-hover:scale-105 transition-all duration-500 brightness-95"
                                />
                                <button
                                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(displayedImage, `${char.name.toLowerCase().replace(/\s+/g, '_')}_portrait.png`);
                                  }}
                                  className="absolute bottom-2 right-2 z-20 bg-black/85 hover:bg-portal hover:text-void border border-neutral-900 hover:border-portal text-neutral-300 p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center gap-1 font-mono text-[8px] uppercase tracking-wider backdrop-blur cursor-pointer shadow-md"
                                  title="Download Portrait"
                                >
                                  <Download size={10} />
                                  <span>Get</span>
                                </button>
                              </>
                            ) : (
                              /* Abstract CSS Alchemical grid vector placeholder */
                              <div className="absolute inset-0 bg-gradient-to-b from-void via-human/10 to-void flex flex-col items-center justify-center p-4 text-center">
                                <div className="absolute inset-0 bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
                                <div className="w-14 h-14 rounded-full border border-neutral-800/60 bg-black flex items-center justify-center text-portal shadow-[0_0_15px_rgba(4,172,255,0.1)] relative mb-2">
                                  <Compass size={22} className="text-neutral-600 animate-spin-slow" />
                                  <div className="absolute inset-2 border border-dashed border-portal/20 rounded-full"></div>
                                </div>
                                <span className="text-[8px] text-neutral-500 font-mono tracking-widest uppercase">AURA UNMANIFESTED</span>
                              </div>
                            )}

                            {/* Status label floating top right */}
                            <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                              <div className="flex space-x-1">
                                {char.relevanceState && char.relevanceState.toLowerCase() !== 'active' && (
                                  <span className="text-[7.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900/80 text-neutral-400">
                                    {char.relevanceState}
                                  </span>
                                )}
                                <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                                  char.status === 'alive' ? 'bg-green-950/40 text-green-400 border-green-900' :
                                  char.status === 'deceased' ? 'bg-red-950/40 text-human border-red-900' :
                                  'bg-neutral-950 text-neutral-500 border-neutral-800'
                                }`}>
                                  {char.status}
                                </span>
                              </div>
                              {hasAppeared ? (
                                <span className="text-[7.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border bg-portal/10 text-portal border-portal/30 shadow-[0_0_8px_rgba(4,172,255,0.2)] backdrop-blur-sm flex items-center gap-1" title="Discovered in the story">
                                  <Compass size={8} /> Unlocked
                                </span>
                              ) : (
                                <span className="text-[7.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border bg-black/80 text-neutral-500 border-neutral-800 backdrop-blur-sm flex items-center gap-1" title="Requires further reading to manifest">
                                  <Lock size={8} /> Locked
                                </span>
                              )}
                            </div>

                            {/* Combat power ranking level index label floating top left */}
                            <div className="absolute top-2 left-2 flex items-center space-x-1 font-mono text-[8.5px] bg-black/80 px-1.5 py-0.5 rounded border border-neutral-850">
                              <Award size={10} className="text-yellow-500" />
                              <span className="text-neutral-300">Pwr:{cScore.score}</span>
                            </div>

                            {activePreview && (
                              <div className="absolute inset-x-0 bottom-0 bg-neutral-950/90 text-[9px] font-mono font-bold uppercase py-1 text-center text-gold-accent border-t border-gold-accent/30 tracking-widest z-10 animate-pulse">
                                Evolution Preview
                              </div>
                            )}
                          </div>

                          {/* Detail body */}
                          <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between">
                                <h5 className="font-sc font-medium text-signal text-sm">{char.name}</h5>
                                <span className="text-[9px] text-portal font-mono font-medium">{char.role.split(',')[0]}</span>
                              </div>
                              <p className="text-[10px] text-neutral-400 leading-normal font-sans italic mt-1 line-clamp-2">
                                "{char.description || 'Stature secrets kept by standard cause matrices.'}"
                              </p>
                              <div className="pt-2 text-[9.5px]">
                                <span className="text-neutral-500 block">Cultivation: <strong className="text-neutral-300 font-mono">{char.powerLevel || 'Ordinary'}</strong></span>
                                {char.faction && (
                                  <span className="text-neutral-500 block">Affiliation: <strong className="text-neutral-300 font-mono">{char.faction}</strong></span>
                                )}
                              </div>
                            </div>

                            {/* Voice Card Section */}
                            {char.signatureQuote && (
                              <div className="pt-2 pb-2 text-[10px] text-neutral-400 italic flex flex-col gap-2 relative">
                                <span>"{char.signatureQuote}"</span>
                                {char.voiceClipUrl ? (
                                  <button
                                    onClick={() => playingVoiceId === char.id ? handleStopVoice() : handlePlayVoice(char.voiceClipUrl!, char.id)}
                                    className="flex items-center gap-1.5 self-start text-[9px] text-portal uppercase tracking-wider font-mono hover:text-portal/80 transition-colors"
                                  >
                                    {playingVoiceId === char.id ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                                    <span>{playingVoiceId === char.id ? 'Stop Voice' : 'Play Voice'}</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleGenerateVoiceCard(char)}
                                    disabled={generatingVoiceId === char.id}
                                    className="flex items-center gap-1.5 self-start text-[9px] text-human uppercase tracking-wider font-mono hover:text-human/80 transition-colors disabled:opacity-50"
                                  >
                                    {generatingVoiceId === char.id ? <Loader2 size={10} className="animate-spin" /> : <Volume2 size={10} />}
                                    <span>{generatingVoiceId === char.id ? 'Manifesting Voice...' : 'Generate Voice'}</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Action: Forge visual aura portrait */}
                            <div className="pt-3 border-t border-neutral-950 flex flex-col gap-2">
                              {char.evolutionReady && !activePreview && (
                                <div className="text-[9px] font-mono text-portal animate-pulse flex items-center gap-1.5 mb-1 px-1">
                                  <Sparkles size={8} />
                                  <span>Evolution Available: {char.evolutionReason || "New Breakthrough"}</span>
                                </div>
                              )}
                              <button
                                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleAwakenCardImage(char.id, char.isBeast ? 'beast' : 'character', char as any)}
                                disabled={isGenerating || !canGenerate}
                                className={`w-full py-1.5 rounded text-[9px] uppercase font-mono tracking-widest flex items-center justify-center space-x-1 border font-bold transition-all ${
                                  isGenerating
                                    ? 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-wait'
                                    : !canGenerate
                                    ? 'bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-75'
                                    : char.evolutionReady
                                    ? 'bg-portal border-portal text-void shadow-[0_0_10px_rgba(4,172,255,0.4)]'
                                    : 'bg-void border-portal/15 text-portal hover:border-portal hover:bg-portal/5 hover:shadow-[0_0_8px_rgba(4,172,255,0.2)]'
                                }`}
                                title={!hasAppeared ? "Unlock manifestation by encountering them in the story." : isFreeUserOnHubStory ? "Please Ascend to the Inner Sect to customize this original codex portrait." : !canGenerate ? "Evolution requires further story progression." : ""}
                              >
                                  {isGenerating ? (
                                    <>
                                      <img src={AGENTS.VERSA.logoUrl} className="w-4 h-4 object-contain animate-pulse" alt="VERSA" />
                                      <span>VERSA is working...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles size={10} className={char.evolutionReady ? 'text-void' : 'text-portal'} />
                                      <span>
                                        {!hasAppeared 
                                          ? 'Undiscovered' 
                                          : isFreeUserOnHubStory 
                                          ? (hasImage ? 'Portrait Active' : 'Portrait Locked (Free)') 
                                          : char.evolutionReady 
                                          ? 'Awaken Evolution' 
                                          : hasImage 
                                          ? 'Requires Progression' 
                                          : 'Awaken Portrait'}
                                      </span>
                                    </>
                                  )}
                                </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-section: DYNAMIC GEOLOCATION / SCENERY CARDS */}
                <div>
                  <div className="flex items-center justify-between mb-3 border-t border-neutral-900 pt-5">
                    <h4 className="text-[11px] text-human tracking-widest font-sc font-bold uppercase">World Geolocation Vistas</h4>
                  </div>

                  {/* Form to manual add location */}
                  {showAddLocationForm && (
                    <form onSubmit={handleAddLocation} className="mb-6 p-4 bg-neutral-950 border border-neutral-900 rounded-lg space-y-3 animate-fadeIn text-xs max-w-lg">
                      <h4 className="font-sc font-extrabold text-xs text-human tracking-wider uppercase">Chart Unexplored domain node</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-fx4uxyo">Domain Name</label>
                          <input 
                            type="text"
                            value={newLocation.name}
                            onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                            placeholder="e.g. Primordial Fog Valley"
                            className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs"
                            required id="a11y-control-fx4uxyo"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-1sbu7vi">Broader Realm</label>
                          <input 
                            type="text"
                            value={newLocation.realm}
                            onChange={(e) => setNewLocation({ ...newLocation, realm: e.target.value })}
                            placeholder="e.g. Heavenly Realm"
                            className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs" id="a11y-control-1sbu7vi"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-1" htmlFor="a11y-control-b5lg9hw">Safety Index</label>
                          <select
                            value={newLocation.safetyLevel}
                            onChange={(e) => setNewLocation({ ...newLocation, safetyLevel: e.target.value })}
                            className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs" id="a11y-control-b5lg9hw"
                          >
                            <option value="Safe">Safe Haven (Protected)</option>
                            <option value="Dangerous">Dangerous (Demons)</option>
                            <option value="Lethal">Lethal (Forbidden Zone)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-1 font-sc" htmlFor="a11y-control-s3gbkn3">Description Atmosphere</label>
                          <input 
                            type="text"
                            value={newLocation.description}
                            onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                            placeholder="e.g. Floating islands dripping celestial water..."
                            className="bg-neutral-900 border border-neutral-800 text-signal p-2 rounded w-full text-xs" id="a11y-control-s3gbkn3"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 pt-1">
                        <button type="button"  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowAddLocationForm(false)} className="text-neutral-500">Cancel</button>
                        <button type="submit" className="bg-portal text-void font-bold px-3 py-1 rounded font-sc uppercase text-[10px] tracking-wider">Formulate</button>
                      </div>
                    </form>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {!locationsToRender || locationsToRender.length === 0 ? (
                      <div className="col-span-3 text-center py-10 border border-dashed border-neutral-900 rounded bg-neutral-950/20 text-xs text-neutral-500 italic">
                        No geographic realms known. Continue reading or formulate a custom domain above!
                      </div>
                    ) : (
                      locationsToRender.map((loc) => {
                        const isGenerating = generatingId === loc.id;
                        const hasImage = !!loc.imageUrl;
                        const currentChapter = activeStory.currentChapterNumber || 1;
                        const hasAppeared = loc.firstAppeared === undefined || loc.firstAppeared <= currentChapter;
                        const activePreview = previews[loc.id];
                        const canGenerate = hasAppeared && (!hasImage || loc.evolutionReady) && !isFreeUserOnHubStory;
                        const displayedImage = activePreview ? activePreview.urls[activePreview.selectedIndex] : loc.imageUrl;

                        return (
                          <div key={loc.id} className={`bg-neutral-950 border ${loc.evolutionReady && !activePreview ? 'border-portal/50 shadow-[0_0_15px_rgba(4,172,255,0.15)]' : 'border-neutral-900'} hover:border-neutral-800 rounded-lg overflow-hidden flex flex-col justify-between group transition-all duration-300`}>
                            {/* Location Scenery Header */}
                            <div className="h-36 w-full bg-void relative flex items-center justify-center overflow-hidden border-b border-neutral-900 group">
                              <LivingCodexImageGallery 
                                entityId={loc.id} 
                                type="location" 
                                imageHistory={activeStory.imageHistory?.filter(img => img.entityId === loc.id)} 
                              />
                              {displayedImage ? (
                               <>
                                  <img 
                                    src={displayedImage} 
                                    alt={loc.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-contain group-hover:scale-105 transition-all duration-500 brightness-90"
                                  />
                                  <button
                                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(displayedImage, `${loc.name.toLowerCase().replace(/\s+/g, '_')}_landscape.png`);
                                    }}
                                    className="absolute bottom-2 right-2 z-20 bg-black/85 hover:bg-portal hover:text-void border border-neutral-900 hover:border-portal text-neutral-300 p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center gap-1 font-mono text-[8px] uppercase tracking-wider backdrop-blur cursor-pointer shadow-md"
                                    title="Download Scenery Vista"
                                  >
                                    <Download size={10} />
                                    <span>Get</span>
                                  </button>
                                </>
                              ) : (
                                <div className="absolute inset-0 bg-gradient-to-b from-void via-portal/5 to-void flex flex-col items-center justify-center p-3 text-center">
                                  <div className="absolute inset-0 bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:12px_12px] opacity-40"></div>
                                  <Compass size={18} className="text-neutral-800 mb-1" />
                                  <span className="text-[7.5px] text-neutral-600 font-mono tracking-wider">LANDSCAPE GEOLOCK EMPTY</span>
                                </div>
                              )}

                              {/* Safety index rating badge */}
                              <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                <span className={`text-[7.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                                  loc.safetyLevel === 'Safe' ? 'bg-green-950/30 text-green-400 border-green-900' :
                                  loc.safetyLevel === 'Dangerous' ? 'bg-yellow-950/30 text-yellow-500 border-yellow-900' :
                                  'bg-red-950/30 text-human border-red-900 animate-pulse'
                                }`}>
                                  {loc.safetyLevel}
                                </span>
                                {hasAppeared ? (
                                  <span className="text-[7.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border bg-portal/10 text-portal border-portal/30 shadow-[0_0_8px_rgba(4,172,255,0.2)] backdrop-blur-sm flex items-center gap-1" title="Discovered in the story">
                                    <Compass size={8} /> Unlocked
                                  </span>
                                ) : (
                                  <span className="text-[7.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border bg-black/80 text-neutral-500 border-neutral-800 backdrop-blur-sm flex items-center gap-1" title="Requires further reading to manifest">
                                    <Lock size={8} /> Locked
                                  </span>
                                )}
                              </div>

                              {/* Realm indicator top left */}
                              {loc.realm && (
                                <span className="absolute top-2 left-2 text-[7.5px] font-mono bg-black/80 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-850">
                                  {loc.realm}
                                </span>
                              )}

                              {activePreview && (
                                <div className="absolute inset-x-0 bottom-0 bg-neutral-950/90 text-[9px] font-mono font-bold uppercase py-1 text-center text-gold-accent border-t border-gold-accent/30 tracking-widest z-10 animate-pulse">
                                  Evolution Preview
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                              <div>
                                <h5 className="font-sc font-medium text-signal text-xs flex justify-between">
                                  <span>{loc.name}</span>
                                </h5>
                                <p className="text-[10px] text-neutral-400 leading-normal font-sans italic mt-1 line-clamp-2">
                                  "{loc.description || 'Spatial atmospheric arrays remain closed from investigation.'}"
                                </p>
                              </div>

                              <div className="pt-3 border-t border-neutral-950 flex flex-col gap-2">
                                {loc.evolutionReady && !activePreview && (
                                  <div className="text-[9px] font-mono text-portal animate-pulse flex items-center gap-1.5 mb-1 px-1">
                                    <Sparkles size={8} />
                                    <span>Evolution Available: {loc.evolutionReason || "Atmosphere Shift"}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setDeletePrompt({ id: loc.id, type: 'location', name: loc.name })}
                                    className="text-[9px] text-neutral-600 hover:text-human uppercase font-mono flex-shrink-0"
                                  >
                                    Purge Node
                                  </button>
                                   <button
                                    onClick={() => handleAwakenCardImage(loc.id, 'location', loc as any)}
                                    disabled={isGenerating || !canGenerate}
                                    className={`px-2 flex-grow py-1 rounded text-[8.5px] border uppercase font-mono tracking-wider flex items-center justify-center space-x-1 font-bold ${
                                      isGenerating
                                        ? 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-wait'
                                        : !canGenerate
                                        ? 'bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-75'
                                        : loc.evolutionReady
                                        ? 'bg-portal border-portal text-void shadow-[0_0_10px_rgba(4,172,255,0.4)]'
                                        : 'bg-void border-portal/15 text-portal hover:border-portal hover:bg-portal/5 hover:shadow-[0_0_8px_rgba(4,172,255,0.2)]'
                                    }`}
                                    title={!hasAppeared ? "Unlock manifestation by encountering it in the story." : isFreeUserOnHubStory ? "Please Ascend to the Inner Sect to customize this original scenery portrait." : !canGenerate ? "Progression required to awaken further vistas." : ""}
                                  >
                                        {isGenerating ? (
                                          <>
                                            <RefreshCcw size={8} className="animate-spin" />
                                            <span>VERSA...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Compass size={8} className={loc.evolutionReady ? 'text-void' : 'text-portal'} />
                                            <span>
                                              {!hasAppeared 
                                                ? 'Undiscovered' 
                                                : isFreeUserOnHubStory 
                                                ? (hasImage ? 'Vista Active' : 'Vista Locked (Free)') 
                                                : loc.evolutionReady 
                                                ? 'Awaken Evolution' 
                                                : hasImage 
                                                ? 'Requires Progression' 
                                                : 'Awaken Vistas'}
                                            </span>
                                          </>
                                        )}
                                      </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Profiles Detailed loop fallback list */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {charsToRender.map((char) => {
                  const isEditing = editingCharId === char.id;
                  const charStatusColor = 
                    char.status === 'alive' ? 'text-green-400 border-green-950 bg-green-950/20' :
                    char.status === 'deceased' ? 'text-human border-red-950 bg-red-950/20 line-through' :
                    char.status === 'ascended' ? 'text-portal border-cyan-950 bg-cyan-950/20' :
                    'text-neutral-500 border-neutral-900 bg-neutral-950';

                  return (
                    <div key={char.id} className="bg-neutral-950/40 border border-neutral-900 p-4 rounded-lg flex flex-col justify-between relative">
                      <div className="absolute top-4 right-4 flex space-x-1 items-center">
                        {char.relevanceState && char.relevanceState.toLowerCase() !== 'active' && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900/50 text-neutral-400 font-mono uppercase">
                            {char.relevanceState}
                          </span>
                        )}
                        <span className={`text-[9px] px-2 py-0.5 rounded border font-mono ${charStatusColor}`}>
                          {char.status}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-sc font-medium text-signal text-sm">{char.name}</h4>
                        <span className="text-[10px] text-portal uppercase tracking-wider block">{char.role}</span>
                        <p className="text-[11px] text-neutral-400 font-sans italic mt-2 leading-relaxed">"{char.description}"</p>
                        {char.signatureQuote && (
                          <div className="mt-2 text-[10px] text-neutral-300 italic border-l border-portal/30 pl-2">
                            "{char.signatureQuote}"
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="bg-black/95 absolute inset-0 p-4 rounded-lg flex flex-col z-10 text-xs text-neutral-300 overflow-y-auto">
                          <div className="space-y-4 flex-1">
                            <h5 className="font-sc font-bold uppercase text-portal">Refine {char.name}'s Soul Aura</h5>
                            
                            {/* Basic Info */}
                            <div className="space-y-2">
                              <div>
                                <label className="text-[9px] text-neutral-500 uppercase block mb-0.5" htmlFor={`power-${char.id}`}>Cultivation Realm</label>
                                <input 
                                  type="text"
                                  value={editingCharData.powerLevel || ''}
                                  onChange={(e) => setEditingCharData({ ...editingCharData, powerLevel: e.target.value })}
                                  className="bg-neutral-900 border border-neutral-850 p-1 w-full text-xs text-signal" id={`power-${char.id}`}
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-neutral-500 uppercase block mb-0.5" htmlFor={`faction-${char.id}`}>Sect Affiliation</label>
                                <input 
                                  type="text"
                                  value={editingCharData.faction || ''}
                                  onChange={(e) => setEditingCharData({ ...editingCharData, faction: e.target.value })}
                                  className="bg-neutral-900 border border-neutral-850 p-1 w-full text-xs text-signal" id={`faction-${char.id}`}
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-neutral-500 uppercase block mb-0.5" htmlFor={`quote-${char.id}`}>Signature Quote</label>
                                <textarea
                                  value={editingCharData.signatureQuote || ''}
                                  onChange={(e) => setEditingCharData({ ...editingCharData, signatureQuote: e.target.value })}
                                  className="bg-neutral-900 border border-neutral-850 p-1 w-full text-xs text-signal min-h-[40px] resize-none" id={`quote-${char.id}`}
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-neutral-500 uppercase block mb-0.5" htmlFor={`status-${char.id}`}>Current Status</label>
                                <select 
                                  value={editingCharData.status || char.status}
                                  onChange={(e) => setEditingCharData({ ...editingCharData, status: e.target.value as Character['status'] })}
                                  className="bg-neutral-900 border border-neutral-850 p-1 w-full text-xs text-signal" id={`status-${char.id}`}
                                >
                                  <option value="alive">Alive</option>
                                  <option value="deceased">Deceased</option>
                                  <option value="unknown">Unknown</option>
                                  <option value="ascended">Ascended</option>
                                </select>
                              </div>
                            </div>

                            {/* Ability Ledger */}
                            <div className="pt-4 border-t border-neutral-900">
                              <div className="flex justify-between items-center mb-2">
                                <h6 className="font-sc font-bold uppercase text-portal text-[10px]">Ability Ledger</h6>
                                <button
                                  type="button"
                                  onClick={addAbility}
                                  className="text-[9px] flex items-center space-x-1 text-neutral-400 hover:text-portal transition-colors font-sc uppercase"
                                >
                                  <Plus size={10} />
                                  <span>Add</span>
                                </button>
                              </div>
                              
                              <div className="space-y-3">
                                {editingCharData.abilitiesList?.map((ability) => (
                                  <div key={ability.id} className="bg-neutral-900/50 p-2 rounded border border-neutral-800 space-y-2">
                                    <div className="flex justify-between items-center">
                                      <input
                                        type="text"
                                        placeholder="Ability Name"
                                        value={ability.name}
                                        onChange={(e) => updateAbility(ability.id, { name: e.target.value })}
                                        className="bg-transparent border-b border-neutral-700 p-0.5 text-xs text-signal focus:border-portal outline-none w-2/3 font-sc"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeAbility(ability.id)}
                                        className="text-human/60 hover:text-human p-1"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </div>
                                    <textarea
                                      placeholder="Description"
                                      value={ability.description}
                                      onChange={(e) => updateAbility(ability.id, { description: e.target.value })}
                                      className="bg-neutral-950 border border-neutral-850 p-1 w-full text-[10px] text-neutral-300 min-h-[40px] resize-none"
                                    />
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label htmlFor={`ability-${ability.id}-source`} className="text-[8px] text-neutral-500 uppercase">Source</label>
                                        <input
                                          id={`ability-${ability.id}-source`}
                                          type="text"
                                          value={ability.source || ''}
                                          onChange={(e) => updateAbility(ability.id, { source: e.target.value })}
                                          className="bg-neutral-950 border border-neutral-850 p-1 w-full text-[10px] text-neutral-300"
                                        />
                                      </div>
                                      <div>
                                        <label htmlFor={`ability-${ability.id}-cost`} className="text-[8px] text-neutral-500 uppercase">Cost</label>
                                        <input
                                          id={`ability-${ability.id}-cost`}
                                          type="text"
                                          value={ability.cost || ''}
                                          onChange={(e) => updateAbility(ability.id, { cost: e.target.value })}
                                          className="bg-neutral-950 border border-neutral-850 p-1 w-full text-[10px] text-neutral-300"
                                        />
                                      </div>
                                      <div>
                                        <label htmlFor={`ability-${ability.id}-limits`} className="text-[8px] text-neutral-500 uppercase">Limits</label>
                                        <input
                                          id={`ability-${ability.id}-limits`}
                                          type="text"
                                          value={ability.limits || ''}
                                          onChange={(e) => updateAbility(ability.id, { limits: e.target.value })}
                                          className="bg-neutral-950 border border-neutral-850 p-1 w-full text-[10px] text-neutral-300"
                                        />
                                      </div>
                                      <div>
                                        <label htmlFor={`ability-${ability.id}-acq`} className="text-[8px] text-neutral-500 uppercase">Acq. Chapter</label>
                                        <input
                                          id={`ability-${ability.id}-acq`}
                                          type="number"
                                          value={ability.acquiredChapter !== undefined ? ability.acquiredChapter : ''}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            updateAbility(ability.id, { acquiredChapter: isNaN(val) ? undefined : val });
                                          }}
                                          className="bg-neutral-950 border border-neutral-850 p-1 w-full text-[10px] text-neutral-300"
                                        />
                                      </div>
                                      <div>
                                        <label htmlFor={`ability-${ability.id}-mastery`} className="text-[8px] text-neutral-500 uppercase">Mastery Level</label>
                                        <input
                                          id={`ability-${ability.id}-mastery`}
                                          type="text"
                                          value={ability.masteryLevel || ''}
                                          onChange={(e) => updateAbility(ability.id, { masteryLevel: e.target.value })}
                                          className="bg-neutral-950 border border-neutral-850 p-1 w-full text-[10px] text-neutral-300"
                                        />
                                      </div>
                                      <div>
                                        <label htmlFor={`ability-${ability.id}-lastUsed`} className="text-[8px] text-neutral-500 uppercase">Last Used Ch.</label>
                                        <input
                                          id={`ability-${ability.id}-lastUsed`}
                                          type="number"
                                          value={ability.lastUsedChapter !== undefined ? ability.lastUsedChapter : ''}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            updateAbility(ability.id, { lastUsedChapter: isNaN(val) ? undefined : val });
                                          }}
                                          className="bg-neutral-950 border border-neutral-850 p-1 w-full text-[10px] text-neutral-300"
                                        />
                                      </div>
                                      <div>
                                        <label htmlFor={`ability-${ability.id}-canon`} className="text-[8px] text-neutral-500 uppercase">Canon Status</label>
                                        <select
                                          id={`ability-${ability.id}-canon`}
                                          value={ability.canonStatus || 'confirmed'}
                                          onChange={(e) => updateAbility(ability.id, { canonStatus: e.target.value as any })}
                                          className="bg-neutral-950 border border-neutral-850 p-1 w-full text-[10px] text-neutral-300"
                                        >
                                          <option value="confirmed">Confirmed</option>
                                          <option value="rumored">Rumored</option>
                                          <option value="forbidden">Forbidden</option>
                                          <option value="lost">Lost</option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {(!editingCharData.abilitiesList || editingCharData.abilitiesList.length === 0) && (
                                  <div className="text-center text-[10px] text-neutral-500 italic py-2">
                                    No abilities recorded. Add one above.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-end space-x-2 pt-4 mt-auto border-t border-neutral-900 sticky bottom-0 bg-black/95">
                            <button  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setEditingCharId(null)} className="text-neutral-500 hover:text-neutral-300">Abort</button>
                            <button onClick={() => handleSaveCharEdit()} className="bg-portal text-void px-3 py-1 rounded font-bold font-sc uppercase tracking-wider text-[10px] hover:bg-portal-300 transition-colors shadow-lg shadow-portal/20">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-neutral-900 mt-4 pt-3 flex justify-between items-center text-[10px]">
                          <span className="text-neutral-500">Relation to MC: <strong className="text-neutral-300 font-medium">{char.relationshipToMC || 'Neutral'}</strong></span>
                          <button
                             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => beginCharEdit(char)}
                            className="text-neutral-500 hover:text-portal transition-colors font-sc uppercase"
                          >
                            Refine
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        
    </>
  );
}
