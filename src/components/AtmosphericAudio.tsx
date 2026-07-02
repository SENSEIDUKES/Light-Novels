import { useState, useEffect, useRef } from 'react';
import { createSceneMixEngine, type SceneMixEngine } from '@seihouse/audio-player';
import { SceneScoreEngine } from '../lib/audio/musicResolver';
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

  // BGM: the SEIHouse Audio Player scene-mix engine owns the decks and the
  // equal-power crossfades; this component only tells it what to play.
  const sceneMixRef = useRef<SceneMixEngine | null>(null);
  const scoreEngineRef = useRef(new SceneScoreEngine());
  const bgmIntensityRef = useRef<number>(1.0);

  useEffect(() => {
    if (!sceneMixRef.current) {
      const mix = createSceneMixEngine({ loop: true });
      // Apply the saved volume/mute state before anything can play, so the
      // first crossfade never bursts in at the engine's default level.
      const isActuallyMuted = isMuted || currentScreen !== 'reader';
      mix.setMuted(isActuallyMuted);
      mix.setLevel(isActuallyMuted ? 0 : (volume * 0.5 * bgmIntensityRef.current));
      sceneMixRef.current = mix;
    }
    return () => {
      sceneMixRef.current?.dispose();
      sceneMixRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncBgmVolumes = () => {
    const mix = sceneMixRef.current;
    if (!mix) return;
    const isActuallyMuted = isMuted || currentScreen !== 'reader';
    mix.setMuted(isActuallyMuted);
    mix.setLevel(isActuallyMuted ? 0 : (volume * 0.5 * bgmIntensityRef.current));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            } catch {}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted, atmosphere, currentScreen]);

  function stopAll() {
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch {}
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

  const createNoiseBuffer = (ctx: AudioContext, _type: 'white' | 'pink') => {
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
               if (newTrack && newTrack.url && sceneMixRef.current) {
                 // The engine no-ops on the already-active track, parks the
                 // incoming deck past leading silence, and runs an
                 // equal-power crossfade between the scores.
                 sceneMixRef.current.crossfadeTo({
                   id: newTrack.id,
                   title: newTrack.id,
                   artist: 'SEIHouse',
                   audioFile: newTrack.url,
                 });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted, volume, currentScreen]); // Observe changes to Mute preference directly

  // Headless rendering to prevent blocking menu options
  return null;
}

