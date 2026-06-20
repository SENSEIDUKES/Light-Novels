import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export function AudioWidget() {
  const [audioMuted, setAudioMuted] = useState(() => {
    const saved = localStorage.getItem('seihouse-audio-muted');
    return saved === 'true';
  });
  const [audioVolume, setAudioVolume] = useState(() => {
    const saved = localStorage.getItem('seihouse-audio-volume');
    return saved ? parseFloat(saved) : 0.5;
  });

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if (typeof customEvent.detail.isMuted === 'boolean') setAudioMuted(customEvent.detail.isMuted);
        if (typeof customEvent.detail.volume === 'number') setAudioVolume(customEvent.detail.volume);
      }
    };
    window.addEventListener('seihouse-audio-state', handleSync);
    return () => window.removeEventListener('seihouse-audio-state', handleSync);
  }, []);

  const handleMuteToggle = () => {
    const newMuted = !audioMuted;
    setAudioMuted(newMuted);
    localStorage.setItem('seihouse-audio-muted', String(newMuted));
    window.dispatchEvent(new CustomEvent('seihouse-audio-control', {
      detail: { isMuted: newMuted }
    }));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setAudioVolume(newVolume);
    localStorage.setItem('seihouse-audio-volume', String(newVolume));
    window.dispatchEvent(new CustomEvent('seihouse-audio-control', {
      detail: { volume: newVolume }
    }));
  };

  return (
    <div className="flex items-center space-x-2 bg-void/80 border border-neutral-850 px-2 py-1.5 rounded transition-all group hover:border-portal min-w-[30px] sm:min-w-[40px]">
      <button 
        onClick={handleMuteToggle} 
        className="text-neutral-400 hover:text-portal transition-colors"
        title={audioMuted ? "Unmute Audio" : "Mute Audio"}
      >
        {audioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={audioVolume}
        onChange={handleVolumeChange}
        className="w-16 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-portal/50 hidden sm:group-hover:block transition-all"
        title="Volume"
      />
    </div>
  );
}
