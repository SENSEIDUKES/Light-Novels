import React, { useState, useEffect, useRef } from 'react';
import { SceneScoreEngine, SceneAudioTrack } from '../lib/audio/musicResolver';
import { useAppStore } from '../store/useAppStore';
import { vibrate } from '../lib/vibration';

type AtmosphereType = 'none' | 'wind' | 'rain' | 'ocean' | 'crowd' | 'combat';
type FXType = 'footsteps' | 'footsteps_snow' | 'footsteps_wood' | 'footsteps_stone' | 'system_alert' | 'combat_hit';

export function AtmosphericAudio() {
  const currentScreen = useAppStore(state => state.currentScreen);
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('seihouse-audio-muted') === 'true';
  });
  const [atmosphere, setAtmosphere] = useState<AtmosphereType>(() => {
    return (localStorage.getItem('seihouse-audio-atmosphere') as AtmosphereType) || 'none';
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('seihouse-audio-volume');
    return saved ? parseFloat(saved) : 0.5;
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<AudioScheduledSourceNode[]>([]);
  const activeIntervalsRef = useRef<NodeJS.Timeout[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);

  // BGM refs
  const bgmPlayerA = useRef<HTMLAudioElement | null>(null);

  const bgmPlayerB = useRef<HTMLAudioElement | null>(null);
  const activeBgmPlayer = useRef<'A' | 'B'>('A');
  const scoreEngineRef = useRef(new SceneScoreEngine());
  const currentBgmTrackRef = useRef<SceneAudioTrack | null>(null);
  const bgmIntensityRef = useRef<number>(1.0);
  const bgmFadeInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize headless HTML5 Audio Element for BGM tracking
    if (!bgmPlayerA.current) {
      const audioA = new Audio();
      audioA.loop = true;
      audioA.crossOrigin = "anonymous";
      bgmPlayerA.current = audioA;

      const audioB = new Audio();
      audioB.loop = true;
      audioB.crossOrigin = "anonymous";
      bgmPlayerB.current = audioB;
    }
    return () => {
      bgmPlayerA.current?.pause();
      bgmPlayerB.current?.pause();
      if (bgmFadeInterval.current) clearInterval(bgmFadeInterval.current);
    };
  }, []);

  const syncBgmVolumes = () => {
    const isActuallyMuted = isMuted || currentScreen !== 'reader';
    const targetVolume = isActuallyMuted ? 0 : (volume * 0.5 * bgmIntensityRef.current);
    
    if (bgmPlayerA.current) bgmPlayerA.current.muted = isActuallyMuted;
    if (bgmPlayerB.current) bgmPlayerB.current.muted = isActuallyMuted;
    
    // Auto-sync active player volume if not currently cross-fading
    if (!bgmFadeInterval.current) {
      if (activeBgmPlayer.current === 'A' && bgmPlayerA.current) {
        bgmPlayerA.current.volume = targetVolume;
        if (bgmPlayerB.current) bgmPlayerB.current.volume = 0;
      } else if (activeBgmPlayer.current === 'B' && bgmPlayerB.current) {
        bgmPlayerB.current.volume = targetVolume;
        if (bgmPlayerA.current) bgmPlayerA.current.volume = 0;
      }
    }
  };

  // Sync state changes with localStorage and dispatch state event to UI
  useEffect(() => {
    localStorage.setItem('seihouse-audio-muted', String(isMuted));
    localStorage.setItem('seihouse-audio-atmosphere', atmosphere);
    localStorage.setItem('seihouse-audio-volume', String(volume));

    syncBgmVolumes();

    // Dispatch the state update event to other listening components (like ReaderChamber preferences tab)
    window.dispatchEvent(new CustomEvent('seihouse-audio-state', {
      detail: { isMuted, atmosphere, volume }
    }));
  }, [isMuted, atmosphere, volume, currentScreen]);

  // Handle incoming control events from UI
  useEffect(() => {
    const handleControl = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if (typeof customEvent.detail.isMuted === 'boolean') {
          setIsMuted(customEvent.detail.isMuted);
          if (!customEvent.detail.isMuted) {
            try {
              // Try to initialize/resume the AudioContext synchronously during user interaction
              // This is crucial for Safari and mobile browsers
              const ctx = initAudioCtx();
              if (ctx.state === 'suspended') {
                 ctx.resume().catch(console.warn);
              }
            } catch(e) {}
          }
        }
        if (customEvent.detail.atmosphere) {
          setAtmosphere(customEvent.detail.atmosphere as AtmosphereType);
        }
        if (typeof customEvent.detail.volume === 'number') {
          setVolume(customEvent.detail.volume);
        }
      }
    };
    window.addEventListener('seihouse-audio-control', handleControl);
    return () => window.removeEventListener('seihouse-audio-control', handleControl);
  }, []);

  const getDestination = (ctx: AudioContext) => {
    if (!masterGainRef.current) {
      masterGainRef.current = ctx.createGain();
      masterGainRef.current.connect(ctx.destination);
    }
    return masterGainRef.current;
  };

  // Keep master gain synced with user volume slider
  useEffect(() => {
    if (audioCtxRef.current && masterGainRef.current) {
      const targetGain = (isMuted || currentScreen !== 'reader') ? 0 : volume;
      masterGainRef.current.gain.setTargetAtTime(targetGain, audioCtxRef.current.currentTime, 0.1);
    }
  }, [volume, isMuted, currentScreen]);

  // Main background synthesizer loop
  useEffect(() => {
    // If user has muted, or if atmosphere is set to none, stop sound synthesis
    if (isMuted || atmosphere === 'none' || currentScreen !== 'reader') {
      stopAll();
      return;
    }

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    
    // Ensure master gain acts immediately when resuming
    if (!masterGainRef.current) {
      getDestination(ctx);
    }
    if (masterGainRef.current) {
       masterGainRef.current.gain.value = volume;
    }

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    stopAll();

    if (atmosphere === 'wind') {
      playWind(ctx);
    } else if (atmosphere === 'rain') {
      playRain(ctx);
    } else if (atmosphere === 'ocean') {
      playOceanWaves(ctx);
    } else if (atmosphere === 'crowd') {
      playCrowd(ctx);
    } else if (atmosphere === 'combat') {
      playCombatAmbience(ctx);
    }

    return () => {
      stopAll();
    };
  }, [isMuted, atmosphere, currentScreen]);

  function stopAll() {
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {}
    });
    activeSourcesRef.current = [];

    activeIntervalsRef.current.forEach(interval => clearInterval(interval));
    activeIntervalsRef.current = [];
  };

  const registerSource = (source: AudioScheduledSourceNode) => {
    activeSourcesRef.current.push(source);
  };

  const registerInterval = (interval: NodeJS.Timeout) => {
    activeIntervalsRef.current.push(interval);
  };

  const createNoiseBuffer = (ctx: AudioContext, type: 'white' | 'pink') => {
    const bufferSize = ctx.sampleRate * 2; // 2 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  function playWind(ctx: AudioContext) {
    const buffer = createNoiseBuffer(ctx, 'white');
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    // Modulate filter frequency to simulate wind howling
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1; // Slow variation
    
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 300;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.3; // Wind is soft

    source.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(getDestination(ctx));

    source.start();
    registerSource(source);
    registerSource(lfo);
  };

  function playRain(ctx: AudioContext) {
    const buffer = createNoiseBuffer(ctx, 'pink');
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.4;

    source.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(getDestination(ctx));

    source.start();
    registerSource(source);
  };

  function playCrowd(ctx: AudioContext) {
    const buffer = createNoiseBuffer(ctx, 'pink');
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 0.5;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 1.5;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 100;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.2;

    source.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    source.start();
    registerSource(source);
    registerSource(lfo);
  };

  function playCombatAmbience(ctx: AudioContext) {
    const buffer = createNoiseBuffer(ctx, 'pink');
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;

    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.2;

    source.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    source.start();
    registerSource(source);

    const intv = setInterval(() => {
      if (Math.random() > 0.6) {
        triggerCombatHit(ctx);
      }
    }, 2500);
    registerInterval(intv);
  };

  function playOceanWaves(ctx: AudioContext) {
    const buffer = createNoiseBuffer(ctx, 'pink');
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    // Wave crashing simulation
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08; // Slow ocean roll
    
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 600;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    // Volume swells
    const volLfo = ctx.createOscillator();
    volLfo.type = 'sine';
    volLfo.frequency.value = 0.08;

    const volLfoGain = ctx.createGain();
    volLfoGain.gain.value = 0.2;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.25;

    volLfo.connect(volLfoGain);
    volLfoGain.connect(masterGain.gain);
    volLfo.start();

    source.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(getDestination(ctx));

    source.start();
    registerSource(source);
    registerSource(lfo);
    registerSource(volLfo);
  };

  const triggerChime = (ctx: AudioContext) => {
    vibrate('chime');
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); 
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5); 

    osc.connect(gainNode);
    gainNode.connect(getDestination(ctx));

    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  };

  const triggerSystemAlert = (ctx: AudioContext) => {
    vibrate('softTap');
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(getDestination(ctx));

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const triggerFootstep = (ctx: AudioContext, material: 'generic' | 'snow' | 'wood' | 'stone' = 'generic') => {
    vibrate('footstep');
    const bufferSize = ctx.sampleRate * 0.1; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    
    if (material === 'snow') {
        filter.type = 'highpass';
        filter.frequency.value = 1500;
        // Snow has a longer crunchy tail
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
        }
    } else if (material === 'wood') {
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        
        // Add a low thud for wood
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.1);
        
        const thudGain = ctx.createGain();
        thudGain.gain.setValueAtTime(0.5, ctx.currentTime);
        thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        
        osc.connect(thudGain);
        thudGain.connect(getDestination(ctx));
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } else if (material === 'stone') {
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        filter.Q.value = 2; // slight ringing for stone
    } else {
        filter.type = 'lowpass';
        filter.frequency.value = 400;
    }

    const gainNode = ctx.createGain();
    gainNode.gain.value = material === 'snow' ? 0.3 : 0.6; // snow is a bit quieter

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(getDestination(ctx));

    source.start();
  };

  const triggerCombatHit = (ctx: AudioContext) => {
    vibrate('combatHit');
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(getDestination(ctx));

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  };

  const triggerQiSurge = (ctx: AudioContext) => {
    vibrate('surge');
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(50, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 1.5);
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 1.0);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    
    osc.connect(gainNode);
    gainNode.connect(getDestination(ctx));
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.5);
  };

  const triggerMajorHit = (ctx: AudioContext) => {
    vibrate('heavyTap');
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.5);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(getDestination(ctx));
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  };

  const triggerFateShift = (ctx: AudioContext) => {
    vibrate('shift');
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(750, ctx.currentTime + 2.0);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 8; // fast wobble
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 50;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 1.0);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);

    osc.connect(gainNode);
    gainNode.connect(getDestination(ctx));

    try {
      lfo.start(ctx.currentTime);
      osc.start(ctx.currentTime);
      lfo.stop(ctx.currentTime + 2.0);
      osc.stop(ctx.currentTime + 2.0);
    } catch (e) {
      console.error("Audio API warning on fate shift", e);
    }
  };

  function initAudioCtx() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Listen to narrative scale triggers and adjust atmosphere/volume dynamically
  useEffect(() => {
    const handleCue = (e: any) => {
      try {
        // If manually muted by user, or not in reader, absolutely do not play or change state!
        if (isMuted || currentScreen !== 'reader') return;

        const cue = e.detail;
        const ctx = initAudioCtx();

        if (cue.type === 'narrative.metadata.signature') {
          const meta = cue.metadata || cue.value;
          
          if (meta) {
             if (meta.powerShift && meta.powerShift > 0.6) {
                triggerQiSurge(ctx);
             } else if (meta.danger && meta.danger > 0.8 && meta.intensity && meta.intensity > 0.8) {
                triggerMajorHit(ctx);
             } else if (meta.tension && meta.tension > 0.8) {
                triggerFateShift(ctx);
             } else if (meta.playChime) {
               triggerChime(ctx);
             }

             if (meta.music) {
               const newTrack = scoreEngineRef.current.evaluateSceneContext(meta.music, meta.environment || []);
               if (newTrack && currentBgmTrackRef.current?.id !== newTrack.id) {
                 currentBgmTrackRef.current = newTrack;
                 const nextPlayerKey = activeBgmPlayer.current === 'A' ? 'B' : 'A';
                 const nextPlayer = nextPlayerKey === 'A' ? bgmPlayerA.current : bgmPlayerB.current;
                 const prevPlayer = activeBgmPlayer.current === 'A' ? bgmPlayerA.current : bgmPlayerB.current;
                 
                 if (nextPlayer && prevPlayer && newTrack.url) {
                   activeBgmPlayer.current = nextPlayerKey;
                   nextPlayer.src = newTrack.url;
                   nextPlayer.volume = 0;
                   nextPlayer.play().catch(console.warn);

                   const targetVolume = volume * 0.5 * bgmIntensityRef.current;
                   const fadeSteps = 20;
                   const fadeDuration = 2000;
                   const stepTime = fadeDuration / fadeSteps;
                   let step = 0;

                   if (bgmFadeInterval.current) clearInterval(bgmFadeInterval.current);
                   
                   bgmFadeInterval.current = setInterval(() => {
                     step++;
                     const t = step / fadeSteps;
                     nextPlayer.volume = Math.min(1, Math.max(0, targetVolume * t));
                     prevPlayer.volume = Math.min(1, Math.max(0, targetVolume * (1 - t)));
                     if (step >= fadeSteps) {
                       if (bgmFadeInterval.current) clearInterval(bgmFadeInterval.current);
                       bgmFadeInterval.current = null;
                       prevPlayer.pause();
                       prevPlayer.volume = 0;
                       nextPlayer.volume = targetVolume;
                     }
                   }, stepTime);
                 }
               }
             }

             if (typeof meta.intensity === 'number') {
               bgmIntensityRef.current = Math.max(0.1, Math.min(1.0, meta.intensity));
               syncBgmVolumes();
             }

             if (meta.environment?.includes('rain') || meta.sceneType === 'travel') {
               setAtmosphere('rain');
             } else if (meta.environment?.includes('ocean') || meta.environment?.includes('sea') || meta.environment?.includes('water')) {
               setAtmosphere('ocean');
             } else if (meta.mysticism && meta.mysticism > 0.5) {
               setAtmosphere('wind');
             } else if (meta.danger && meta.danger > 0.5) {
               setAtmosphere('wind');
             } else if (meta.environment?.includes('mountain')) {
               setAtmosphere('wind');
             }
          }
        } else if (cue.type === 'narrative.chapter.enter') {
          scoreEngineRef.current.resetScene();
          const meta = cue.value;
          if (meta) {
            if (typeof meta.intensity === 'number') {
              bgmIntensityRef.current = Math.max(0.2, Math.min(1.0, meta.intensity));
              syncBgmVolumes();
            }
            
            if (meta.element === 'water' && (meta.environment === 'sea' || meta.environment === 'ocean' || meta.environment === 'coast')) {
              setAtmosphere('ocean');
            } else if (meta.element === 'water' || meta.emotion === 'sorrow') {
              setAtmosphere('rain');
            } else if (meta.mysticism && meta.mysticism > 0.7) {
              setAtmosphere('wind');
            } else if (meta.danger && meta.danger > 0.6) {
              setAtmosphere('wind');
            } else if (meta.tension && meta.tension > 0.8) {
              setAtmosphere('wind');
            } else if (meta.theme === 'war' || meta.theme === 'combat' || meta.danger > 0.8) {
              setAtmosphere('combat');
            } else if (meta.theme === 'city' || meta.theme === 'festival' || meta.environment === 'city') {
              setAtmosphere('crowd');
            } else {
              setAtmosphere('none');
            }
          }
        } else if (cue.type === 'narrative.fx.play') {
            const fxType = cue.value as FXType;
            if (fxType === 'footsteps') {
                triggerFootstep(ctx, 'generic');
            } else if (fxType === 'footsteps_snow') {
                triggerFootstep(ctx, 'snow');
            } else if (fxType === 'footsteps_wood') {
                triggerFootstep(ctx, 'wood');
            } else if (fxType === 'footsteps_stone') {
                triggerFootstep(ctx, 'stone');
            } else if (fxType === 'system_alert') {
                triggerSystemAlert(ctx);
            } else if (fxType === 'combat_hit') {
                triggerCombatHit(ctx);
            }
        }
      } catch (err) {
        console.warn("Audio system error during cue handling (safely caught):", err);
      }
    };
    
    window.addEventListener('narrative-cue', handleCue);
    return () => window.removeEventListener('narrative-cue', handleCue);
  }, [isMuted, volume, currentScreen]); // Observe changes to Mute preference directly

  // Headless rendering to prevent blocking menu options
  return null;
}

