import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, User, LogOut, Plus, Sliders, ScrollText, Scroll, Link, Keyboard, Gem } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { AudioWidget } from './AudioWidget';
import { DaoInsights } from './DaoInsights';

export const GlobalHeader: React.FC = () => {
  const { currentScreen, setCurrentScreen, setActiveStoryId, syncStatus, currentUser, lastSavedTime, activeStoryId, stories, setIsSettingsOpen } = useAppStore();
  const [qiCharge, setQiCharge] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  useEffect(() => {
    let intervalId: any;
    if (isHolding) {
      intervalId = setInterval(() => {
        setQiCharge((prev) => Math.min(prev + 3, 100));
      }, 20);
    } else {
      intervalId = setInterval(() => {
        setQiCharge((prev) => Math.max(prev - 6, 0));
      }, 20);
    }
    return () => clearInterval(intervalId);
  }, [isHolding]);

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
    <header className="relative border-b border-portal/10 bg-black/80 backdrop-blur-xl sticky top-0 z-40 py-2 sm:py-3 animate-fadeIn shadow-[0_4px_30px_rgba(4,172,255,0.08)] before:absolute before:inset-x-0 before:bottom-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-portal/40 before:to-transparent">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 flex items-center justify-between">
        <div 
          className="flex items-center space-x-2 sm:space-x-3 cursor-pointer min-w-0 mr-2" 
          onClick={() => { setCurrentScreen('home'); setActiveStoryId(null); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setCurrentScreen('home'); setActiveStoryId(null);
            }
          }}
          aria-label="Return to Home"
        >
          <img 
            src="https://images.seihouse.org/SEA%20LOGO/SEA%20LOGO.png" 
            alt="SEIHouse SEA Logo" 
            className="h-7 sm:h-10 w-auto object-contain brightness-110 filter drop-shadow-[0_0_8px_rgba(4,172,255,0.3)] shrink-0 rounded-2xl"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <h1 className="font-display font-bold text-xs sm:text-base md:text-lg text-signal tracking-wide leading-tight truncate select-none">
              <span
                className="relative inline-block cursor-pointer transition-all duration-200"
                onMouseDown={() => setIsHolding(true)}
                onMouseUp={() => setIsHolding(false)}
                onMouseLeave={() => setIsHolding(false)}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setIsHolding(true);
                }}
                onTouchEnd={() => setIsHolding(false)}
                onTouchCancel={() => setIsHolding(false)}
                style={{
                  textShadow: `0 0 ${4 + (qiCharge / 100) * 20}px rgba(4, 172, 255, ${0.4 + (qiCharge / 100) * 0.6}), 
                               0 0 ${1 + (qiCharge / 100) * 8}px rgba(250, 250, 250, ${0.3 + (qiCharge / 100) * 0.7})`,
                  color: `rgb(${250 - (qiCharge / 100) * 15}, ${250 - (qiCharge / 100) * 5}, 255)`,
                  transform: `scale(${1 + (qiCharge / 100) * 0.08})`,
                  transformOrigin: 'left center',
                  transition: 'text-shadow 0.1s ease-out, transform 0.1s ease-out, color 0.1s ease-out'
                }}
              >
                Celestial
                
                {/* Qi gathering particle ring effect */}
                <span 
                  className="absolute -inset-2 rounded-lg pointer-events-none transition-all duration-100 mix-blend-screen opacity-70"
                  style={{
                    boxShadow: `inset 0 0 ${(qiCharge / 100) * 16}px rgba(4, 172, 255, ${(qiCharge / 100) * 0.8}),
                                0 0 ${(qiCharge / 100) * 20}px rgba(4, 172, 255, ${(qiCharge / 100) * 0.6})`,
                    border: `1px dashed rgba(4, 172, 255, ${(qiCharge / 100) * 0.5})`,
                    transform: `scale(${1.4 - (qiCharge / 100) * 0.4}) rotate(${qiCharge * 3.6}deg)`,
                  }}
                />
              </span>
              {' '}Library
            </h1>
          </div>
        </div>

        {/* Center Section: Insights from the Dao */}
        <DaoInsights />

        <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
          <button
            onClick={() => setCurrentScreen('pricing')}
            className="group relative flex items-center justify-center p-1 sm:p-1.5 rounded-full transition-all duration-500 hover:scale-105 mr-2 sm:mr-4"
            title="Spirit Stones"
            aria-label="Spirit Stones"
          >
            {/* Qi Cyclone Aurora */}
            <div className={`absolute inset-[-4px] rounded-full border border-dashed animate-[spin_6s_linear_infinite] transition-colors duration-500 ${currentScreen === 'pricing' ? 'border-purple-400/50' : 'border-purple-500/40 group-hover:border-purple-400/50'}`} />
            <div className={`absolute inset-[-8px] rounded-full border border-dotted animate-[spin_10s_linear_infinite_reverse] transition-colors duration-500 ${currentScreen === 'pricing' ? 'border-purple-300/40' : 'border-purple-400/30 group-hover:border-purple-300/40'}`} />
            
            {/* Inner Glow */}
            <div className={`absolute inset-0 rounded-full blur-md animate-pulse transition-colors duration-500 ${currentScreen === 'pricing' ? 'bg-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.6)]' : 'bg-purple-600/20 shadow-[0_0_20px_rgba(147,51,234,0.5)] group-hover:bg-purple-500/30 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.6)]'}`} />
            
            <div className={`relative transition-colors duration-700 ${currentScreen === 'pricing' ? 'text-purple-300' : 'text-purple-400 group-hover:text-purple-300'}`}>
              <Gem size={24} className={currentScreen === 'pricing' ? 'drop-shadow-[0_0_10px_rgba(168,85,247,0.9)]' : 'drop-shadow-[0_0_8px_rgba(147,51,234,0.8)] group-hover:drop-shadow-[0_0_10px_rgba(168,85,247,0.9)]'} strokeWidth={1.5} />
            </div>
          </button>
          <div className="flex items-center shrink-0">
            {currentUser ? (
              <button 
                onClick={() => setCurrentScreen('profile')} 
                className="group relative flex items-center justify-center p-1 sm:p-1.5 rounded-full transition-all duration-500 hover:scale-105"
                title={`Spirit Linked: ${currentUser.email}`}
                aria-label="Open User Profile"
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
                aria-label="Open Celestial Tools"
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
              className="group relative flex items-center justify-center p-1 sm:p-1.5 rounded-full transition-all duration-300 hover:scale-105 ml-2 sm:ml-4"
              title="Return to Library"
              aria-label="Return to Library"
            >
              <div className="absolute inset-0 bg-human/10 group-hover:bg-portal/20 rounded-full blur-sm transition-colors duration-500" />
              
              <div className="relative text-human group-hover:text-portal transition-colors duration-500">
                <ScrollText size={24} className="drop-shadow-[0_0_4px_rgba(139,0,0,0.5)] group-hover:drop-shadow-[0_0_8px_rgba(4,172,255,0.6)] transition-all duration-500" strokeWidth={1.5} />
              </div>
            </button>
          ) : (
            <button
              onClick={() => setCurrentScreen('creator')}
              className="group relative flex items-center justify-center p-1 sm:p-1.5 rounded-full transition-all duration-300 hover:scale-105 ml-2 sm:ml-4"
              title="Create Story"
              aria-label="Create Story"
            >
              <div className="absolute inset-0 bg-human/10 group-hover:bg-portal/20 rounded-full blur-sm transition-colors duration-500" />
              
              <div className="relative text-human group-hover:text-portal transition-colors duration-500">
                <Scroll size={24} className="drop-shadow-[0_0_4px_rgba(139,0,0,0.5)] group-hover:drop-shadow-[0_0_8px_rgba(4,172,255,0.6)] transition-all duration-500" strokeWidth={1.5} />
              </div>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
