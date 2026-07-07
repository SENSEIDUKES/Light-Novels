import { useState, useEffect } from "react";

export function useAudioSettings() {
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem("seihouse-audio-muted") === "true";
  });

  const [atmosphere, setAtmosphere] = useState(() => {
    if (typeof localStorage === 'undefined') return "none";
    return localStorage.getItem("seihouse-audio-atmosphere") || "none";
  });

  const [volume, setVolume] = useState(() => {
    if (typeof localStorage === 'undefined') return 0.5;
    const saved = localStorage.getItem("seihouse-audio-volume");
    return saved ? parseFloat(saved) : 0.5;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleEvents = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if (typeof customEvent.detail.isMuted === "boolean") {
          setIsMuted(customEvent.detail.isMuted);
        }
        if (customEvent.detail.atmosphere) {
          setAtmosphere(customEvent.detail.atmosphere);
        }
        if (typeof customEvent.detail.volume === "number") {
          setVolume(customEvent.detail.volume);
        }
      }
    };
    window.addEventListener("seihouse-audio-state", handleEvents);
    return () => window.removeEventListener("seihouse-audio-state", handleEvents);
  }, []);

  const handleMuteToggle = (newMuted: boolean) => {
    setIsMuted(newMuted);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem("seihouse-audio-muted", String(newMuted));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("seihouse-audio-control", { detail: { isMuted: newMuted } }));
    }
  };

  const handleAtmosphereChange = (newAtmo: string) => {
    setAtmosphere(newAtmo);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem("seihouse-audio-atmosphere", newAtmo);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("seihouse-audio-control", { detail: { atmosphere: newAtmo } }));
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem("seihouse-audio-volume", String(newVol));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("seihouse-audio-control", { detail: { volume: newVol } }));
    }
  };

  return {
    isMuted,
    handleMuteToggle,
    atmosphere,
    handleAtmosphereChange,
    volume,
    handleVolumeChange,
  };
}
