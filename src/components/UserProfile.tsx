import React, { useState, useEffect } from 'react';
import { UserProfile as UserProfileType, Story } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { LogOut, Save, User as UserIcon, Calendar, BookOpen, Globe } from 'lucide-react';

interface UserProfileProps {
  currentUser: any;
  stories: Story[];
  onLogout: () => void;
  onNavigateHome: () => void;
}

export default function UserProfile({ currentUser, stories, onLogout, onNavigateHome }: UserProfileProps) {
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfileType>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    
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
  const userStories = stories.filter(s => s.userId === currentUser.uid || (!s.userId));
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

  if (isLoading && !profile) {
    return <div className="p-8 text-center text-neutral-400 font-sc">Accessing Celestial Record...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="bg-void border border-neutral-900 rounded-xl overflow-hidden shadow-2xl">
        <div className="bg-[#0a0a0a] p-6 border-b border-neutral-850 flex justify-between items-center">
          <h2 className="font-display text-2xl text-signal flex items-center gap-2">
            <UserIcon className="text-portal" /> 
            Soul Profile
          </h2>
          <button onClick={onLogout} className="px-4 py-2 border border-human text-human hover:bg-human hover:text-signal rounded text-xs font-sc font-bold tracking-wider transition-colors flex items-center gap-2">
            <LogOut size={14} /> Sever Link
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-950/30 border-b border-red-900/50 text-red-400 text-sm font-mono">
            {error}
          </div>
        )}

        <div className="p-6 md:p-8 space-y-8">
          {/* Top Section - Avatar & Quick Info */}
          <div className="flex flex-col md:flex-row gap-6 md:items-end border-b border-neutral-900 pb-8">
            <div className="w-24 h-24 rounded-full border-2 border-neutral-800 overflow-hidden bg-neutral-950 flex-shrink-0 flex items-center justify-center relative">
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
        </div>
      </div>
    </div>
  );
}
