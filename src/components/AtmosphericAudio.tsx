import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';

type AtmosphereType = 'none' | 'wind' | 'rain' | 'temple';

export function AtmosphericAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [atmosphere, setAtmosphere] = useState<AtmosphereType>('none');
  const [volume, setVolume] = useState(0.5);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const windNodesRef = useRef<any>(null);
  const rainNodesRef = useRef<any>(null);
  const bellIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isPlaying) {
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
  }, [isPlaying, atmosphere, volume]);

  const stopAll = () => {
    if (windNodesRef.current) {
      windNodesRef.current.source.stop();
      windNodesRef.current.source.disconnect();
      windNodesRef.current = null;
    }
    if (rainNodesRef.current) {
      rainNodesRef.current.source.stop();
      rainNodesRef.current.source.disconnect();
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

  useEffect(() => {
    const handleCue = (e: any) => {
      const cue = e.detail;
      if (cue.type === 'narrative.metadata.signature') {
        const ctx = initAudioCtx();
        triggerChime(ctx);
      }
    };
    
    window.addEventListener('narrative-cue', handleCue);
    return () => window.removeEventListener('narrative-cue', handleCue);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center bg-black/80 border border-neutral-900 rounded-full px-2 py-1 shadow-lg backdrop-blur-md">
      <button 
        onClick={() => setIsPlaying(!isPlaying)}
        className={`p-2 rounded-full transition-colors ${isPlaying ? 'text-human' : 'text-neutral-500 hover:text-signal'}`}
        title={isPlaying ? "Mute Atmosphere" : "Play Atmosphere"}
      >
        {isPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>
      
      {isPlaying && (
        <div className="flex items-center space-x-1 pl-1 pr-2 border-l border-neutral-800 ml-1">
            <select 
                value={atmosphere}
                onChange={(e) => setAtmosphere(e.target.value as AtmosphereType)}
                className="bg-transparent text-xs text-neutral-400 focus:outline-none focus:text-signal font-mono cursor-pointer"
            >
                <option className="bg-void" value="none">Silence</option>
                <option className="bg-void" value="wind">Howling Wind</option>
                <option className="bg-void" value="rain">Heavy Rain</option>
                <option className="bg-void" value="temple">Temple Bells</option>
            </select>
        </div>
      )}
    </div>
  );
}
