import React, { useState, useEffect, useRef } from 'react';

type AtmosphereType = 'none' | 'wind' | 'rain' | 'temple';

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
  const windNodesRef = useRef<any>(null);
  const rainNodesRef = useRef<any>(null);
  const bellIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    }

    return () => {
      stopAll();
    };
  }, [isMuted, atmosphere, volume]);

  const stopAll = () => {
    if (windNodesRef.current) {
      try {
        windNodesRef.current.source.stop();
        windNodesRef.current.source.disconnect();
      } catch (e) {}
      windNodesRef.current = null;
    }
    if (rainNodesRef.current) {
      try {
        rainNodesRef.current.source.stop();
        rainNodesRef.current.source.disconnect();
      } catch (e) {}
      rainNodesRef.current = null;
    }
    if (bellIntervalRef.current) {
      clearInterval(bellIntervalRef.current);
      bellIntervalRef.current = null;
    }
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
    windNodesRef.current = { source, lfo, filter };
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
    rainNodesRef.current = { source, filter };
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
    bellIntervalRef.current = setInterval(() => {
      if (Math.random() > 0.3) {
          triggerBell(ctx);
      }
    }, 10000);
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

  const triggerChime = (ctx: AudioContext) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); 
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5); 

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  };

  // Listen to narrative scale triggers and adjust atmosphere/volume dynamically
  useEffect(() => {
    const handleCue = (e: any) => {
      // If manually muted by user, absolutely do not play or change state!
      if (isMuted) return;

      const cue = e.detail;
      if (cue.type === 'narrative.metadata.signature') {
        const ctx = initAudioCtx();
        triggerChime(ctx);
        const meta = cue.metadata || cue.value;
        
        if (meta) {
           if (typeof meta.intensity === 'number') {
             setVolume(Math.max(0.1, Math.min(1.0, meta.intensity)));
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
          } else {
            setAtmosphere('none');
          }
        }
      }
    };
    
    window.addEventListener('narrative-cue', handleCue);
    return () => window.removeEventListener('narrative-cue', handleCue);
  }, [isMuted]); // Observe changes to Mute preference directly

  // Headless rendering to prevent blocking menu options
  return null;
}
