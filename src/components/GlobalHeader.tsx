import React from 'react';
import { Cloud, CloudOff, RefreshCw, User, LogOut, Plus, Sliders } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { AudioWidget } from './AudioWidget';

export const GlobalHeader: React.FC = () => {
  const { currentScreen, setCurrentScreen, setActiveStoryId, syncStatus, currentUser, lastSavedTime, activeStoryId, stories, setIsSettingsOpen } = useAppStore();

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
            className="h-7 sm:h-10 w-auto object-contain brightness-110 filter drop-shadow-[0_0_8px_rgba(4,172,255,0.3)] shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <span className="font-sc text-gold-accent text-[6px] sm:text-[10px] tracking-[0.1em] sm:tracking-[0.25em] font-semibold block uppercase truncate">SEIHouse Appellation</span>
            <h1 className="font-display font-bold text-xs sm:text-base md:text-lg text-signal tracking-wide leading-tight truncate">Celestial Scroll Library</h1>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          <div className="flex flex-col items-end space-y-0.5 shrink-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2 border border-neutral-850 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded bg-void/50 shrink-0">
              {syncStatus === 'offline' ? (
                <button onClick={() => storyStorage.performSync()} title="Offline / Local Only. Click to sync" className="flex hover:text-portal transition-colors shrink-0"><CloudOff size={14} className="text-neutral-500" /></button>
              ) : syncStatus === 'syncing' ? (
                <span title="Syncing..." className="flex shrink-0"><RefreshCw size={14} className="text-portal animate-spin" /></span>
              ) : syncStatus === 'error' ? (
                <button onClick={() => storyStorage.performSync()} title="Sync Error. Click to retry" className="flex hover:text-portal transition-colors shrink-0"><CloudOff size={14} className="text-human" /></button>
              ) : (
                <button onClick={() => storyStorage.performSync()} title="Synced to Firebase. Click to force sync" className="flex hover:text-portal transition-colors shrink-0"><Cloud size={14} className="text-[#00A86B]" /></button>
              )}
              
              {currentUser ? (
                <button onClick={() => setCurrentScreen('profile')} className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-neutral-400 hover:text-portal flex items-center space-x-1 border border-neutral-800 bg-void px-2 py-0.5 sm:py-1 rounded transition-colors shrink-0">
                  <User size={10} className="text-portal" />
                  <span className="hidden xs:inline truncate max-w-[70px] sm:max-w-[100px] font-medium">{currentUser.email?.split('@')[0]}</span>
                </button>
              ) : (
                <button onClick={handleLogin} className="text-[8px] sm:text-[10px] font-sc font-bold uppercase tracking-widest text-portal hover:text-signal shadow-[0_0_8px_rgba(4,172,255,0.2)] shrink-0 whitespace-nowrap">
                  Link Cloud
                </button>
              )}
            </div>
            {lastSavedTime && (
              <span className="hidden sm:block text-[8px] sm:text-[9px] font-mono text-neutral-600 pr-1">
                Auto-saved: {new Date(lastSavedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>

          <div className="shrink-0"><AudioWidget /></div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-void border border-neutral-850 hover:border-portal text-neutral-400 hover:text-portal transition-all rounded font-sc text-[10px] sm:text-xs flex items-center space-x-1.5 font-bold shrink-0"
            title="Aether Router"
          >
            <Sliders size={12} className="text-portal font-semibold" />
            <span className="hidden sm:inline uppercase tracking-widest text-[9px] font-semibold">Router</span>
          </button>

          {activeStory && (
            <div className="hidden md:flex items-center space-x-2 bg-neutral-900/60 px-3 py-1.5 rounded border border-neutral-850">
              <User size={12} className="text-jade-accent" />
              <span className="text-xs text-neutral-300 font-medium font-mono">{activeStory.mcName}</span>
              <span className="text-[10px] text-neutral-500 font-semibold uppercase">({activeStory.genre})</span>
            </div>
          )}

          {currentScreen !== 'home' ? (
            <button
              onClick={() => { setCurrentScreen('home'); setActiveStoryId(null); }}
              className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-void border border-neutral-850 hover:border-gold-accent text-[10px] sm:text-xs text-neutral-400 hover:text-gold-accent transition-all rounded font-sc uppercase tracking-wider flex items-center space-x-1.5 font-bold"
            >
              <LogOut size={12} />
              <span className="hidden xs:inline">Return to Library</span>
              <span className="inline xs:hidden">Library</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentScreen('creator')}
              className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-void border border-human text-human hover:bg-human hover:text-signal transition-all shadow-[0_0_12px_rgba(139,0,0,0.2)] rounded font-sc uppercase text-[10px] sm:text-xs tracking-wider flex items-center space-x-1.5 font-bold animate-pulse"
            >
              <Plus size={12} />
              <span className="hidden xs:inline">Manifest Scroll</span>
              <span className="inline xs:hidden">Manifest</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
