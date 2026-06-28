import React from 'react';
import { CloudOff, RefreshCw, Cloud, Globe, Sliders } from 'lucide-react';
import { storyStorage } from '../lib/storage';
import { UserProfile as UserProfileType } from '../types';

interface UserProfileSettingsPanelProps {
  syncStatus: string;
  daoStatus: 'checking' | 'connected' | 'disconnected';
  daoDetail: string;
  checkDaoConnection: () => void;
  lastSavedTime: number | null;
  formData: Partial<UserProfileType>;
  profile: UserProfileType | null;
  handleLanguageChangeDirect: (name: 'preferredLanguage' | 'defaultTranslationLanguage', value: string) => void;
}

export function UserProfileSettingsPanel({
  syncStatus,
  daoStatus,
  daoDetail,
  checkDaoConnection,
  lastSavedTime,
  formData,
  profile,
  handleLanguageChangeDirect
}: UserProfileSettingsPanelProps) {
  return (
    <>
      {/* Celestial Tools Section (Always Visible) */}
      <div className="border-t border-neutral-900/50 pt-10">
        <h3 className="text-[11px] uppercase font-bold tracking-widest text-neutral-500 font-sc mb-6 flex items-center gap-2">
          <Sliders size={14} className="text-portal" />
          Environment & Sync Settings
        </h3>
        <div className="flex flex-col gap-5 bg-[#030303] p-5 rounded-xl border border-neutral-900 shadow-inner">
          <div className="flex flex-wrap items-center gap-4 border-b border-neutral-900/50 pb-4">
            <div className="flex items-center space-x-2 border border-neutral-800 px-4 py-2 rounded-lg bg-black">
              {syncStatus === 'offline' ? (
                <button  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => storyStorage.performSync()} title="Offline / Local Only. Click to sync" className="flex items-center space-x-2 hover:text-portal transition-colors"><CloudOff size={14} className="text-neutral-600" /> <span className="text-[11px] font-sans text-neutral-500 uppercase tracking-widest">Offline Flow</span></button>
              ) : syncStatus === 'syncing' ? (
                <span title="Syncing..." className="flex items-center space-x-2"><RefreshCw size={14} className="text-portal animate-spin" /> <span className="text-[11px] font-sans text-portal uppercase tracking-widest">Channeling...</span></span>
              ) : syncStatus === 'error' ? (
                <button  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => storyStorage.performSync()} title="Sync Error. Click to retry" className="flex items-center space-x-2 hover:text-portal transition-colors"><CloudOff size={14} className="text-human" /> <span className="text-[11px] font-sans text-human uppercase tracking-widest">Disharmony</span></button>
              ) : (
                <button  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => storyStorage.performSync()} title="Synced to Firebase. Click to force sync" className="flex items-center space-x-2 hover:text-portal transition-colors"><Cloud size={14} className="text-portal" /> <span className="text-[11px] font-sans text-portal uppercase tracking-widest">Harmonized</span></button>
              )}
            </div>

            {/* Dao Connection Badge */}
            <button
              type="button"
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={checkDaoConnection}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-[11px] uppercase font-bold transition-all duration-300 border border-neutral-800 bg-black shrink-0 font-sc tracking-wider hover:scale-105 select-none ${
                daoStatus === 'connected'
                  ? 'border-emerald-500/25 text-emerald-400 hover:bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.06)]'
                  : daoStatus === 'disconnected'
                  ? 'border-red-900/30 text-red-400 hover:bg-red-900/20 shadow-[0_0_12px_rgba(139,0,0,0.04)]'
                  : 'text-neutral-400'
              }`}
              title={`${daoDetail} — Click to verify connection state`}
              aria-label="Celestial Connection Status"
            >
              {daoStatus === 'checking' ? (
                <RefreshCw size={12} className="animate-spin text-amber-400" />
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
              <span className="font-sans font-bold">
                {daoStatus === 'connected' ? 'Dao Aligned' : daoStatus === 'disconnected' ? 'Dao Severed' : 'Sensing...'}
              </span>
            </button>
            {lastSavedTime && (
              <div className="text-[10px] font-mono text-neutral-600 tracking-wider">
                Auto-saved: {new Date(lastSavedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            )}
          </div>

          {/* Interactive Language & Translation Settings - Un-gatekept */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="flex items-center justify-between bg-black/40 border border-neutral-850 rounded-xl p-3 sm:p-3.5 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-2 bg-neutral-900/50 rounded-lg shrink-0"><Globe size={13} className="text-portal animate-pulse" /></div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-neutral-400 font-sc truncate">Preferred Language</span>
                  <span className="text-[8px] text-neutral-500 font-sans truncate">Active UI dialect</span>
                </div>
              </div>
              <div className="relative shrink-0">
                <select 
                  name="preferredLanguage" 
                  value={formData.preferredLanguage || profile?.preferredLanguage || 'English'} 
                  onChange={(e) => handleLanguageChangeDirect('preferredLanguage', e.target.value)}
                  className="bg-black border border-neutral-800 hover:border-portal/50 rounded pl-2 pr-6 py-1.5 text-[11px] text-signal focus:border-portal outline-none font-sans cursor-pointer transition-all appearance-none w-24 sm:w-32 text-ellipsis overflow-hidden"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="Simplified Chinese (简体中文)">Simplified Chinese (简体中文)</option>
                  <option value="Traditional Chinese (繁體中文)">Traditional Chinese (繁體中文)</option>
                  <option value="Japanese (日本語)">Japanese (日本語)</option>
                  <option value="Korean (한국어)">Korean (한국어)</option>
                  <option value="Vietnamese (Tiếng Việt)">Vietnamese (Tiếng Việt)</option>
                  <option value="Indonesian (Bahasa Indonesia)">Indonesian (Bahasa Indonesia)</option>
                  <option value="Thai (ภาษาไทย)">Thai (ภาษาไทย)</option>
                  <option value="Tagalog (Filipino)">Tagalog (Filipino)</option>
                  <option value="Malay (Bahasa Melayu)">Malay (Bahasa Melayu)</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 text-[9px]">▼</div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-black/40 border border-neutral-850 rounded-xl p-3 sm:p-3.5 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-2 bg-neutral-900/50 rounded-lg shrink-0"><Globe size={13} className="text-human animate-pulse" /></div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-neutral-400 font-sc truncate">Translation Default</span>
                  <span className="text-[8px] text-neutral-500 font-sans truncate">Automatic translation</span>
                </div>
              </div>
              <div className="relative shrink-0">
                <select 
                  name="defaultTranslationLanguage" 
                  value={formData.defaultTranslationLanguage || profile?.defaultTranslationLanguage || 'English'} 
                  onChange={(e) => handleLanguageChangeDirect('defaultTranslationLanguage', e.target.value)}
                  className="bg-black border border-neutral-800 hover:border-human/50 rounded pl-2 pr-6 py-1.5 text-[11px] text-signal focus:border-human outline-none font-sans cursor-pointer transition-all appearance-none w-24 sm:w-32 text-ellipsis overflow-hidden"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="Simplified Chinese (简体中文)">Simplified Chinese (简体中文)</option>
                  <option value="Traditional Chinese (繁體中文)">Traditional Chinese (繁體中文)</option>
                  <option value="Japanese (日本語)">Japanese (日本語)</option>
                  <option value="Korean (한국어)">Korean (한국어)</option>
                  <option value="Vietnamese (Tiếng Việt)">Vietnamese (Tiếng Việt)</option>
                  <option value="Indonesian (Bahasa Indonesia)">Indonesian (Bahasa Indonesia)</option>
                  <option value="Thai (ภาษาไทย)">Thai (ภาษาไทย)</option>
                  <option value="Tagalog (Filipino)">Tagalog (Filipino)</option>
                  <option value="Malay (Bahasa Melayu)">Malay (Bahasa Melayu)</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 text-[9px]">▼</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
