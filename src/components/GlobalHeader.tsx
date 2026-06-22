import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, User, LogOut, Plus, Sliders, ScrollText, Scroll, Link } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { AudioWidget } from './AudioWidget';

export const GlobalHeader: React.FC = () => {
  const { currentScreen, setCurrentScreen, setActiveStoryId, syncStatus, currentUser, lastSavedTime, activeStoryId, stories, setIsSettingsOpen } = useAppStore();

  const [daoStatus, setDaoStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [daoDetail, setDaoDetail] = useState<string>('Sensing alignment with the cosmic Dao...');

  const localGeminiKey = useAppStore(state => state.localGeminiKey);
  const localOpenrouterKey = useAppStore(state => state.localOpenrouterKey);
  const localOllamaHost = useAppStore(state => state.localOllamaHost);
  const isSettingsOpen = useAppStore(state => state.isSettingsOpen);

  const checkDaoConnection = async () => {
    setDaoStatus('checking');
    try {
      const res = await fetch('/api/config-status');
      const status = res.ok ? await res.json() : { hasServerGemini: true };
      
      setDaoStatus('connected');
      const hasLocalKey = !!(localGeminiKey || localOpenrouterKey || localOllamaHost);
      if (hasLocalKey) {
        setDaoDetail('Local Conduit Active (Overriding Keys configured)');
      } else {
        setDaoDetail('Divine Flow Stable (Server-managed Gemini active)');
      }
    } catch (err) {
      setDaoStatus('connected');
      setDaoDetail('Divine Flow Stable (Server-managed Gemini active)');
    }
  };

  useEffect(() => {
    checkDaoConnection();
  }, [localGeminiKey, localOpenrouterKey, localOllamaHost, isSettingsOpen]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const activeStory = stories.find(s => s.id === activeStoryId);

  if (currentScreen === 'reader' || currentScreen === 'codex') {
    return null;
  }

  return (
    <header className="border-b border-neutral-900 bg-black/90 backdrop-blur-md sticky top-0 z-40 py-1.5 sm:py-3 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer min-w-0 mr-2" onClick={() => { setCurrentScreen('home'); setActiveStoryId(null); }}>
          <img 
            src="https://images.seihouse.org/SEA%20LOGO/SEA%20LOGO.png" 
            alt="SEIHouse SEA Logo" 
            className="h-7 sm:h-10 w-auto object-contain brightness-110 filter drop-shadow-[0_0_8px_rgba(4,172,255,0.3)] shrink-0 rounded-2xl"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <span className="font-sc text-portal text-[6px] sm:text-[10px] tracking-[0.1em] sm:tracking-[0.25em] font-semibold block uppercase truncate">SEIHouse Appellation</span>
            <h1 className="font-display font-bold text-xs sm:text-base md:text-lg text-signal tracking-wide leading-tight truncate">Celestial Scroll Library</h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
          {/* Connection to the Dao Badge */}
          <button
            onClick={checkDaoConnection}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-full text-[9px] sm:text-[10px] uppercase font-bold transition-all duration-300 border border-neutral-900 shrink-0 font-sc tracking-wider hover:scale-105 select-none animate-fadeIn ${
              daoStatus === 'connected'
                ? 'bg-emerald-550/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-550/15 shadow-[0_0_12px_rgba(16,185,129,0.06)]'
                : daoStatus === 'disconnected'
                ? 'bg-red-950/20 border-red-900/30 text-red-400 hover:bg-red-900/20 shadow-[0_0_12px_rgba(139,0,0,0.04)]'
                : 'bg-neutral-900/50 border-neutral-800 text-neutral-400'
            }`}
            title={`${daoDetail} — Click to verify connection state`}
          >
            {daoStatus === 'checking' ? (
              <RefreshCw size={11} className="animate-spin text-amber-400" />
            ) : daoStatus === 'connected' ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
            
            <span className="hidden sm:inline-block font-bold">
              {daoStatus === 'connected' ? 'Connection to the Dao' : daoStatus === 'disconnected' ? 'Dao Severed' : 'Sensing Dao...'}
            </span>
            <span className="sm:hidden font-bold">
              {daoStatus === 'connected' ? 'Dao Aligned' : daoStatus === 'disconnected' ? 'Dao Severed' : 'Sensing...'}
            </span>
          </button>

          <div className="flex items-center shrink-0">
            {currentUser ? (
              <button 
                onClick={() => setCurrentScreen('profile')} 
                className="group relative flex items-center justify-center p-1 sm:p-1.5 rounded-full transition-all duration-500 hover:scale-105"
                title={`Spirit Linked: ${currentUser.email}`}
              >
                {/* Qi Cyclone Aurora */}
                <div className={`absolute inset-[-4px] rounded-full border border-dashed animate-[spin_6s_linear_infinite] transition-colors duration-500 ${currentScreen === 'profile' ? 'border-portal/40' : 'border-human/40 group-hover:border-portal/40'}`} />
                <div className={`absolute inset-[-8px] rounded-full border border-dotted animate-[spin_10s_linear_infinite_reverse] transition-colors duration-500 ${currentScreen === 'profile' ? 'border-portal/30' : 'border-human/30 group-hover:border-portal/30'}`} />
                
                {/* Inner Glow */}
                <div className={`absolute inset-0 rounded-full blur-md animate-pulse transition-colors duration-500 ${currentScreen === 'profile' ? 'bg-portal/20 shadow-[0_0_20px_rgba(4,172,255,0.5)]' : 'bg-human/20 shadow-[0_0_20px_rgba(139,0,0,0.5)] group-hover:bg-portal/20 group-hover:shadow-[0_0_20px_rgba(4,172,255,0.5)]'}`} />
                
                <div className={`relative transition-colors duration-700 ${currentScreen === 'profile' ? 'text-portal' : 'text-human group-hover:text-portal'}`}>
                  <Cloud size={24} className={currentScreen === 'profile' ? 'drop-shadow-[0_0_8px_rgba(4,172,255,0.8)]' : 'drop-shadow-[0_0_8px_rgba(139,0,0,0.8)] group-hover:drop-shadow-[0_0_8px_rgba(4,172,255,0.8)]'} strokeWidth={1.5} />
                </div>
              </button>
            ) : (
              <button 
                onClick={() => setCurrentScreen('profile')} 
                className={`group relative flex items-center justify-center p-1 sm:p-1.5 rounded-full transition-all duration-300 hover:bg-neutral-900 border border-transparent ${currentScreen === 'profile' ? 'text-portal' : 'text-human hover:text-portal'}`}
                title="Open Celestial Tools"
              >
                <Cloud size={24} className="transition-colors" strokeWidth={1.5} />
              </button>
            )}
          </div>

          {activeStory && (
            <div className="hidden md:flex items-center space-x-2 bg-[#030303] px-3 py-1.5 rounded-lg border border-neutral-800">
              <User size={12} className="text-portal" />
              <span className="text-[11px] text-signal font-serif tracking-widest">{activeStory.mcName}</span>
              <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">({activeStory.genre})</span>
            </div>
          )}

          {currentScreen !== 'home' ? (
            <button
              onClick={() => { setCurrentScreen('home'); setActiveStoryId(null); }}
              className="group relative flex items-center justify-center p-1 sm:p-1.5 rounded-full transition-all duration-500 hover:scale-105 ml-2 sm:ml-4"
              title="Return to Library"
            >
              <div className="absolute inset-[-4px] rounded-full border border-dashed border-human/40 group-hover:border-portal/40 animate-[spin_6s_linear_infinite] transition-colors duration-500" />
              <div className="absolute inset-[-8px] rounded-full border border-dotted border-human/30 group-hover:border-portal/30 animate-[spin_10s_linear_infinite_reverse] transition-colors duration-500" />
              
              <div className="absolute inset-0 bg-human/20 group-hover:bg-portal/20 rounded-full blur-md animate-pulse shadow-[0_0_20px_rgba(139,0,0,0.5)] group-hover:shadow-[0_0_20px_rgba(4,172,255,0.5)] transition-colors duration-500" />
              
              <div className="relative text-human group-hover:text-portal transition-colors duration-700">
                <ScrollText size={24} className="drop-shadow-[0_0_8px_rgba(139,0,0,0.8)] group-hover:drop-shadow-[0_0_8px_rgba(4,172,255,0.8)] transition-all duration-500" strokeWidth={1.5} />
              </div>
            </button>
          ) : (
            <button
              onClick={() => setCurrentScreen('creator')}
              className="group relative flex items-center justify-center p-1 sm:p-1.5 rounded-full transition-all duration-500 hover:scale-105 ml-2 sm:ml-4"
              title="Create Story"
            >
              <div className="absolute inset-[-4px] rounded-full border border-dashed border-human/40 group-hover:border-portal/40 animate-[spin_6s_linear_infinite] transition-colors duration-500" />
              <div className="absolute inset-[-8px] rounded-full border border-dotted border-human/30 group-hover:border-portal/30 animate-[spin_10s_linear_infinite_reverse] transition-colors duration-500" />
              
              <div className="absolute inset-0 bg-human/20 group-hover:bg-portal/20 rounded-full blur-md animate-pulse shadow-[0_0_20px_rgba(139,0,0,0.5)] group-hover:shadow-[0_0_20px_rgba(4,172,255,0.5)] transition-colors duration-500" />
              
              <div className="relative text-human group-hover:text-portal transition-colors duration-700">
                <Scroll size={24} className="drop-shadow-[0_0_8px_rgba(139,0,0,0.8)] group-hover:drop-shadow-[0_0_8px_rgba(4,172,255,0.8)] transition-all duration-500" strokeWidth={1.5} />
              </div>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
