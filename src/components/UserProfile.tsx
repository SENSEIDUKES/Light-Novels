import React, { useState, useEffect } from 'react';
import { UserProfile as UserProfileType, Story } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { LogOut, Save, User as UserIcon, Calendar, BookOpen, Globe, Cloud, CloudOff, RefreshCw, Sliders, Upload, Download, Database } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';
import { AudioWidget } from './AudioWidget';

interface UserProfileProps {
  currentUser: any;
  stories: Story[];
  onLogout: () => void;
  onNavigateHome: () => void;
}

export default function UserProfile({ currentUser, stories, onLogout, onNavigateHome }: UserProfileProps) {
  const { syncStatus, lastSavedTime, setIsSettingsOpen, handleExportLibrary, handleImportLibrary, storageType } = useAppStore();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfileType>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
      await setDoc(doc(db, 'users', currentUser.uid), {
        ...formData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
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

  if (isLoading && !profile && currentUser) {
    return <div className="p-8 text-center text-neutral-400 font-sc tracking-widest uppercase">Accessing Celestial Record...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="bg-void border border-neutral-900 rounded-xl overflow-hidden shadow-2xl">
        <div className="bg-[#0a0a0a] p-6 border-b border-neutral-850 flex justify-between items-center">
          <h2 className="font-display text-2xl text-signal flex items-center gap-2">
            <Cloud className="text-[#00A86B]" size={28} /> 
            Celestial Tools
          </h2>
          {currentUser && (
            <button onClick={onLogout} className="px-4 py-2 border border-human text-human hover:bg-human hover:text-signal rounded text-xs font-sc font-bold tracking-wider transition-colors flex items-center gap-2">
              <LogOut size={14} /> Sever Link
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-950/30 border-b border-red-900/50 text-red-400 text-sm font-mono">
            {error}
          </div>
        )}

        <div className="p-6 md:p-8 space-y-8">
          
          {/* Celestial Tools Section (Always Visible) */}
          <div className="border-b border-neutral-900 pb-8">
            <h3 className="text-[12px] uppercase font-bold tracking-widest text-neutral-400 font-sc mb-4 flex items-center gap-2">
              <Sliders size={14} className="text-portal" />
              Environment & Sync Settings
            </h3>
            <div className="flex flex-wrap items-center gap-4 border border-neutral-850 p-4 rounded bg-[#0f0f0f]">
              <div className="flex items-center space-x-2 border border-neutral-800 px-3 py-1.5 rounded bg-black">
                {syncStatus === 'offline' ? (
                  <button onClick={() => storyStorage.performSync()} title="Offline / Local Only. Click to sync" className="flex items-center space-x-2 hover:text-portal transition-colors"><CloudOff size={14} className="text-neutral-500" /> <span className="text-xs font-mono text-neutral-400">Offline</span></button>
                ) : syncStatus === 'syncing' ? (
                  <span title="Syncing..." className="flex items-center space-x-2"><RefreshCw size={14} className="text-portal animate-spin" /> <span className="text-xs font-mono text-portal">Syncing...</span></span>
                ) : syncStatus === 'error' ? (
                  <button onClick={() => storyStorage.performSync()} title="Sync Error. Click to retry" className="flex items-center space-x-2 hover:text-portal transition-colors"><CloudOff size={14} className="text-human" /> <span className="text-xs font-mono text-human">Sync Error</span></button>
                ) : (
                  <button onClick={() => storyStorage.performSync()} title="Synced to Firebase. Click to force sync" className="flex items-center space-x-2 hover:text-portal transition-colors"><Cloud size={14} className="text-[#00A86B]" /> <span className="text-xs font-mono text-[#00A86B]">Synced</span></button>
                )}
              </div>
              {lastSavedTime && (
                <div className="text-[10px] font-mono text-neutral-500">
                  Auto-saved: {new Date(lastSavedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              )}

              <div className="w-[1px] h-6 bg-neutral-800 hidden sm:block mx-2"></div>
              
              <div className="shrink-0 flex items-center">
                <AudioWidget />
              </div>

              <div className="w-[1px] h-6 bg-neutral-800 hidden sm:block mx-2"></div>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-4 py-1.5 bg-black border border-neutral-800 hover:border-portal text-neutral-400 hover:text-portal transition-all rounded font-sc text-xs flex items-center space-x-2 font-bold"
                title="Aether Router"
              >
                <Sliders size={12} className="text-portal" />
                <span className="uppercase tracking-widest font-semibold">Aether Router Configuration</span>
              </button>
            </div>
          </div>

          {/* Backup & Import Section */}
          <div className="border-b border-neutral-900 pb-8">
            <h3 className="text-[12px] uppercase font-bold tracking-widest text-neutral-400 font-sc mb-4 flex items-center gap-2">
              <Database size={14} className="text-portal" />
              Import World & Backup Full Library Options
            </h3>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border border-neutral-850 p-4 rounded bg-[#0f0f0f]">
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-sc font-bold text-sm text-signal uppercase tracking-wider">Aetherial Memory Sanctum</h4>
                  <span className="text-[10px] px-2 py-0.25 bg-[#00A86B]/15 border border-[#00A86B]/35 text-[#00A86B] font-mono rounded-full font-bold uppercase tracking-wider animate-fadeIn">
                    {storageType}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
                  Every character bio, relationship map, karma fate node, chapter summary, and reader preference is saved automatically to your local-first client-side database.
                </p>
              </div>

              <div className="flex flex-wrap gap-3.5 w-full md:w-auto justify-end">
                <label className="flex items-center space-x-2 bg-void hover:bg-neutral-900 text-neutral-300 hover:text-signal border border-neutral-800 hover:border-neutral-700 px-4 py-2 rounded text-xs font-sc font-bold uppercase tracking-wider cursor-pointer transition-all">
                  <Upload size={14} className="text-portal" />
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
                  className="flex items-center space-x-2 bg-void hover:bg-neutral-900 text-neutral-350 hover:text-signal border border-neutral-800 hover:border-neutral-700 px-4 py-2 rounded text-xs font-sc font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Download size={14} className="text-gold-accent" />
                  <span>Backup Full Library</span>
                </button>
              </div>
            </div>
          </div>

          {!currentUser ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <CloudOff size={48} className="text-neutral-800 drop-shadow-[0_0_15px_rgba(255,255,255,0.05)]" />
              <div className="space-y-2">
                <h3 className="font-display text-xl text-neutral-400">Spirit Unlinked</h3>
                <p className="text-sm text-neutral-500 max-w-md mx-auto">Link your soul to the Celestial Cloud to permanently etch your stories into the matrix and sync across different planes of existence.</p>
              </div>
              <button onClick={handleLogin} className="px-6 py-3 bg-neutral-900 border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] transition-all rounded font-sc uppercase tracking-widest text-sm font-bold shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                Link Spirit Realm
              </button>
            </div>
          ) : (
            <>
              {/* Top Section - Avatar & Quick Info */}
              <div className="flex flex-col md:flex-row gap-6 md:items-end border-b border-neutral-900 pb-8">
                <div className="w-24 h-24 rounded-full border-2 border-neutral-800 overflow-hidden bg-neutral-950 flex-shrink-0 flex items-center justify-center relative shadow-[0_0_20px_rgba(4,172,255,0.15)]">
                  {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon size={32} className="text-neutral-700" />
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-sc block mb-1">Username (Dao Name)</label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          name="username" 
                          value={formData.username || ''} 
                          onChange={handleChange}
                          className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-sm text-signal focus:border-portal outline-none font-mono"
                        />
                      ) : (
                        <div className="text-lg text-signal font-mono">{profile?.username}</div>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-sc block mb-1">Display Name</label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          name="displayName" 
                          value={formData.displayName || ''} 
                          onChange={handleChange}
                          className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-sm text-signal focus:border-portal outline-none font-sans"
                        />
                      ) : (
                        <div className="text-lg text-neutral-300 font-sans">{profile?.displayName || 'Unknown Ascendant'}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-sc block mb-1 flex items-center gap-1">
                    <Globe size={12} /> Preferred Language
                  </label>
                  {isEditing ? (
                    <select 
                      name="preferredLanguage" 
                      value={formData.preferredLanguage || 'English'} 
                      onChange={handleChange}
                      className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-sm text-signal focus:border-portal outline-none font-sans"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="Chinese">Chinese</option>
                      <option value="Japanese">Japanese</option>
                    </select>
                  ) : (
                    <div className="text-sm text-neutral-300 font-sans px-3 py-2 bg-neutral-950/50 rounded border border-transparent">{profile?.preferredLanguage}</div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-sc block mb-1 flex items-center gap-1">
                    <Globe size={12} /> Translation Default
                  </label>
                  {isEditing ? (
                    <select 
                      name="defaultTranslationLanguage" 
                      value={formData.defaultTranslationLanguage || 'English'} 
                      onChange={handleChange}
                      className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-sm text-signal focus:border-portal outline-none font-sans"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="Chinese">Chinese</option>
                      <option value="Japanese">Japanese</option>
                    </select>
                  ) : (
                    <div className="text-sm text-neutral-300 font-sans px-3 py-2 bg-neutral-950/50 rounded border border-transparent">{profile?.defaultTranslationLanguage}</div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-sc block mb-1 flex items-center gap-1">
                    <Calendar size={12} /> Ascent Commenced
                  </label>
                  <div className="text-sm text-neutral-400 font-mono px-3 py-2 bg-neutral-950/50 rounded">{new Date(profile?.joinedDate || Date.now()).toLocaleDateString()}</div>
                </div>
                
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-sc block mb-1 flex items-center gap-1">
                    <BookOpen size={12} /> Scrolls Accumulated
                  </label>
                  <div className="text-sm text-neutral-400 font-mono px-3 py-2 bg-neutral-950/50 rounded">
                    {activeStoriesCount} stories manifesting
                  </div>
                </div>
              </div>

              {/* Own Stories Section */}
              <div className="pt-6 border-t border-neutral-900">
                <h3 className="text-[12px] uppercase font-bold tracking-widest text-neutral-400 font-sc mb-4 flex items-center gap-2">
                  <BookOpen size={14} className="text-gold-accent" />
                  Manifested Realms (Own Stories)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Active Stories */}
                  <div className="border border-neutral-850 bg-neutral-950/50 rounded-lg p-4">
                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-portal font-sc mb-3 border-b border-neutral-850 pb-2">Active Flows ({profile?.activeStories?.length || activeStoriesCount})</h4>
                    <div className="space-y-2">
                      {userStories.length === 0 ? (
                        <div className="text-xs text-neutral-600 font-sans italic">No realms manifested yet.</div>
                      ) : (
                        userStories.map(s => (
                          <div key={s.id} className="text-sm text-neutral-300 font-sans flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-portal"></span>
                            <span className="truncate">{s.title}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Inactive Stories */}
                  <div className="border border-neutral-850 bg-neutral-950/50 rounded-lg p-4">
                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-sc mb-3 border-b border-neutral-850 pb-2">Sealed Flows ({profile?.inactiveStories?.length || 0})</h4>
                    <div className="space-y-2">
                      {(!profile?.inactiveStories || profile.inactiveStories.length === 0) ? (
                        <div className="text-xs text-neutral-600 font-sans italic">No realms currently sealed.</div>
                      ) : (
                        profile.inactiveStories.map(id => (
                          <div key={id} className="text-sm text-neutral-500 font-sans flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-700"></span>
                            <span className="truncate">Story {id.split('-').pop()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-4 min-h-[40px] border-t border-neutral-900 mt-6">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleSave} 
                      disabled={isLoading}
                      className="px-6 py-2 bg-portal border border-portal text-void font-bold uppercase text-xs tracking-wider rounded hover:bg-portal/80 transition-colors flex items-center gap-2"
                    >
                      <Save size={14} /> Guard Changes
                    </button>
                    <button 
                      onClick={() => { setIsEditing(false); setFormData(profile || {}); }} 
                      className="px-6 py-2 bg-transparent border border-neutral-700 text-neutral-400 font-bold uppercase text-xs tracking-wider rounded hover:text-signal hover:border-neutral-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="px-6 py-2 bg-transparent border border-neutral-700 text-neutral-300 font-bold uppercase text-xs tracking-wider rounded hover:border-portal hover:text-portal transition-colors flex items-center gap-2"
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
