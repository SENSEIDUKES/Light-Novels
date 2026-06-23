import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Loader2, Music, Square } from 'lucide-react';
import { Chapter, StoryWorld, VoiceClip, AudioManifest, StoryBlock } from '../types';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { resolveKokoroVoicePreset } from '../lib/voice/voiceResolver';

interface VoiceEditionPanelProps {
  selectedChapter: Chapter;
  activeStory: StoryWorld;
  onUpdateStory: (updatedStory: StoryWorld) => void;
}

export const VoiceEditionPanel: React.FC<VoiceEditionPanelProps> = ({ selectedChapter, activeStory, onUpdateStory }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlayingLive, setIsPlayingLive] = useState(false);
  const [isPlayingManifest, setIsPlayingManifest] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorCount, setErrorCount] = useState(0);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const stopLivePlaybackRef = useRef(false);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      stopLivePlaybackRef.current = true;
    };
  }, []);

  const manifest = selectedChapter.audioManifest;

  const handleGenerateAndStream = async () => {
    setIsGenerating(true);
    setIsPlayingLive(true);
    setErrorCount(0);
    stopLivePlaybackRef.current = false;
    
    try {
      const storage = getStorage();
      
      let blocks: StoryBlock[] = [];
      
      if (selectedChapter.blocks && selectedChapter.blocks.length > 0) {
        blocks = selectedChapter.blocks;
      } else if (selectedChapter.generatedContent) {
        const paragraphs = selectedChapter.generatedContent.split('\n\n');
        blocks = paragraphs.filter(p => !!p.trim()).map((p, i) => ({
          text: p,
          type: /^["“「]/.test(p.trim()) ? 'dialogue' : 'paragraph',
          id: `para-${i}`
        }));
      }

      if (blocks.length === 0) {
        throw new Error("No chapter content to generate voice for.");
      }

      setProgress({ current: 0, total: blocks.length });
      
      const clips: VoiceClip[] = [];
      const updatedCharacters = [...activeStory.memory.characters];
      let hasCharacterUpdates = false;

      const generateAll = async () => {
        for (let i = 0; i < blocks.length; i++) {
          if (stopLivePlaybackRef.current) break; // If user stopped, we can either halt or keep generating. Let's halt for cost savings if they stop.
          
          const block = blocks[i];
          const isDialogue = block.type === 'dialogue';
          
          let speakerVoice = 'am_puck';
          if (!isDialogue) {
            const preset = resolveKokoroVoicePreset({ mode: "narration", language: "en" });
            speakerVoice = preset.providerVoiceId;
          } else {
            const speakerName = block.metadata?.speakerName;
            const speakerRole = block.metadata?.speakerRole;
            const character = updatedCharacters.find(c => c.name === speakerName);

            const preset = resolveKokoroVoicePreset({
              mode: "dialogue",
              language: "en",
              speakerName: speakerName || character?.name,
              speakerRole: speakerRole || character?.role,
              savedVoicePresetId: character?.voicePresetId,
            });
            speakerVoice = preset.providerVoiceId;

            if (character && !character.voicePresetId) {
              const charIndex = updatedCharacters.findIndex(c => c.id === character!.id);
              if (charIndex !== -1) {
                updatedCharacters[charIndex] = { ...updatedCharacters[charIndex], voicePresetId: preset.id };
                hasCharacterUpdates = true;
              }
            }
          }
          
          try {
            const res = await fetch('/api/generate-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: block.text,
                speakerVoice,
                // Add these just in case we need to pass style info
                emotion: block.metadata?.emotion,
                intensity: block.metadata?.intensity
              })
            });
            
            if (!res.ok) {
              console.error(`Audio generation failed for block ${i}`);
              setErrorCount(prev => prev + 1);
              clips.push({ blockId: block.id, audioUrl: '', speakerVoice });
            } else {
              const { base64Audio } = await res.json();
              if (base64Audio) {
                const fileName = `voice-edition/${activeStory.id}/${selectedChapter.number}/${block.id}.wav`;
                const audioRef = ref(storage, fileName);
                await uploadString(audioRef, base64Audio, 'base64', { contentType: 'audio/wav' });
                const downloadUrl = await getDownloadURL(audioRef);
                clips.push({ blockId: block.id, audioUrl: downloadUrl, speakerVoice });
              } else {
                 clips.push({ blockId: block.id, audioUrl: '', speakerVoice });
              }
            }
          } catch (e) {
               console.error(e);
               setErrorCount(prev => prev + 1);
               clips.push({ blockId: block.id, audioUrl: '', speakerVoice });
          }
          setProgress({ current: i + 1, total: blocks.length });
        }

        // Only save manifest if we generated something
        const validClips = clips.filter(c => c.audioUrl);
        if (validClips.length > 0 && !stopLivePlaybackRef.current) {
           const newManifest: AudioManifest = {
             version: "1.0",
             language: "en-US",
             clips: validClips,
             generatedAt: Date.now()
           };

           const updatedStory: StoryWorld = {
             ...activeStory,
             memory: {
               ...activeStory.memory,
               characters: hasCharacterUpdates ? updatedCharacters : activeStory.memory.characters
             },
             arcs: activeStory.arcs.map(arc => ({
               ...arc,
               chapters: arc.chapters.map(ch => 
                 ch.number === selectedChapter.number ? { ...ch, audioManifest: newManifest } : ch
               )
             }))
           };
           onUpdateStory(updatedStory);
        }
        setIsGenerating(false);
        setIsPlayingLive(false);
      };

      const playQueue = async () => {
         let playIndex = 0;
         while (playIndex < blocks.length) {
            if (stopLivePlaybackRef.current) break;
            
            // Wait for next clip
            while (clips.length <= playIndex) {
               if (stopLivePlaybackRef.current) return;
               await new Promise(r => setTimeout(r, 200));
            }

            const clip = clips[playIndex];
            if (clip && clip.audioUrl) {
               await new Promise<void>((resolve) => {
                  if (stopLivePlaybackRef.current) return resolve();
                  
                  const audio = new Audio(clip.audioUrl);
                  activeAudioRef.current = audio;
                  audio.onended = () => resolve();
                  audio.onerror = () => resolve();
                  audio.play().catch(e => {
                     console.error("Playback error:", e);
                     resolve();
                  });
               });
            }
            playIndex++;
         }
         setIsPlayingLive(false);
      };

      // Run both concurrently
      generateAll();
      playQueue();

    } catch (e) {
      console.error(e);
      alert("Failed to generate voice edition.");
      setIsGenerating(false);
      setIsPlayingLive(false);
    }
  };

  const handleStopLivePlay = () => {
     stopLivePlaybackRef.current = true;
     if (activeAudioRef.current) {
        activeAudioRef.current.pause();
     }
     setIsPlayingLive(false);
     setIsPlayingManifest(false);
  };

  const handlePlayManifest = () => {
     if (!manifest || manifest.clips.length === 0) return;
     setIsPlayingManifest(true);
     stopLivePlaybackRef.current = false;
     
     let currentIdx = 0;
     const playNext = () => {
         if (stopLivePlaybackRef.current) return;
         if (currentIdx >= manifest.clips.length) {
            setIsPlayingManifest(false);
            return;
         }
         const clip = manifest.clips[currentIdx];
         const audio = new Audio(clip.audioUrl);
         activeAudioRef.current = audio;
         audio.onended = () => {
            currentIdx++;
            playNext();
         };
         audio.onerror = () => {
             currentIdx++;
             playNext();
         };
         audio.play().catch((err) => {
             console.error(err);
             currentIdx++;
             playNext();
         });
     };

     playNext();
  };

  return (
    <div className="my-8 max-w-2xl mx-auto border-t border-b border-neutral-900 py-6 px-4">
      <div className="flex flex-col items-center justify-center space-y-4">
        <Music className="text-portal opacity-50" size={24} />
        <h3 className="font-sc font-bold tracking-[0.2em] uppercase text-xs text-neutral-400">
          Aetherial Voice Edition
        </h3>
        
        {!manifest ? (
          <div className="text-center group">
            {isGenerating ? (
              <div className="flex flex-col items-center space-y-3">
                 <div className="flex items-center space-x-2">
                    <Loader2 className="animate-spin text-portal" size={20} />
                    <button 
                       onClick={handleStopLivePlay}
                       className="p-1 hover:text-red-400 text-neutral-400 transition-colors"
                       title="Stop"
                    >
                       <Square size={16} fill="currentColor" />
                    </button>
                 </div>
                 <p className="text-[10px] text-portal font-mono">
                    Synthesizing and playing stream... ({progress.current}/{progress.total})
                 </p>
                 {errorCount > 0 && (
                   <p className="text-[9px] text-red-500 font-mono">
                     {errorCount} block(s) experienced interference.
                   </p>
                 )}
              </div>
            ) : (
              <button
                onClick={handleGenerateAndStream}
                className="px-6 py-2.5 bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold uppercase tracking-wider rounded text-[10px] sm:text-xs hover:border-portal hover:text-portal transition-all outline-none"
              >
                Generate Voice Edition
              </button>
            )}
            {!isGenerating && (
              <p className="mt-3 text-[10px] text-neutral-600 max-w-sm mx-auto">
                Command the Akashic forces to permanently synthesize a reusable vocal performance of this chapter. Playback starts immediately.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center relative">
            {isPlayingManifest ? (
              <button
                 onClick={handleStopLivePlay}
                 className="px-8 py-3 bg-red-900/20 border border-red-500/50 text-red-400 font-bold uppercase tracking-widest rounded-full text-xs hover:bg-red-900/40 transition-all flex items-center space-x-2"
              >
                 <Square size={14} fill="currentColor" />
                 <span>Stop Voice Edition</span>
              </button>
            ) : (
              <button
                 onClick={handlePlayManifest}
                 className="px-8 py-3 bg-portal/10 border border-portal/50 text-portal font-bold uppercase tracking-widest rounded-full text-xs shadow-[0_0_15px_rgba(4,172,255,0.2)] hover:bg-portal hover:text-void transition-all flex items-center space-x-2"
              >
                 <Play size={14} fill="currentColor" />
                 <span>Play Voice Edition</span>
              </button>
            )}
            <p className="mt-3 text-[9px] text-neutral-500 font-mono">
              Vocals bound and saved on: {new Date(manifest.generatedAt).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

