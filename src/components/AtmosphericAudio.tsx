import React, { useState, useEffect, useRef } from 'react';

type AtmosphereType = 'none' | 'wind' | 'rain' | 'temple' | 'crowd' | 'combat';
type FXType = 'footsteps' | 'footsteps_snow' | 'footsteps_wood' | 'footsteps_stone' | 'creature' | 'system_alert' | 'combat_hit';

export function AtmosphericAudio() {
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

  // Sync state changes with localStorage and dispatch state event to UI
  useEffect(() => {
    localStorage.setItem('seihouse-audio-muted', String(isMuted));
    localStorage.setItem('seihouse-audio-atmosphere', atmosphere);
    localStorage.setItem('seihouse-audio-volume', String(volume));

    // Dispatch the state update event to other listening components (like ReaderChamber preferences tab)
    window.dispatchEvent(new CustomEvent('seihouse-audio-state', {
      detail: { isMuted, atmosphere, volume }
    }));
  }, [isMuted, atmosphere, volume]);

  // Handle incoming control events from UI
  useEffect(() => {
    const handleControl = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if (typeof customEvent.detail.isMuted === 'boolean') {
          setIsMuted(customEvent.detail.isMuted);
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

  // Main background synthesizer loop
  useEffect(() => {
    // If user has muted, or if atmosphere is set to none, stop sound synthesis
    if (isMuted || atmosphere === 'none') {
      stopAll();
      return;
    }

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    stopAll();

    if (atmosphere === 'wind') {
      playWind(ctx);
    } else if (atmosphere === 'rain') {
      playRain(ctx);
    } else if (atmosphere === 'temple') {
      playWind(ctx); // Wind as background
      playTempleBells(ctx);
    } else if (atmosphere === 'crowd') {
      playCrowd(ctx);
    } else if (atmosphere === 'combat') {
      playCombatAmbience(ctx);
    }

    return () => {
      stopAll();
    };
  }, [isMuted, atmosphere, volume]);

  const stopAll = () => {
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

  const playWind = (ctx: AudioContext) => {
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
    masterGain.gain.value = volume * 0.3; // Wind is soft

    source.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    source.start();
    registerSource(source);
    registerSource(lfo);
  };

  const playRain = (ctx: AudioContext) => {
    const buffer = createNoiseBuffer(ctx, 'pink');
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;

    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.4;

    source.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    source.start();
    registerSource(source);
  };

  const playCrowd = (ctx: AudioContext) => {
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

  const playCombatAmbience = (ctx: AudioContext) => {
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

  const triggerBell = (ctx: AudioContext) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime); // Root note A4
    
    // Slight detune for a second oscillator to create beating (gong-like)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(442, ctx.currentTime);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.5, ctx.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 6); // Long decay

    osc.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc2.start();
    osc.stop(ctx.currentTime + 6);
    osc2.stop(ctx.currentTime + 6);
  };

  const playTempleBells = (ctx: AudioContext) => {
    // Initial bell
    triggerBell(ctx);
    // Random bell rings
    const intv = setInterval(() => {
      if (Math.random() > 0.3) {
          triggerBell(ctx);
      }
    }, 10000);
    registerInterval(intv);
  };

  const triggerChime = (ctx: AudioContext) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); 
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.2, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5); 

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  };

  const triggerSystemAlert = (ctx: AudioContext) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const triggerFootstep = (ctx: AudioContext, material: 'generic' | 'snow' | 'wood' | 'stone' = 'generic') => {
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
        thudGain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
        thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        
        osc.connect(thudGain);
        thudGain.connect(ctx.destination);
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
    gainNode.gain.value = volume * (material === 'snow' ? 0.3 : 0.6); // snow is a bit quieter

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start();
  };

  const triggerCreature = (ctx: AudioContext) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.8);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.8);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.5, ctx.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  };

  const triggerCombatHit = (ctx: AudioContext) => {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.5, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  const initAudioCtx = () => {
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
      // If manually muted by user, absolutely do not play or change state!
      if (isMuted) return;

      const cue = e.detail;
      const ctx = initAudioCtx();

      if (cue.type === 'narrative.metadata.signature') {
        const meta = cue.metadata || cue.value;
        
        if (meta) {
           if (typeof meta.intensity === 'number') {
             setVolume(Math.max(0.1, Math.min(1.0, meta.intensity)));
           }
           
           if (meta.playChime) {
             triggerChime(ctx);
           }

           if (meta.environment?.includes('rain') || meta.sceneType === 'travel') {
             setAtmosphere('rain');
           } else if (meta.mysticism && meta.mysticism > 0.5) {
             setAtmosphere('temple');
           } else if (meta.danger && meta.danger > 0.5) {
             setAtmosphere('wind');
           } else if (meta.environment?.includes('mountain')) {
             setAtmosphere('wind');
           }
        }
      } else if (cue.type === 'narrative.chapter.enter') {
        const meta = cue.value;
        if (meta) {
          if (typeof meta.intensity === 'number') {
            setVolume(Math.max(0.2, Math.min(1.0, meta.intensity)));
          }
          
          if (meta.element === 'water' || meta.emotion === 'sorrow') {
            setAtmosphere('rain');
          } else if (meta.mysticism && meta.mysticism > 0.7) {
            setAtmosphere('temple');
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
          } else if (fxType === 'creature') {
              triggerCreature(ctx);
          } else if (fxType === 'system_alert') {
              triggerSystemAlert(ctx);
          } else if (fxType === 'combat_hit') {
              triggerCombatHit(ctx);
          }
      }
    };
    
    window.addEventListener('narrative-cue', handleCue);
    return () => window.removeEventListener('narrative-cue', handleCue);
  }, [isMuted, volume]); // Observe changes to Mute preference directly

  // Headless rendering to prevent blocking menu options
  return null;
}

