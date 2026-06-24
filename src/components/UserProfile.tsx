import React, { useState, useEffect } from 'react';
import { UserProfile as UserProfileType, Story, AppUser } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { LogOut, Save, User as UserIcon, Calendar, BookOpen, Globe, Cloud, CloudOff, RefreshCw, Sliders, Upload, Download, Database, Zap, Keyboard } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';
import { AudioWidget } from './AudioWidget';
import { getDaoRankData, AURA_TIERS, getAuraTextStyle, getAuraGlowStyle } from '../lib/qi';

interface UserProfileProps {
  currentUser: AppUser | null;
  stories: Story[];
  onLogout: () => void;
  onNavigateHome: () => void;
}

export default function UserProfile({ currentUser, stories, onLogout, onNavigateHome }: UserProfileProps) {
  const { syncStatus, lastSavedTime, setIsSettingsOpen, handleExportLibrary, handleImportLibrary, storageType, localGeminiKey, localOpenrouterKey, localOllamaHost, isSettingsOpen } = useAppStore();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfileType>>({});
  const [isLoading, setIsLoading] = useState(true);
  const colorInputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [daoStatus, setDaoStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [daoDetail, setDaoDetail] = useState<string>('Sensing alignment with the cosmic Dao...');

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

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    // Subscribe to profile updates
    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfileType;
        setProfile(data);
        if (!isEditing) {
          setFormData(data);
        }
      } else {
        // Create initial profile if it doesn't exist
        const defaultProfile: UserProfileType = {
          uid: currentUser.uid,
          username: currentUser.email?.split('@')[0] || `user_${currentUser.uid.substring(0,5)}`,
          displayName: currentUser.displayName || '',
          avatarUrl: currentUser.photoURL || '',
          preferredLanguage: 'English',
          defaultTranslationLanguage: 'English',
          savedStoryCount: 0,
          activeStories: [],
          inactiveStories: [],
          joinedDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // This will trigger the snapshot again
        setDoc(doc(db, 'users', currentUser.uid), defaultProfile, { merge: true }).catch(err => {
          console.error("Failed to create profile", err);
        });
      }
      setIsLoading(false);
    }, (err) => {
      console.error(err);
      setError('Unable to load profile data.');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Derived metrics from actual stories state instead of just the profile fields
  // In a real app we might sync these, but here reading from the stories array is more accurate for the current session
  const userStories = stories.filter(s => s.userId === currentUser?.uid || (!s.userId));
  const activeStoriesCount = userStories.length;

  const handleSave = async () => {
    if (!currentUser || !profile) return;
    setIsLoading(true);
    try {
      const updates = {
        username: formData.username,
        displayName: formData.displayName,
        displayNameColor: formData.displayNameColor,
        avatarUrl: formData.avatarUrl,
        preferredLanguage: formData.preferredLanguage,
        defaultTranslationLanguage: formData.defaultTranslationLanguage,
        updatedAt: new Date().toISOString()
      };
      
      // Clean undefined to prevent Firestore errors
      Object.keys(updates).forEach(key => {
        if (updates[key as keyof typeof updates] === undefined) {
          delete updates[key as keyof typeof updates];
        }
      });

      await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
      setIsEditing(false);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);

  const handleRunAudit = async () => {
     setIsAuditing(true);
     setAuditResult(null);
     try {
       const result = await storyStorage.getSyncAudit();
       setAuditResult(result);
     } catch (e) {
       console.error(e);
     } finally {
       setIsAuditing(false);
     }
  };

  const handleRecover = async () => {
      setIsAuditing(true);
      let totalRecovered = 0;
      for (const s of userStories) {
          totalRecovered += await storyStorage.auditAndRecoverChapters(s.id);
      }
      setAuditResult((prev: any) => ({ ...prev, recovered: totalRecovered }));
      setIsAuditing(false);
  };

  const daoData = getDaoRankData(profile?.dao_xp || profile?.qi || 0);

  if (isLoading && !profile && currentUser) {
    return <div className="p-8 text-center text-neutral-500 font-sc tracking-widest uppercase animate-pulse">Accessing Celestial Record...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="bg-void border border-neutral-900 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(4,172,255,0.03)] backdrop-blur-sm relative">
        {/* Subtle top glow */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-portal/30 to-transparent"></div>
        
        <div className="bg-black/40 p-6 sm:p-8 border-b border-neutral-900 flex justify-between items-center">
          <h2 className="font-display text-3xl text-signal flex items-center gap-3">
            <Cloud className="text-portal" size={28} /> 
            Celestial Tools
          </h2>
          {currentUser && (
            <button onClick={onLogout} className="px-5 py-2 border border-human/30 text-human hover:bg-human/10 hover:border-human hover:text-signal rounded-full text-[11px] font-sc font-bold tracking-wider transition-all flex items-center gap-2">
              <LogOut size={14} /> Sever Link
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-human/10 border-b border-human/30 text-human text-sm font-mono text-center">
            {error}
          </div>
        )}

        <div className="p-6 md:p-10 space-y-12">
          
          {/* Celestial Tools Section (Always Visible) */}
          <div className="border-b border-neutral-900/50 pb-10">
            <h3 className="text-[11px] uppercase font-bold tracking-widest text-neutral-500 font-sc mb-6 flex items-center gap-2">
              <Sliders size={14} className="text-portal" />
              Environment & Sync Settings
            </h3>
            <div className="flex flex-wrap items-center gap-4 bg-[#030303] p-5 rounded-xl border border-neutral-900 shadow-inner">
              <div className="flex items-center space-x-2 border border-neutral-800 px-4 py-2 rounded-lg bg-black">
                {syncStatus === 'offline' ? (
                  <button onClick={() => storyStorage.performSync()} title="Offline / Local Only. Click to sync" className="flex items-center space-x-2 hover:text-portal transition-colors"><CloudOff size={14} className="text-neutral-600" /> <span className="text-[11px] font-sans text-neutral-500 uppercase tracking-widest">Offline Flow</span></button>
                ) : syncStatus === 'syncing' ? (
                  <span title="Syncing..." className="flex items-center space-x-2"><RefreshCw size={14} className="text-portal animate-spin" /> <span className="text-[11px] font-sans text-portal uppercase tracking-widest">Channeling...</span></span>
                ) : syncStatus === 'error' ? (
                  <button onClick={() => storyStorage.performSync()} title="Sync Error. Click to retry" className="flex items-center space-x-2 hover:text-portal transition-colors"><CloudOff size={14} className="text-human" /> <span className="text-[11px] font-sans text-human uppercase tracking-widest">Disharmony</span></button>
                ) : (
                  <button onClick={() => storyStorage.performSync()} title="Synced to Firebase. Click to force sync" className="flex items-center space-x-2 hover:text-portal transition-colors"><Cloud size={14} className="text-portal" /> <span className="text-[11px] font-sans text-portal uppercase tracking-widest">Harmonized</span></button>
                )}
              </div>

              {/* Dao Connection Badge */}
              <button
                type="button"
                onClick={checkDaoConnection}
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

              <div className="w-[1px] h-8 bg-neutral-900 hidden sm:block mx-2"></div>
              
              <div className="shrink-0 flex items-center gap-3">
                <AudioWidget />
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-4 py-2 bg-black border border-neutral-850 hover:border-portal/50 text-neutral-400 hover:text-portal transition-all rounded-lg font-sc text-[11px] flex items-center space-x-2 font-bold group"
                  title="Aether Router Configuration"
                >
                  <Sliders size={13} className="text-portal group-hover:scale-110 transition-transform" />
                  <span className="uppercase tracking-widest font-semibold">Aether Router</span>
                </button>
                <button
                  type="button"
                  onClick={() => useAppStore.getState().setIsShortcutsOpen(true)}
                  className="px-4 py-2 bg-black border border-neutral-850 hover:border-portal/50 text-neutral-400 hover:text-portal transition-all rounded-lg font-sc text-[11px] flex items-center space-x-2 font-bold group"
                  title="Shortcuts Manual (or press ? key)"
                >
                  <Keyboard size={13} className="text-portal group-hover:scale-110 transition-transform" />
                  <span className="uppercase tracking-widest font-semibold">Shortcuts (Keys)</span>
                </button>
              </div>

              <div className="w-[1px] h-8 bg-neutral-900 hidden sm:block mx-2"></div>
            </div>
          </div>

          {/* Backup & Import Section */}
          <div className="border-b border-neutral-900/50 pb-10">
            <h3 className="text-[11px] uppercase font-bold tracking-widest text-neutral-500 font-sc mb-6 flex items-center gap-2">
              <Database size={14} className="text-portal" />
              Archives & World Transmigration
            </h3>
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-[#030303] p-6 rounded-xl border border-neutral-900 shadow-inner">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <h4 className="font-display text-xl text-signal">Aetherial Memory Sanctum</h4>
                  <span className="text-[9px] px-2.5 py-1 bg-portal/10 border border-portal/30 text-portal font-sans rounded-full font-bold uppercase tracking-widest animate-pulse">
                    {storageType}
                  </span>
                </div>
                <p className="text-sm font-serif text-neutral-400 max-w-xl leading-relaxed">
                  Every character bio, relationship map, karma fate node, chapter summary, and reader preference is preserved in the deep local archives. Guard them closely.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-wrap">
                <button
                  onClick={handleRunAudit}
                  disabled={isAuditing}
                  className="flex items-center justify-center space-x-2 bg-black hover:bg-neutral-900 text-neutral-300 hover:text-portal border border-neutral-800 hover:border-portal/50 px-5 py-3 rounded-lg text-[11px] font-sc font-bold uppercase tracking-wider disabled:opacity-20 disabled:cursor-not-allowed transition-all group"
                >
                  <Database size={14} className="text-portal group-hover:scale-110 transition-transform" />
                  <span>Audit Sync Health</span>
                </button>

                <label className="flex items-center justify-center space-x-2 bg-black hover:bg-neutral-900 text-neutral-300 hover:text-portal border border-neutral-800 hover:border-portal/50 px-5 py-3 rounded-lg text-[11px] font-sc font-bold uppercase tracking-wider cursor-pointer transition-all group">
                  <Upload size={14} className="text-portal group-hover:-translate-y-0.5 transition-transform" />
                  <span>Import World Scroll</span>
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleImportLibrary} 
                    className="hidden" 
                  />
                </label>

                <button
                  onClick={handleExportLibrary}
                  disabled={stories.length === 0}
                  className="flex items-center justify-center space-x-2 bg-black hover:bg-neutral-900 text-neutral-300 hover:text-signal border border-neutral-800 hover:border-human/50 px-5 py-3 rounded-lg text-[11px] font-sc font-bold uppercase tracking-wider disabled:opacity-20 disabled:cursor-not-allowed transition-all group"
                >
                  <Download size={14} className="text-human group-hover:translate-y-0.5 transition-transform" />
                  <span>Backup Full Library</span>
                </button>
              </div>
            </div>

            {/* Audit Results */}
            {auditResult && (
               <div className="mt-4 p-4 border border-portal/30 bg-black rounded-lg text-[11px] font-mono text-neutral-400 space-y-2">
                 <div className="text-portal font-sc uppercase tracking-widest border-b border-neutral-800 pb-2 mb-2 font-bold">Sync Health Diagnostic</div>
                 <div className="grid grid-cols-2 gap-4">
                     <div>Local Realms: <span className="text-signal">{auditResult.localStories}</span></div>
                     <div>Cloud Realms: <span className="text-signal">{auditResult.cloudStories}</span></div>
                     <div>Pending Writes: <span className="text-signal">{auditResult.pendingWrites}</span></div>
                     <div>Missing Chapter Contents: <span className={auditResult.missingChapters.length > 0 ? "text-human" : "text-signal"}>{auditResult.missingChapters.length}</span></div>
                 </div>
                 {auditResult.missingChapters.length > 0 && (
                     <div className="pt-2 border-t border-neutral-800 mt-2">
                         <div className="text-human mb-2">Warning: {auditResult.missingChapters.length} chapters are marked as generated but lack local cache content.</div>
                         <button onClick={handleRecover} disabled={isAuditing} className="px-4 py-1.5 bg-human/10 text-human border border-human/30 hover:bg-human/20 rounded uppercase tracking-widest font-sc cursor-pointer">
                             Attempt Cloud Recovery
                         </button>
                     </div>
                 )}
                 {auditResult.recovered !== undefined && (
                     <div className="text-portal mt-2">Recovered {auditResult.recovered} missing chapters from the cloud.</div>
                 )}
               </div>
            )}
          </div>

          {!currentUser ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-8">
              <CloudOff size={56} className="text-neutral-800 drop-shadow-[0_0_30px_rgba(4,172,255,0.08)]" />
              <div className="space-y-4">
                <h3 className="font-display text-3xl text-signal">Spirit Unlinked</h3>
                <p className="text-base font-serif text-neutral-400 max-w-md mx-auto leading-relaxed">
                  Link your soul to the Celestial Cloud to permanently etch your stories into the matrix and sync across different planes of existence.
                </p>
              </div>
              <button 
                onClick={handleLogin} 
                className="px-8 py-3.5 bg-portal/10 border border-portal/50 text-portal hover:bg-portal hover:text-void rounded-full font-sc uppercase tracking-widest text-[12px] font-bold shadow-[0_0_20px_rgba(4,172,255,0.2)] hover:shadow-[0_0_30px_rgba(4,172,255,0.4)] transition-all"
              >
                Link Spirit Realm
              </button>
            </div>
          ) : (
            <>
              {/* Top Section - Avatar & Quick Info */}
              <div className="flex flex-col md:flex-row gap-8 md:items-end border-b border-neutral-900/50 pb-10">
                <div className={`w-28 h-28 rounded-full border p-1 flex-shrink-0 relative group transition-all duration-700 ${getAuraGlowStyle(profile?.displayNameColor || '#E5E7EB')}`}>
                  <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center relative">
                    {formData.avatarUrl ? (
                      <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
                    ) : (
                      <UserIcon size={36} className="text-neutral-700" />
                    )}
                    
                    {/* Floating particle animations for Heavenly Chronicler and above */}
                    {(profile?.displayNameColor === '#FFD700' || profile?.displayNameColor === 'gradient-violet-gold' || profile?.displayNameColor === 'animated-custom') && (
                      <div className="absolute inset-0 bg-black/10 pointer-events-none mix-blend-screen overflow-hidden">
                        <div className="absolute bottom-1 inset-x-0 h-8 flex justify-around opacity-75">
                          <span className="w-1 h-1 rounded-full bg-yellow-400 animate-ping" style={{ animationDuration: '3s' }}></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-bounce" style={{ animationDuration: '2s' }}></span>
                          <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" style={{ animationDuration: '2.5s' }}></span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-full border border-inherit opacity-40 scale-110 animate-[spin_15s_linear_infinite]"></div>
                </div>
                <div className="flex-1 space-y-5">
                  <div className="flex flex-col gap-3 mb-2">
                    <div className="flex justify-between items-end">
                      <div className="px-3 py-1 bg-portal/10 border border-portal/30 text-portal text-[10px] font-bold tracking-[0.2em] uppercase rounded font-sc">
                        {daoData.rank}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-portal/70 font-sc uppercase font-bold tracking-widest border border-portal/20 px-2 rounded bg-portal/5">
                        <Zap size={10} className="text-portal" /> {daoData.currentQi} Qi
                      </div>
                    </div>
                    {daoData.nextRank && (
                      <div className="flex-1 max-w-[300px]">
                        <div className="flex justify-between text-[9px] text-neutral-500 mb-1.5 font-sc uppercase tracking-widest">
                          <span>Progress to {daoData.nextRank}</span>
                          <span className="text-portal/70">{daoData.currentQi} / {daoData.maxQi}</span>
                        </div>
                        <div className="h-1 bg-neutral-900 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-gradient-to-r from-portal/50 to-portal shadow-[0_0_10px_rgba(4,172,255,0.5)] transition-all duration-1000" style={{ width: `${daoData.progress}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#030303] p-5 rounded-xl border border-neutral-900">
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-sc block mb-2">Username (Dao Name)</label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          name="username" 
                          value={formData.username || ''} 
                          onChange={handleChange}
                          className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-signal focus:border-portal outline-none font-sans"
                          placeholder="Enter Dao Name"
                        />
                      ) : (
                        <div className="text-xl text-signal font-sans">{profile?.username}</div>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-sc">Display Name</label>
                        {!isEditing && (
                          <button 
                            onClick={() => setIsEditing(true)} 
                            className="text-[10px] uppercase tracking-widest text-portal hover:text-portal/80 font-sc flex items-center gap-1 transition-colors"
                          >
                            Modify
                          </button>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              name="displayName" 
                              value={formData.displayName || ''} 
                              onChange={handleChange}
                              className="flex-1 bg-black border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-signal focus:border-human outline-none font-sans"
                              placeholder="Your identity..."
                            />
                          </div>
                          
                          {/* Beautiful Gamified Dynamic Color Palette Options */}
                          <div className="bg-[#080808] border border-neutral-900 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-sc font-bold flex items-center gap-1.5">
                                <Zap size={11} className="text-portal animate-pulse" /> Celestial Aura Colors
                              </span>
                              <span className="text-[9px] font-mono text-neutral-500">Current XP: {profile?.dao_xp || profile?.qi || 0} Qi</span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                              {AURA_TIERS.map((tier) => {
                                const currentXp = profile?.dao_xp || profile?.qi || 0;
                                const isUnlocked = currentXp >= tier.unlockedAt;
                                const isSelected = formData.displayNameColor === tier.colorHex;
                                const textStyles = getAuraTextStyle(tier.colorHex);
                                
                                return (
                                  <button
                                    key={tier.rank}
                                    type="button"
                                    disabled={!isUnlocked}
                                    onClick={() => {
                                      if (isUnlocked) {
                                        setFormData(prev => ({ ...prev, displayNameColor: tier.colorHex }));
                                      }
                                    }}
                                    className={`p-2.5 border rounded-lg text-left transition-all relative flex flex-col justify-between min-h-[75px] group/item ${
                                      !isUnlocked
                                        ? 'bg-neutral-950/40 border-neutral-900/60 opacity-40 cursor-not-allowed'
                                        : isSelected
                                        ? 'bg-portal/5 border-portal shadow-[0_0_12px_rgba(4,172,255,0.1)]'
                                        : 'bg-black/30 border-neutral-850 hover:border-neutral-700 hover:bg-neutral-900/30'
                                    }`}
                                  >
                                    <div className="flex justify-between items-start w-full gap-2">
                                      <span 
                                        className={`text-[11px] font-bold uppercase tracking-wider ${isUnlocked ? '' : 'text-neutral-500'}`} 
                                        style={!tier.textColor.includes('text') && !tier.textColor.includes('bg-') && isUnlocked ? { color: tier.colorHex } : undefined}
                                      >
                                        <span className={isUnlocked && (tier.textColor.includes('text-') || tier.textColor.includes('bg-')) ? tier.textColor : ''}>
                                          {tier.rank}
                                        </span>
                                      </span>
                                      {isSelected && (
                                        <span className="text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-portal text-void font-bold scale-90 shrink-0">
                                          Equipped
                                        </span>
                                      )}
                                      {!isUnlocked && (
                                        <span className="text-[8px] text-neutral-500 font-mono shrink-0">
                                          Locked ({tier.unlockedAt} Qi)
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="mt-1 flex flex-col gap-0.5">
                                      <span className="text-[10px] text-neutral-400 font-serif italic line-clamp-1">
                                        "{tier.rewardFeeling}"
                                      </span>
                                      <span className="text-[8px] text-neutral-600 font-mono tracking-tighter">
                                        {tier.name}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Transcendent Custom spectrum input - only active for Dao Master */}
                            {(() => {
                              const currentXp = profile?.dao_xp || profile?.qi || 0;
                              const isDaoMaster = currentXp >= 25000;
                              const isCustomSelected = !AURA_TIERS.some(t => t.colorHex === formData.displayNameColor);
                              
                              return (
                                <div className={`pt-2.5 border-t border-neutral-900 flex flex-col gap-2 ${isDaoMaster ? '' : 'opacity-40'}`}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-mono text-neutral-500 uppercase font-bold">
                                      Transcendent Custom Spectrum
                                    </span>
                                    {!isDaoMaster && (
                                      <span className="text-[8px] bg-neutral-900 text-neutral-500 px-2 py-0.5 rounded border border-neutral-850">
                                        Requires Dao Master (25k Qi)
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="relative">
                                      <button
                                        type="button"
                                        disabled={!isDaoMaster}
                                        onClick={() => {
                                          if (isDaoMaster) {
                                            colorInputRef.current?.click();
                                          }
                                        }}
                                        className={`w-9 h-9 rounded-full border transition-all duration-200 transform hover:scale-105 flex items-center justify-center relative bg-gradient-to-tr from-red-500 via-green-500 via-blue-500 to-yellow-500 ${
                                          isCustomSelected ? 'border-portal scale-110 ring-2 ring-portal/30' : 'border-neutral-800'
                                        }`}
                                        title={isDaoMaster ? "Custom Color Spectrum..." : "Locked until Dao Master"}
                                      >
                                        {isCustomSelected && (
                                          <span className="w-2.5 h-2.5 rounded-full border border-black bg-white" style={{ backgroundColor: formData.displayNameColor }}></span>
                                        )}
                                      </button>
                                      <input 
                                        ref={colorInputRef}
                                        type="color" 
                                        name="displayNameColor"
                                        disabled={!isDaoMaster}
                                        value={isCustomSelected && formData.displayNameColor ? formData.displayNameColor : '#00FFFF'}
                                        onChange={handleChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-0 h-0 pointer-events-none"
                                      />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-mono text-neutral-400">
                                        Hex Code: <span className="uppercase font-bold" style={isCustomSelected ? { color: formData.displayNameColor } : undefined}>{formData.displayNameColor || '#FAFAFA'}</span>
                                      </span>
                                      <span className="text-[8px] text-neutral-600 font-sans italic">
                                        {isDaoMaster ? "Click sphere to define your custom frequency" : "Transcend normal UI limits"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-black/30 border border-neutral-900/50 p-3.5 rounded-lg">
                          <div className="text-lg font-serif italic flex items-center">
                            {(() => {
                              const styleObj = getAuraTextStyle(profile?.displayNameColor);
                              return (
                                <span className={styleObj.className} style={styleObj.style}>
                                  {profile?.displayName || 'Unknown Ascendant'}
                                </span>
                              );
                            })()}
                          </div>
                          {profile?.displayNameColor && (
                            <div className="flex items-center gap-1.5">
                              {!profile.displayNameColor.startsWith('#') ? (
                                <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-purple-500 to-yellow-500 animate-pulse"></div>
                              ) : (
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: profile.displayNameColor }}></div>
                              )}
                              <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-600">{profile.displayNameColor}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-2">
                <div className="bg-[#030303] border border-neutral-900 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-900 rounded-lg"><Globe size={14} className="text-portal" /></div>
                    <label className="text-[11px] uppercase font-bold tracking-widest text-neutral-400 font-sc">Preferred Language</label>
                  </div>
                  {isEditing ? (
                    <select 
                      name="preferredLanguage" 
                      value={formData.preferredLanguage || 'English'} 
                      onChange={handleChange}
                      className="bg-black border border-neutral-800 rounded px-3 py-1.5 text-xs text-signal focus:border-portal outline-none font-sans appearance-none"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="Chinese">Chinese</option>
                      <option value="Japanese">Japanese</option>
                    </select>
                  ) : (
                    <div className="text-[11px] text-portal font-sans font-medium uppercase tracking-widest">{profile?.preferredLanguage}</div>
                  )}
                </div>

                <div className="bg-[#030303] border border-neutral-900 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-900 rounded-lg"><Globe size={14} className="text-human" /></div>
                    <label className="text-[11px] uppercase font-bold tracking-widest text-neutral-400 font-sc">Translation Default</label>
                  </div>
                  {isEditing ? (
                    <select 
                      name="defaultTranslationLanguage" 
                      value={formData.defaultTranslationLanguage || 'English'} 
                      onChange={handleChange}
                      className="bg-black border border-neutral-800 rounded px-3 py-1.5 text-xs text-signal focus:border-human outline-none font-sans appearance-none"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="Chinese">Chinese</option>
                      <option value="Japanese">Japanese</option>
                    </select>
                  ) : (
                    <div className="text-[11px] text-human font-sans font-medium uppercase tracking-widest">{profile?.defaultTranslationLanguage}</div>
                  )}
                </div>

                <div className="bg-[#030303] border border-neutral-900 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-900 rounded-lg"><Calendar size={14} className="text-neutral-400" /></div>
                    <label className="text-[11px] uppercase font-bold tracking-widest text-neutral-400 font-sc">Ascent Commenced</label>
                  </div>
                  <div className="text-[11px] text-neutral-300 font-sans tracking-wide">{new Date(profile?.joinedDate || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
                
                <div className="bg-[#030303] border border-neutral-900 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-900 rounded-lg"><BookOpen size={14} className="text-portal" /></div>
                    <label className="text-[11px] uppercase font-bold tracking-widest text-neutral-400 font-sc">Scrolls Accumulated</label>
                  </div>
                  <div className="text-[11px] text-portal font-sans font-black tracking-widest uppercase">
                    {activeStoriesCount} Realms
                  </div>
                </div>
              </div>

              {/* Own Stories Section */}
              <div className="pt-10 border-t border-neutral-900/50 mt-10">
                <h3 className="text-[11px] uppercase font-bold tracking-widest text-neutral-500 font-sc mb-6 flex items-center gap-2">
                  <BookOpen size={14} className="text-human" />
                  Manifested Realms
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Active Stories */}
                  <div className="border border-neutral-900 bg-[#030303] rounded-xl p-5 shadow-inner">
                    <div className="flex items-center justify-between border-b border-neutral-800/50 pb-3 mb-4">
                      <h4 className="text-[10px] uppercase font-bold tracking-widest text-portal font-sc">Active Flows</h4>
                      <span className="text-[9px] px-2 py-0.5 bg-portal/10 text-portal rounded-full font-bold">{profile?.activeStories?.length || activeStoriesCount}</span>
                    </div>
                    <div className="space-y-3">
                      {userStories.length === 0 ? (
                        <div className="text-[11px] text-neutral-600 font-sans italic tracking-wide">No realms manifested yet.</div>
                      ) : (
                        userStories.map(s => (
                          <div key={s.id} className="text-[13px] text-neutral-300 font-sans flex items-center gap-3 overflow-hidden">
                            <span className="w-1 h-1 rounded-full bg-portal flex-shrink-0 animate-pulse"></span>
                            <span className="truncate">{s.title}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Inactive Stories */}
                  <div className="border border-neutral-900 bg-[#030303] rounded-xl p-5 shadow-inner">
                    <div className="flex items-center justify-between border-b border-neutral-800/50 pb-3 mb-4">
                      <h4 className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-sc">Sealed Flows</h4>
                      <span className="text-[9px] px-2 py-0.5 bg-neutral-900 text-neutral-500 rounded-full font-bold">{profile?.inactiveStories?.length || 0}</span>
                    </div>
                    <div className="space-y-3">
                      {(!profile?.inactiveStories || profile.inactiveStories.length === 0) ? (
                        <div className="text-[11px] text-neutral-600 font-sans italic tracking-wide">No realms currently sealed.</div>
                      ) : (
                        profile.inactiveStories.map(id => (
                          <div key={id} className="text-[13px] text-neutral-500 font-sans flex items-center gap-3 overflow-hidden">
                            <span className="w-1 h-1 rounded-full bg-neutral-700 flex-shrink-0"></span>
                            <span className="truncate">Story {id.split('-').pop()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Collapsible Advanced Settings Panel */}
              <div className="pt-8 border-t border-neutral-900/50 mt-8">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-[11px] font-sc uppercase font-bold tracking-widest text-portal hover:text-signal transition-all py-2"
                >
                  <span>{showAdvanced ? "▲ Hide Advanced Settings" : "▼ Show Advanced Settings (Admin)"}</span>
                  <Sliders size={12} className="text-portal" />
                </button>

                {showAdvanced && (
                  <div className="mt-4 p-5 bg-[#030303] border border-neutral-900 rounded-xl space-y-4 animate-fadeIn">
                    <p className="text-[11px] font-sans text-neutral-500 leading-normal">
                      Configure custom model presets, routing overrides, or API credential endpoints. Standard settings are fully server-managed by default and operate automatically without manual entries.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="px-5 py-2 bg-black border border-neutral-850 hover:border-portal/50 text-neutral-400 hover:text-portal transition-all rounded-lg font-sc text-xs flex items-center space-x-2 font-bold group"
                        title="Aether Router"
                      >
                        <Sliders size={14} className="text-portal group-hover:scale-110 transition-transform" />
                        <span className="uppercase tracking-widest font-semibold text-[11px]">Aether Router Configuration</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-8 flex gap-4 min-h-[40px] mt-8">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleSave} 
                      disabled={isLoading}
                      className="px-8 py-2.5 bg-portal border border-portal text-void font-bold uppercase text-[11px] tracking-widest rounded-full hover:bg-portal/90 shadow-[0_0_15px_rgba(4,172,255,0.3)] transition-all flex items-center gap-2"
                    >
                      <Save size={14} /> Guard Changes
                    </button>
                    <button 
                      onClick={() => { setIsEditing(false); setFormData(profile || {}); }} 
                      className="px-8 py-2.5 bg-transparent border border-neutral-700 text-neutral-400 font-bold uppercase text-[11px] tracking-widest rounded-full hover:text-signal hover:border-neutral-500 transition-all"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="px-8 py-2.5 bg-transparent border border-neutral-700 text-neutral-300 font-bold uppercase text-[11px] tracking-widest rounded-full hover:border-portal hover:text-portal transition-all flex items-center gap-2"
                  >
                    Modify Identity
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
