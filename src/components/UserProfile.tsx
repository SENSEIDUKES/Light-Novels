import React, { useState, useEffect } from 'react';
import { UserProfile as UserProfileType, Story, AppUser } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { LogOut, Save, User as UserIcon, Calendar, BookOpen, Globe, Cloud, CloudOff, RefreshCw, Sliders, Upload, Download, Database, Zap, Keyboard, Flame, Award, Shield, Compass, Key, Sparkles, Search, Sword, HelpCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';
import { getDaoRankData, AURA_TIERS, getAuraTextStyle, getAuraGlowStyle } from '../lib/qi';
import { getApiHeaders } from '../hooks/storyEngineHelpers';

interface UserProfileProps {
  currentUser: AppUser | null;
  stories: Story[];
  onLogout: () => void;
  onNavigateHome: () => void;
}

export default function UserProfile({ currentUser, stories, onLogout, onNavigateHome }: UserProfileProps) {
  const syncStatus = useAppStore(state => state.syncStatus);
    const lastSavedTime = useAppStore(state => state.lastSavedTime);
    const setIsSettingsOpen = useAppStore(state => state.setIsSettingsOpen);
    const handleExportLibrary = useAppStore(state => state.handleExportLibrary);
    const handleImportLibrary = useAppStore(state => state.handleImportLibrary);
    const storageType = useAppStore(state => state.storageType);
    const localGeminiKey = useAppStore(state => state.localGeminiKey);
    const localOpenrouterKey = useAppStore(state => state.localOpenrouterKey);
    const localOllamaHost = useAppStore(state => state.localOllamaHost);
    const isSettingsOpen = useAppStore(state => state.isSettingsOpen);
    const activeStoryId = useAppStore(state => state.activeStoryId);
    const routingConfig = useAppStore(state => state.routingConfig);
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfileType>>({});
  const [isLoading, setIsLoading] = useState(true);
  const colorInputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Admin / Owner Control Panel States
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'users' | 'stories'>('users');
  const [allUsers, setAllUsers] = useState<UserProfileType[]>([]);
  const [allStories, setAllStories] = useState<any[]>([]);
  const [isFetchingAdminData, setIsFetchingAdminData] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminError, setAdminError] = useState('');

  // Language safeguard states
  const [pendingLanguageChange, setPendingLanguageChange] = useState<{ preferred: string, translation: string, prevPreferred: string, prevTranslation: string } | null>(null);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!pendingLanguageChange) return;
    if (countdown <= 0) {
      // Revert changes when timer expires
      setFormData(prev => ({
        ...prev,
        preferredLanguage: pendingLanguageChange.prevPreferred,
        defaultTranslationLanguage: pendingLanguageChange.prevTranslation
      }));
      useAppStore.setState(state => ({
        userProfile: state.userProfile ? {
          ...state.userProfile,
          preferredLanguage: pendingLanguageChange.prevPreferred,
          defaultTranslationLanguage: pendingLanguageChange.prevTranslation
        } : null
      }));
      setPendingLanguageChange(null);
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, pendingLanguageChange]);

  const confirmLanguageChange = async () => {
    if (!pendingLanguageChange) return;
    await performSave(pendingLanguageChange.preferred, pendingLanguageChange.translation);
    setPendingLanguageChange(null);
  };

  const revertLanguageChange = () => {
    if (!pendingLanguageChange) return;
    setFormData(prev => ({
        ...prev,
        preferredLanguage: pendingLanguageChange.prevPreferred,
        defaultTranslationLanguage: pendingLanguageChange.prevTranslation
    }));
    useAppStore.setState(state => ({
      userProfile: state.userProfile ? {
        ...state.userProfile,
        preferredLanguage: pendingLanguageChange.prevPreferred,
        defaultTranslationLanguage: pendingLanguageChange.prevTranslation
      } : null
    }));
    setPendingLanguageChange(null);
  };

  // Spiritual progression values derived from story/profile
  const activeStory = stories.find(s => s.id === activeStoryId);
  const currentPowerStage = activeStory?.memory?.currentPowerStage || '';
  const equippedArtifact = profile?.cosmicInventory?.find(a => a.id === profile?.equippedArtifactId);

  // Cultivator Portrait Builder states
  const [showPortraitModal, setShowPortraitModal] = useState(false);
  const [portraitUploadFile, setPortraitUploadFile] = useState<File | null>(null);
  const [portraitUploadBase64, setPortraitUploadBase64] = useState<string>('');
  const [portraitDesc, setPortraitDesc] = useState('');
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  const [generatedPortraitUrl, setGeneratedPortraitUrl] = useState('');
  const [portraitError, setPortraitError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  const generationSteps = [
    "Initializing Divine Mirror protocol...",
    "Analyzing mortal physical structures and features...",
    "Casting spiritual grid onto character aesthetics...",
    "Weaving high-tier celestial robes and artifacts...",
    "Channeling raw elemental Qi (Lightning, Fire, Frost)...",
    "Solidifying final immortal cultivator projection..."
  ];

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setPortraitError("The Divine Mirror only accepts visual images.");
      return;
    }
    setPortraitError("");
    setPortraitUploadFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPortraitUploadBase64(reader.result as string);
    };
    reader.onerror = () => {
      setPortraitError("Failed to read mortal image stream.");
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleGeneratePortrait = async () => {
    if (!portraitUploadBase64) {
      setPortraitError("You must project an image into the mirror first.");
      return;
    }
    setIsGeneratingPortrait(true);
    setPortraitError("");
    setGeneratedPortraitUrl("");
    setGenerationStep(0);

    const stepInterval = setInterval(() => {
      setGenerationStep(prev => (prev < generationSteps.length - 1 ? prev + 1 : prev));
    }, 2500);

    try {
      const apiHeaders = await getApiHeaders();
      const response = await fetch("/api/generate-cultivator-portrait", {
        method: "POST",
        headers: { ...apiHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          image: portraitUploadBase64,
          description: portraitDesc,
          daoRank: profile?.dao_rank || "Mortal Reader",
          daoXp: profile?.dao_xp || 0,
          powerStage: currentPowerStage,
          equippedArtifact: equippedArtifact ? {
            name: equippedArtifact.name,
            description: equippedArtifact.description,
            rarity: equippedArtifact.rarity
          } : null,
          routingConfig: routingConfig
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Celestial mapping failed");
      }

      const data = await response.json();
      if (data.imageUrl) {
        setGeneratedPortraitUrl(data.imageUrl);
      } else {
        throw new Error("No image URL returned from celestial plane.");
      }
    } catch (err: any) {
      console.error(err);
      setPortraitError(err.message || "Celestial connection timed out. Please retry.");
    } finally {
      clearInterval(stepInterval);
      setIsGeneratingPortrait(false);
    }
  };

  const compressDataUrl = async (dataUrl: string): Promise<string> => {
    if (!dataUrl.startsWith('data:image/') || dataUrl.length < 60000) return dataUrl;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleApplyPortrait = async () => {
    if (!generatedPortraitUrl) return;
    
    setIsLoading(true);
    let finalUrl = generatedPortraitUrl;
    try {
      finalUrl = await compressDataUrl(generatedPortraitUrl);
    } catch (e) {
      console.warn("Failed to compress portrait:", e);
    }

    setFormData(prev => ({
      ...prev,
      avatarUrl: finalUrl
    }));

    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          avatarUrl: finalUrl,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        if (profile) {
          setProfile({
            ...profile,
            avatarUrl: finalUrl
          });
        }
      } catch (err) {
        console.error("Failed to save avatarUrl:", err);
      } finally {
        setIsLoading(false);
      }
    } else {
      const localProfileStr = localStorage.getItem('seihouse-local-user-profile');
      const localProfile = localProfileStr ? JSON.parse(localProfileStr) : null;
      const updatedLocalProfile = {
        ...(localProfile || {}),
        avatarUrl: finalUrl,
        updatedAt: new Date().toISOString()
      };
      try {
        localStorage.setItem('seihouse-local-user-profile', JSON.stringify(updatedLocalProfile));
      } catch(e) {}
      if (profile) {
        setProfile({
          ...profile,
          avatarUrl: finalUrl
        });
      }
      setIsLoading(false);
    }
    
    setShowPortraitModal(false);
    setPortraitUploadFile(null);
    setPortraitUploadBase64('');
    setPortraitDesc('');
    setGeneratedPortraitUrl('');
  };

  const [inventorySearch, setInventorySearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [milestoneFilter, setMilestoneFilter] = useState('all');
  const [inspectArtifact, setInspectArtifact] = useState<any | null>(null);

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

  const fetchAdminData = async () => {
    setIsFetchingAdminData(true);
    setAdminError('');
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersList: UserProfileType[] = [];
      usersSnap.forEach((d) => {
        usersList.push(d.data() as UserProfileType);
      });
      setAllUsers(usersList);

      const storiesSnap = await getDocs(collection(db, 'stories'));
      const storiesList: any[] = [];
      storiesSnap.forEach((d) => {
        storiesList.push(d.data());
      });
      setAllStories(storiesList);
    } catch (err: any) {
      console.error(err);
      setAdminError(err.message || 'Failed to fetch admin data. Check security rules or authentication.');
    } finally {
      setIsFetchingAdminData(false);
    }
  };

  const handleUpdateUserRole = async (targetUid: string, nextRole: 'owner' | 'admin' | 'user') => {
    try {
      await setDoc(doc(db, 'users', targetUid), { role: nextRole }, { merge: true });
      setAllUsers(prev => prev.map(u => u.uid === targetUid ? { ...u, role: nextRole } : u));
    } catch (err: any) {
      console.error(err);
      setAdminError(err.message || 'Failed to update user role');
    }
  };

  const handleUpdateUserTier = async (targetUid: string, nextTier: "mortal" | "outer_sect" | "inner_sect" | "sect_master" | "immortal") => {
    try {
      await setDoc(doc(db, 'users', targetUid), { premiumTier: nextTier }, { merge: true });
      setAllUsers(prev => prev.map(u => u.uid === targetUid ? { ...u, premiumTier: nextTier } : u));
    } catch (err: any) {
      console.error(err);
      setAdminError(err.message || 'Failed to update user premium tier');
    }
  };

  const handleDeleteStoryAdmin = async (storyId: string) => {
    if (!window.confirm("Are you absolutely sure you want to delete this story? This action is IRREVERSIBLE and will wipe the story and its chapters from existence!")) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'stories', storyId));
      setAllStories(prev => prev.filter(s => s.id !== storyId));
    } catch (err: any) {
      console.error(err);
      setAdminError(err.message || 'Failed to delete story');
    }
  };

  useEffect(() => {
    if (isAdminPanelOpen) {
      fetchAdminData();
    }
  }, [isAdminPanelOpen]);

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
        
        // Auto-bootstrap Owner role and Immortal tier for owner emails
        if ((currentUser.email === 'amaurylindy@gmail.com' || currentUser.email === 'seihouseproductions@gmail.com' || currentUser.email === 'Amaurylindy@gmail.com' || currentUser.email === 'Seihouseproductions@gmail.com')) {
          let updates: Partial<UserProfileType> = {};
          if (data.role !== 'owner') {
            updates.role = 'owner';
            data.role = 'owner';
          }
          if (data.premiumTier !== 'immortal') {
            updates.premiumTier = 'immortal';
            data.premiumTier = 'immortal';
          }
          if (Object.keys(updates).length > 0) {
            setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true }).catch(err => {
              console.error("Failed to bootstrap owner/immortal", err);
            });
          }
        }

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
          updatedAt: new Date().toISOString(),
          role: (currentUser.email === 'amaurylindy@gmail.com' || currentUser.email === 'seihouseproductions@gmail.com' || currentUser.email === 'Amaurylindy@gmail.com' || currentUser.email === 'Seihouseproductions@gmail.com') ? 'owner' : 'user',
          premiumTier: (currentUser.email === 'amaurylindy@gmail.com' || currentUser.email === 'seihouseproductions@gmail.com' || currentUser.email === 'Amaurylindy@gmail.com' || currentUser.email === 'Seihouseproductions@gmail.com') ? 'immortal' : 'mortal'
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

  useEffect(() => {
    if (!currentUser) {
      const localInvStr = localStorage.getItem('seihouse-local-cosmic-inventory');
      const localInventory = localInvStr ? JSON.parse(localInvStr) : [];
      
      const localProfileStr = localStorage.getItem('seihouse-local-user-profile');
      const localProfile = localProfileStr ? JSON.parse(localProfileStr) : null;
      
      const guestProfile: UserProfileType = {
        uid: 'anonymous',
        username: localProfile?.username || 'Mortal Reader',
        displayName: localProfile?.displayName || 'Mortal Reader',
        displayNameColor: localProfile?.displayNameColor || '#E5E7EB',
        avatarUrl: localProfile?.avatarUrl || '',
        preferredLanguage: localProfile?.preferredLanguage || 'English',
        defaultTranslationLanguage: localProfile?.defaultTranslationLanguage || 'English',
        savedStoryCount: 0,
        activeStories: [],
        inactiveStories: [],
        joinedDate: localProfile?.joinedDate || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        cosmicInventory: localInventory,
        equippedArtifactId: localProfile?.equippedArtifactId || '',
        activeStatusEffects: localProfile?.activeStatusEffects || [
          {
            id: 'demo-effect-1',
            appliedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            progress: 120,
            targetProgress: 500,
            effectDef: {
              name: 'Curse of the Cursed Tome',
              type: 'Curse',
              description: '-15% Qi gathering efficiency for the duration.',
              durationMs: 24 * 60 * 60 * 1000,
              scope: 'Account-wide',
              visual: 'Dark smoke around display name',
              counterplay: 'Gather 500 Qi while cursed',
              rewardHook: 'Permanently unlock the Cursed Scholar title',
              qiMultiplier: 0.85,
              targetProgress: 500
            }
          },
          {
            id: 'demo-effect-2',
            appliedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
            effectDef: {
              name: 'Broken Jade Seal',
              type: 'Affliction',
              description: 'Store prices increased by 10%.',
              durationMs: 12 * 60 * 60 * 1000,
              scope: 'Story-specific',
              rewardHook: 'Completing an arc during this time drops Jade Fragments'
            }
          }
        ]
      };
      
      setProfile(guestProfile);
      setFormData(guestProfile);
      setIsLoading(false);
    }
  }, [currentUser]);

  const handleAttuneArtifact = async (artifactId: string) => {
    const isAttuned = profile?.equippedArtifactId === artifactId;
    const nextAttunementId = isAttuned ? "" : artifactId;
    
    let updatedActiveEffects = [...(profile?.activeStatusEffects || [])];
    
    // Remove previous artifact effects
    if (isAttuned) {
      updatedActiveEffects = updatedActiveEffects.filter(e => e.sourceArtifactId !== artifactId);
    } else {
      if (profile?.equippedArtifactId) {
         updatedActiveEffects = updatedActiveEffects.filter(e => e.sourceArtifactId !== profile.equippedArtifactId);
      }
      
      const artifactToEquip = profile?.cosmicInventory?.find(a => a.id === artifactId);
      if (artifactToEquip && artifactToEquip.statusEffectDef) {
         // Only allow 1 curse or blessing/affliction/mutation effect of the same type at a time
         const newType = artifactToEquip.statusEffectDef.type;
         updatedActiveEffects = updatedActiveEffects.filter(e => e.effectDef.type !== newType);

         updatedActiveEffects.push({
            id: `effect_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
            appliedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + (artifactToEquip.statusEffectDef.durationMs || 0)).toISOString(),
            effectDef: artifactToEquip.statusEffectDef,
            sourceArtifactId: artifactId
         });
      }
    }
    
    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), { 
          equippedArtifactId: nextAttunementId,
          activeStatusEffects: updatedActiveEffects
        }, { merge: true });
      } catch (e) {
        console.error("Failed to save attunement to Firestore:", e);
      }
    } else {
      const localProfileStr = localStorage.getItem('seihouse-local-user-profile');
      const localProfile = localProfileStr ? JSON.parse(localProfileStr) : null;
      
      const localInvStr = localStorage.getItem('seihouse-local-cosmic-inventory');
      const localInventory = localInvStr ? JSON.parse(localInvStr) : [];

      const updatedLocalProfile = {
        ...profile,
        uid: 'anonymous',
        username: localProfile?.username || profile?.username || 'Mortal Reader',
        displayName: localProfile?.displayName || profile?.displayName || 'Mortal Reader',
        displayNameColor: localProfile?.displayNameColor || profile?.displayNameColor || '#E5E7EB',
        avatarUrl: localProfile?.avatarUrl || profile?.avatarUrl || '',
        preferredLanguage: localProfile?.preferredLanguage || profile?.preferredLanguage || 'English',
        defaultTranslationLanguage: localProfile?.defaultTranslationLanguage || profile?.defaultTranslationLanguage || 'English',
        cosmicInventory: localInventory,
        equippedArtifactId: nextAttunementId,
        activeStatusEffects: updatedActiveEffects,
        updatedAt: new Date().toISOString()
      };
      
      try {
        localStorage.setItem('seihouse-local-user-profile', JSON.stringify(updatedLocalProfile));
      } catch(e) {}
      setProfile(updatedLocalProfile);
      setFormData(updatedLocalProfile);
      useAppStore.setState({ userProfile: updatedLocalProfile });
    }
  };

  // Derived metrics from actual stories state instead of just the profile fields
  // In a real app we might sync these, but here reading from the stories array is more accurate for the current session
  const userStories = stories.filter(s => s.userId === currentUser?.uid || (!s.userId));
  const inactiveFlowIds = profile?.inactiveStories || [];
  const activeFlows = userStories.filter(s => !inactiveFlowIds.includes(s.id));
  const activeStoriesCount = activeFlows.length;
  
  const currentStreak = profile?.daoPillarStreak || profile?.writingStreak || 0;
  const isCracked = profile?.daoPillarCracked || false;
  const daysTo3 = currentStreak === 0 ? 3 : (currentStreak % 3 === 0 ? 3 : 3 - (currentStreak % 3));
  const daysTo10 = currentStreak === 0 ? 10 : (currentStreak % 10 === 0 ? 10 : 10 - (currentStreak % 10));

  const handleRepairPillar = async () => {
    if (!profile) return;
    const repairCost = 50;
    const currentQiVal = profile.heavenly_qi !== undefined ? profile.heavenly_qi : (profile.qi || 0);
    if (currentQiVal >= repairCost) {
      const updatedProfile = {
        ...profile,
        qi: Math.max(0, (profile.qi || 0) - repairCost),
        dao_xp: Math.max(0, (profile.dao_xp || 0) - repairCost),
        heavenly_qi: Math.max(0, currentQiVal - repairCost),
        daoPillarCracked: false,
        daoPillarStreak: currentStreak > 0 ? currentStreak : 1
      };
      
      setProfile(updatedProfile);
      useAppStore.getState().setUserProfile(updatedProfile);
      
      if (currentUser) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid), {
            qi: updatedProfile.qi,
            dao_xp: updatedProfile.dao_xp,
            heavenly_qi: updatedProfile.heavenly_qi,
            daoPillarCracked: false,
            daoPillarStreak: updatedProfile.daoPillarStreak
          }, { merge: true });
        } catch (e) {
          console.error("Failed to repair pillar in db:", e);
        }
      } else {
        try {
          localStorage.setItem('seihouse-local-user-profile', JSON.stringify(updatedProfile));
        } catch(e) {}
      }
      setError('');
      window.dispatchEvent(new CustomEvent('seihouse-toast', {
        detail: { message: 'Dao Pillar successfully repaired! Your cultivation streak is restored.', type: 'success' }
      }));
    } else {
      setError('Insufficient Heavenly Qi to repair Dao Pillar (Requires 50).');
    }
  };

  const handleCheckIn = async () => {
    if (!profile) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const lastReadStr = profile.lastReadDate;
    
    let newStreak = profile.daoPillarStreak || 0;
    let isCracked = profile.daoPillarCracked || false;
    
    if (isCracked) {
      setError('Your Dao Pillar is cracked. You must repair it first.');
      return;
    }
    
    if (lastReadStr === todayStr) {
      setError('You have already refined your Dao for today.');
      return;
    }
    
    if (lastReadStr) {
      const lastReadDate = new Date(lastReadStr + 'T00:00:00');
      const todayDate = new Date(todayStr + 'T00:00:00');
      const diffTime = todayDate.getTime() - lastReadDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        newStreak += 1;
      } else {
        // Broke streak
        if (newStreak >= 7) {
          isCracked = true;
        }
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }
    
    let qiBonus = 5; // Baseline Qi for checking in
    let streakRewardMessage = '';
    
    if (newStreak % 10 === 0) {
      qiBonus += 100;
      streakRewardMessage = ' (including +100 Qi milestone reward!)';
    } else if (newStreak % 3 === 0) {
      qiBonus += 20;
      streakRewardMessage = ' (including +20 Qi milestone reward!)';
    }
    
    const currentQiVal = profile.heavenly_qi !== undefined ? profile.heavenly_qi : (profile.qi || 0);
    const updatedProfile = {
      ...profile,
      lastReadDate: todayStr,
      daoPillarStreak: newStreak,
      daoPillarCracked: isCracked,
      qi: (profile.qi || 0) + qiBonus,
      dao_xp: (profile.dao_xp || 0) + qiBonus,
      heavenly_qi: currentQiVal + qiBonus
    };
    
    setProfile(updatedProfile);
    useAppStore.getState().setUserProfile(updatedProfile);
    
    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          lastReadDate: todayStr,
          daoPillarStreak: newStreak,
          daoPillarCracked: isCracked,
          qi: updatedProfile.qi,
          dao_xp: updatedProfile.dao_xp,
          heavenly_qi: updatedProfile.heavenly_qi
        }, { merge: true });
      } catch (e) {
        console.error("Failed to check in to pillar in db:", e);
      }
    } else {
      try {
        localStorage.setItem('seihouse-local-user-profile', JSON.stringify(updatedProfile));
      } catch(e) {}
    }
    
    setError('');
    window.dispatchEvent(new CustomEvent('seihouse-toast', {
      detail: { 
        message: `Successfully refined your Daily Dao! Streak increased to ${newStreak} ${newStreak === 1 ? 'day' : 'days'}! +5 Heavenly Qi awarded!${streakRewardMessage}`, 
        type: 'success' 
      }
    }));
  };

  const performSave = async (preferredLang: string, defaultTransLang: string) => {
    if (!profile) return;

    if (!currentUser) {
      // Local Guest Save
      const localProfileStr = localStorage.getItem('seihouse-local-user-profile');
      const localProfile = localProfileStr ? JSON.parse(localProfileStr) : {};
      const updatedLocalProfile = {
        ...localProfile,
        preferredLanguage: preferredLang,
        defaultTranslationLanguage: defaultTransLang,
        updatedAt: new Date().toISOString()
      };
      try {
        localStorage.setItem('seihouse-local-user-profile', JSON.stringify(updatedLocalProfile));
      } catch(e) {}
      setProfile(updatedLocalProfile);
      setFormData(updatedLocalProfile);
      useAppStore.setState({ userProfile: updatedLocalProfile });
      return;
    }

    setIsLoading(true);
    try {
      const updates = {
        username: formData.username,
        displayName: formData.displayName,
        displayNameColor: formData.displayNameColor,
        avatarUrl: formData.avatarUrl,
        preferredLanguage: preferredLang,
        defaultTranslationLanguage: defaultTransLang,
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

  const handleLanguageChangeDirect = async (name: 'preferredLanguage' | 'defaultTranslationLanguage', value: string) => {
    if (!profile) return;
    
    const nextPreferred = name === 'preferredLanguage' ? value : (formData.preferredLanguage || profile.preferredLanguage || 'English');
    const nextTranslation = name === 'defaultTranslationLanguage' ? value : (formData.defaultTranslationLanguage || profile.defaultTranslationLanguage || 'English');

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (!pendingLanguageChange) {
      setPendingLanguageChange({
        preferred: nextPreferred,
        translation: nextTranslation,
        prevPreferred: profile.preferredLanguage || 'English',
        prevTranslation: profile.defaultTranslationLanguage || 'English'
      });
      setCountdown(30);
      
      useAppStore.setState(state => ({
        userProfile: state.userProfile ? {
          ...state.userProfile,
          preferredLanguage: nextPreferred,
          defaultTranslationLanguage: nextTranslation
        } : {
          preferredLanguage: nextPreferred,
          defaultTranslationLanguage: nextTranslation
        } as any
      }));
    }
  };

  const handleSave = async () => {
    if (!currentUser || !profile) return;
    
    const isLangChanged = formData.preferredLanguage !== profile.preferredLanguage || formData.defaultTranslationLanguage !== profile.defaultTranslationLanguage;
    
    if (isLangChanged && !pendingLanguageChange) {
      setPendingLanguageChange({
        preferred: formData.preferredLanguage || 'English',
        translation: formData.defaultTranslationLanguage || 'English',
        prevPreferred: profile.preferredLanguage,
        prevTranslation: profile.defaultTranslationLanguage
      });
      setCountdown(30);
      
      // Temporarily update store to preview language
      useAppStore.setState(state => ({
        userProfile: state.userProfile ? {
          ...state.userProfile,
          preferredLanguage: formData.preferredLanguage || 'English',
          defaultTranslationLanguage: formData.defaultTranslationLanguage || 'English'
        } : null
      }));
    } else {
      await performSave(formData.preferredLanguage || 'English', formData.defaultTranslationLanguage || 'English');
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

  const renderBoringThings = () => (
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

  const renderAdminPanel = () => {
    const filteredUsers = allUsers.filter(u => {
      const query = adminSearchQuery.toLowerCase();
      return (
        (u.username || '').toLowerCase().includes(query) ||
        (u.displayName || '').toLowerCase().includes(query) ||
        (u.uid || '').toLowerCase().includes(query)
      );
    });

    const filteredStories = allStories.filter(s => {
      const query = adminSearchQuery.toLowerCase();
      return (
        (s.title || '').toLowerCase().includes(query) ||
        (s.genre || '').toLowerCase().includes(query) ||
        (s.mcName || '').toLowerCase().includes(query) ||
        (s.id || '').toLowerCase().includes(query) ||
        (s.userId || '').toLowerCase().includes(query)
      );
    });

    const isOwnerUser = profile?.role === 'owner';

    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Admin Header */}
        <div className="border-b border-neutral-900 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-sc font-bold uppercase tracking-wider text-signal flex items-center gap-2">
              <Shield className="text-human" size={22} />
              Akashic Records Control Switchboard
            </h3>
            <p className="font-serif text-xs text-neutral-400 mt-1.5 max-w-xl leading-relaxed">
              Authorized access as <span className="text-human font-bold uppercase">{profile?.role}</span>. Purple & Crimson vectors signify high-potency write authority.
            </p>
          </div>
          <button
            onClick={fetchAdminData}
            disabled={isFetchingAdminData}
            className="self-start md:self-auto px-4 py-2 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-signal hover:border-neutral-600 rounded-xl text-xs font-sc font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={isFetchingAdminData ? 'animate-spin' : ''} />
            Recalibrate
          </button>
        </div>

        {adminError && (
          <div className="p-4 bg-human/10 border border-human/30 text-human text-xs font-mono rounded-xl">
            [ERROR_SIGNAL]: {adminError}
          </div>
        )}

        {/* Directory/Chronicle Switcher */}
        <div className="flex border-b border-neutral-900 gap-6">
          <button
            onClick={() => { setAdminTab('users'); setAdminSearchQuery(''); }}
            className={`pb-3 text-xs font-sc font-bold uppercase tracking-widest border-b-2 cursor-pointer transition-all ${
              adminTab === 'users'
                ? 'border-portal text-portal font-black'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            User Directory ({allUsers.length})
          </button>
          <button
            onClick={() => { setAdminTab('stories'); setAdminSearchQuery(''); }}
            className={`pb-3 text-xs font-sc font-bold uppercase tracking-widest border-b-2 cursor-pointer transition-all ${
              adminTab === 'stories'
                ? 'border-human text-human font-black'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Novel Chronicles ({allStories.length})
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder={adminTab === 'users' ? "Search users by name, username, or ID..." : "Search stories by title, MC name, genre, or ID..."}
            value={adminSearchQuery}
            onChange={(e) => setAdminSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-neutral-950/80 border border-neutral-900 rounded-xl text-xs font-sans text-signal placeholder-neutral-600 focus:outline-none focus:border-neutral-750 transition-all"
          />
        </div>

        {isFetchingAdminData ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <RefreshCw size={36} className="text-portal animate-spin" />
            <span className="font-sc text-xs tracking-widest uppercase text-neutral-500">Accessing Akashic Nodes...</span>
          </div>
        ) : adminTab === 'users' ? (
          /* USERS MANAGEMENT */
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-neutral-500 font-serif text-sm">
                No matched entities found in this sector.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelf = u.uid === currentUser?.uid;
                return (
                  <div key={u.uid} className="bg-[#050505] border border-neutral-900 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-neutral-800 transition-all">
                    {/* Left: User stats */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-display text-lg text-signal">{u.displayName || u.username || 'Anonymous Entity'}</span>
                        {isSelf && (
                          <span className="px-2 py-0.5 bg-portal/10 text-portal text-[9px] font-mono rounded uppercase">You</span>
                        )}
                        <span className={`px-2 py-0.5 text-[9px] font-mono rounded uppercase ${
                          u.role === 'owner' ? 'bg-human/20 text-human border border-human/30' :
                          u.role === 'admin' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                          'bg-neutral-900 text-neutral-400'
                        }`}>
                          {u.role || 'user'}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-neutral-500 space-y-0.5">
                        <p>ID: {u.uid}</p>
                        <p>Username: @{u.username}</p>
                        <p>Linked Date: {u.joinedDate ? new Date(u.joinedDate).toLocaleDateString() : 'Unknown'}</p>
                        <p>Premium Rank: <span className="text-signal uppercase">{u.premiumTier || 'mortal'}</span></p>
                      </div>
                    </div>

                    {/* Right: Write commands */}
                    <div className="flex flex-col sm:flex-row gap-4 lg:items-center">
                      {/* Premium Tier Selector */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-sc uppercase tracking-wider text-neutral-500 block">Premium Rank Override</span>
                        <div className="flex bg-neutral-950 border border-neutral-900 rounded-lg p-0.5 gap-0.5">
                          {(['mortal', 'outer_sect', 'inner_sect', 'sect_master', 'immortal'] as const).map((tier) => (
                            <button
                              key={tier}
                              disabled={!isOwnerUser}
                              onClick={() => handleUpdateUserTier(u.uid, tier)}
                              className={`px-2 py-1 text-[9px] font-mono rounded transition-all cursor-pointer ${
                                u.premiumTier === tier
                                  ? 'bg-portal/15 text-portal font-bold'
                                  : isOwnerUser ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-700 cursor-not-allowed'
                              }`}
                            >
                              {tier === 'outer_sect' ? 'Outer' : tier === 'inner_sect' ? 'Inner' : tier === 'sect_master' ? 'Master' : tier === 'immortal' ? 'Immortal' : tier}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Role Selector */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-sc uppercase tracking-wider text-neutral-500 block">Permission Sector</span>
                        <div className="flex bg-neutral-950 border border-neutral-900 rounded-lg p-0.5 gap-1">
                          {(['user', 'admin', 'owner'] as const).map((role) => (
                            <button
                              key={role}
                              disabled={!isOwnerUser || isSelf}
                              onClick={() => handleUpdateUserRole(u.uid, role)}
                              className={`px-2.5 py-1 text-[9px] font-sc uppercase tracking-widest rounded transition-all cursor-pointer ${
                                u.role === role
                                  ? role === 'owner' ? 'bg-human text-signal font-bold' :
                                    role === 'admin' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-bold' :
                                    'bg-neutral-800 text-neutral-300 font-bold'
                                  : (isOwnerUser && !isSelf) ? 'text-neutral-600 hover:text-neutral-400' : 'text-neutral-800 cursor-not-allowed'
                              }`}
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* STORIES MANAGEMENT */
          <div className="space-y-4">
            {filteredStories.length === 0 ? (
              <div className="py-12 text-center text-neutral-500 font-serif text-sm">
                No novel matrix configurations found.
              </div>
            ) : (
              filteredStories.map((s) => (
                <div key={s.id} className="bg-[#050505] border border-neutral-900 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-neutral-800 transition-all">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg text-signal">{s.title || 'Untitled Chronicle'}</span>
                      <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-400 text-[9px] font-mono rounded">{s.genre}</span>
                      {s.deleted && (
                        <span className="px-2 py-0.5 bg-human/20 text-human text-[9px] font-mono rounded uppercase">Deleted (Soft)</span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-neutral-500 space-y-0.5">
                      <p>Story ID: {s.id}</p>
                      <p>Author ID: {s.userId}</p>
                      <p>Principal Cultivator: <span className="text-signal">{s.mcName}</span></p>
                      <p>Scroll Count: <span className="text-portal font-bold">{s.currentChapterNumber || 0} chapters</span></p>
                      <p>Evolving Since: {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'Unknown'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteStoryAdmin(s.id)}
                    className="self-start sm:self-auto bg-transparent hover:bg-human/15 border border-human/30 hover:border-human text-human hover:text-signal rounded-xl px-4 py-2.5 transition-all font-sc text-[10px] uppercase font-bold tracking-widest cursor-pointer flex items-center gap-1.5"
                  >
                    <Flame size={12} />
                    Purge Matrix
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading && !profile && currentUser) {
    return <div className="p-8 text-center text-neutral-500 font-sc tracking-widest uppercase animate-pulse">Accessing Celestial Record...</div>;
  }

  const attunedArtifact = (profile?.cosmicInventory || []).find(a => a.id === profile?.equippedArtifactId);

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
            <button  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={onLogout} className="px-5 py-2 border border-human/30 text-human hover:bg-human/10 hover:border-human hover:text-signal rounded-full text-[11px] font-sc font-bold tracking-wider transition-all flex items-center gap-2">
              <LogOut size={14} /> Sever Link
            </button>
          )}
        </div>

        {currentUser && (profile?.role === 'owner' || profile?.role === 'admin') && (
          <div className="flex border-b border-neutral-900 bg-black/20">
            <button
              onClick={() => setIsAdminPanelOpen(false)}
              className={`flex-1 py-4 text-xs font-sc font-bold uppercase tracking-widest transition-all border-b-2 text-center flex items-center justify-center gap-2 cursor-pointer ${
                !isAdminPanelOpen
                  ? 'border-portal text-portal bg-portal/5'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <UserIcon size={14} />
              My Cultivator Profile
            </button>
            <button
              onClick={() => setIsAdminPanelOpen(true)}
              className={`flex-1 py-4 text-xs font-sc font-bold uppercase tracking-widest transition-all border-b-2 text-center flex items-center justify-center gap-2 cursor-pointer ${
                isAdminPanelOpen
                  ? 'border-human text-signal bg-human/10 animate-pulse'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Shield size={14} className="text-human" />
              Akashic Switchboard (Admin)
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-human/10 border-b border-human/30 text-human text-sm font-mono text-center">
            {error}
          </div>
        )}

        <div className="p-6 md:p-10 space-y-12">
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
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleLogin} 
                className="px-8 py-3.5 bg-portal/10 border border-portal/50 text-portal hover:bg-portal hover:text-void rounded-full font-sc uppercase tracking-widest text-[12px] font-bold shadow-[0_0_20px_rgba(4,172,255,0.2)] hover:shadow-[0_0_30px_rgba(4,172,255,0.4)] transition-all"
              >
                Link Spirit Realm
              </button>
            </div>
          ) : isAdminPanelOpen ? (
            renderAdminPanel()
          ) : (
            <>
              {/* Top Section - Avatar & Quick Info */}
              <div className="flex flex-col md:flex-row gap-8 md:items-start border-b border-neutral-900/50 pb-10">
                <div className="flex flex-col items-center flex-shrink-0 md:w-48">
                  <div className={`w-28 h-28 rounded-full border p-1 relative group transition-all duration-700 ${getAuraGlowStyle(profile?.displayNameColor || '#E5E7EB', profile?.activeStatusEffects)}`}>
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
                  
                  {/* Cultivator Portrait Generator Button */}
                  <button
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowPortraitModal(true)}
                    className="mt-3 px-3 py-1.5 border border-portal/30 hover:border-portal text-portal font-sc text-[10px] font-bold uppercase tracking-widest rounded-lg bg-portal/5 hover:bg-portal/10 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(4,172,255,0.05)] hover:shadow-[0_0_20px_rgba(4,172,255,0.15)] group w-full justify-center"
                    title="Divine Mirror: Cast your mortal likeness into the cosmic loom"
                  >
                    <Sparkles size={11} className="text-portal animate-pulse group-hover:scale-110 transition-transform" />
                    Celestial Portrait
                  </button>

                  {/* Collapsible Advanced Settings Panel */}
                  <div className="mt-4 border-t border-neutral-900/50 pt-4 w-full text-center relative">
                    <button
                      type="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center justify-between gap-2 w-full text-[10px] font-sc uppercase font-bold tracking-widest text-portal hover:text-signal transition-all py-2 px-3 border border-portal/20 rounded-lg hover:border-portal bg-portal/5 hover:bg-portal/10"
                    >
                      <span>{showAdvanced ? "▲ Hide Tools" : "▼ Advanced Tools"}</span>
                      <Sliders size={11} className="text-portal" />
                    </button>

                    {showAdvanced && (
                      <div className="mt-3 p-4 bg-[#030303] border border-neutral-900 rounded-xl space-y-3 animate-fadeIn text-left w-64 max-w-xs absolute left-1/2 -translate-x-1/2 md:left-4 md:translate-x-0 z-20 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                        <p className="text-[9px] font-sans text-neutral-500 leading-normal">
                          Configure custom model presets, routing overrides, or API credential endpoints.
                        </p>
                        <div className="flex flex-col gap-2">
                          <button
                            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setIsSettingsOpen(true)}
                            className="w-full px-3 py-2 bg-black border border-neutral-850 hover:border-portal/50 text-neutral-400 hover:text-portal transition-all rounded-lg font-sc text-[9px] flex items-center gap-2 font-bold group"
                            title="Aether Router"
                          >
                            <Sliders size={12} className="text-portal group-hover:scale-110 transition-transform shrink-0" />
                            <span className="uppercase tracking-widest font-semibold whitespace-nowrap">Aether Router</span>
                          </button>
                          <button
                            type="button"
                            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => useAppStore.getState().setIsShortcutsOpen(true)}
                            className="w-full px-3 py-2 bg-black border border-neutral-850 hover:border-portal/50 text-neutral-400 hover:text-portal transition-all rounded-lg font-sc text-[9px] flex items-center gap-2 font-bold group"
                            title="Shortcuts Manual (or press ? key)"
                          >
                            <Keyboard size={12} className="text-portal group-hover:scale-110 transition-transform shrink-0" />
                            <span className="uppercase tracking-widest font-semibold whitespace-nowrap">Shortcuts</span>
                          </button>
                        </div>

                        <div className="border-t border-neutral-900/50 pt-3 flex flex-col gap-2">
                          <button
                            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleRunAudit}
                            disabled={isAuditing}
                            className="w-full flex items-center gap-2 bg-black hover:bg-neutral-900 text-neutral-300 hover:text-portal border border-neutral-800 hover:border-portal/50 px-3 py-2 rounded-lg text-[9px] font-sc font-bold uppercase tracking-wider disabled:opacity-20 disabled:cursor-not-allowed transition-all group"
                          >
                            <Database size={12} className="text-portal group-hover:scale-110 transition-transform shrink-0" />
                            <span>Audit Sync</span>
                          </button>

                          <label className="flex items-center gap-2 bg-black hover:bg-neutral-900 text-neutral-300 hover:text-portal border border-neutral-800 hover:border-portal/50 px-3 py-2 rounded-lg text-[9px] font-sc font-bold uppercase tracking-wider cursor-pointer transition-all group" htmlFor="a11y-id-1">
                            <Upload size={12} className="text-portal group-hover:-translate-y-0.5 transition-transform shrink-0" />
                            <span>Import Scroll</span>
                            <input id="a11y-id-1" 
                              type="file" 
                              accept=".json" 
                              onChange={handleImportLibrary} 
                              className="hidden" 
                            />
                          </label>

                          <button
                            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleExportLibrary}
                            disabled={stories.length === 0}
                            className="w-full flex items-center gap-2 bg-black hover:bg-neutral-900 text-neutral-300 hover:text-signal border border-neutral-800 hover:border-human/50 px-3 py-2 rounded-lg text-[9px] font-sc font-bold uppercase tracking-wider disabled:opacity-20 disabled:cursor-not-allowed transition-all group"
                          >
                            <Download size={12} className="text-human group-hover:translate-y-0.5 transition-transform shrink-0" />
                            <span>Backup All</span>
                          </button>
                        </div>

                        {/* Audit Results */}
                        {auditResult && (
                          <div className="mt-2 p-3 border border-portal/30 bg-black rounded-lg text-[9px] font-mono text-neutral-400 space-y-1.5">
                            <div className="text-portal font-sc uppercase tracking-widest border-b border-neutral-800 pb-1 mb-1 font-bold">Sync Diagnostic</div>
                            <div className="space-y-0.5">
                              <div>Local Realms: <span className="text-signal">{auditResult.localStories}</span></div>
                              <div>Cloud Realms: <span className="text-signal">{auditResult.cloudStories}</span></div>
                              <div>Pending Writes: <span className="text-signal">{auditResult.pendingWrites}</span></div>
                              <div>Missing Chapters: <span className={auditResult.missingChapters.length > 0 ? "text-human" : "text-signal"}>{auditResult.missingChapters.length}</span></div>
                            </div>
                            {auditResult.missingChapters.length > 0 && (
                              <div className="pt-1.5 border-t border-neutral-800 mt-1.5">
                                <button tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleRecover} disabled={isAuditing} className="w-full py-1 bg-human/10 text-human border border-human/30 hover:bg-human/20 rounded uppercase tracking-widest font-sc text-[9px] cursor-pointer">
                                  Cloud Recovery
                                </button>
                              </div>
                            )}
                            {auditResult.recovered !== undefined && (
                              <div className="text-portal mt-1">Recovered {auditResult.recovered} chapters.</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-5">
                  <div className="flex flex-col gap-3 mb-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                      <div className="px-3 py-1 bg-portal/10 border border-portal/30 text-portal text-[10px] font-bold tracking-[0.2em] uppercase rounded font-sc">
                        {daoData.rank}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Heavenly Qi Badge */}
                        <div className="flex items-center gap-1.5 text-[10px] text-portal font-sc uppercase font-bold tracking-widest border border-portal/20 px-2.5 py-1 rounded bg-portal/5 shadow-[0_0_10px_rgba(4,172,255,0.05)]" title="Heavenly Qi: Your primary cultivation power, unlocking higher Dao Ranks.">
                          <Zap size={10} className="text-portal animate-pulse" />
                          <span>Heavenly Qi: {profile?.heavenly_qi !== undefined ? profile.heavenly_qi : daoData.currentQi}</span>
                        </div>
                        
                        {/* Sect Qi Badge */}
                        <div className="flex items-center gap-1.5 text-[10px] text-[#FAFAFA] font-sc uppercase font-bold tracking-widest border border-[#8B0000]/40 px-2.5 py-1 rounded bg-[#8B0000]/10 shadow-[0_0_10px_rgba(139,0,0,0.15)]" title="Sect Qi: Your contribution points to the Sect, to be utilized in the upcoming Sect Contribution system.">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8B0000] animate-pulse" />
                          <span>Sect Qi: {profile?.sect_qi || 0}</span>
                        </div>

                        {/* Demonic Qi Badge */}
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-sc uppercase font-bold tracking-widest border border-amber-600/40 px-2.5 py-1 rounded bg-amber-950/10 shadow-[0_0_10px_rgba(245,158,11,0.15)]" title="Demonic Qi: Corrupted cultivation power, unlocked from demonic artifacts or taboos.">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                          <span>Demonic Qi: {profile?.demonic_qi || 0}</span>
                        </div>
                      </div>
                    </div>
                    {attunedArtifact && (
                      <div className="flex items-center gap-2 text-[10px] text-amber-400 font-sc uppercase font-bold tracking-widest border border-amber-500/20 px-3 py-1.5 rounded bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] max-w-fit">
                        <Award size={12} className="text-amber-400 animate-pulse" />
                        <span>Soul Attuned: {attunedArtifact.name} ({attunedArtifact.attributeBoost})</span>
                      </div>
                    )}
                    {daoData.nextRank && (
                      <div className="flex-1 max-w-[300px]">
                        <div className="flex justify-between text-[9px] text-neutral-500 mb-1.5 font-sc uppercase tracking-widest">
                          <span>Cultivation to {daoData.nextRank}</span>
                          <span className="text-portal/70">{profile?.heavenly_qi !== undefined ? profile.heavenly_qi : daoData.currentQi} / {daoData.maxQi} Heavenly Qi</span>
                        </div>
                        <div className="h-1 bg-neutral-900 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-gradient-to-r from-portal/50 to-portal shadow-[0_0_10px_rgba(4,172,255,0.5)] transition-all duration-1000" style={{ width: `${daoData.progress}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#030303] p-5 rounded-xl border border-neutral-900">
                    <div>
                      <label htmlFor="user-username" className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-sc block mb-2">Username (Dao Name)</label>
                      {isEditing ? (
                        <input 
                          id="user-username"
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
                        <label htmlFor="user-displayname" className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-sc">Display Name</label>
                        {!isEditing && (
                          <button 
                             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setIsEditing(true)} 
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
                              id="user-displayname"
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
                                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
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
                                         tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
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
                              const styleObj = getAuraTextStyle(profile?.displayNameColor, profile?.activeStatusEffects);
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
                    <div className="p-2 bg-neutral-900 rounded-lg"><Calendar size={14} className="text-neutral-400" /></div>
                    <span className="text-[11px] uppercase font-bold tracking-widest text-neutral-400 font-sc">Ascent Commenced</span>
                  </div>
                  <div className="text-[11px] text-neutral-300 font-sans tracking-wide">{new Date(profile?.joinedDate || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
                
                <div className="bg-[#030303] border border-neutral-900 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-900 rounded-lg"><BookOpen size={14} className="text-portal" /></div>
                    <span className="text-[11px] uppercase font-bold tracking-widest text-neutral-400 font-sc">Scrolls Accumulated</span>
                  </div>
                  <div className="text-[11px] text-portal font-sans font-black tracking-widest uppercase">
                    {activeStoriesCount} Realms
                  </div>
                </div>

                {/* Dual Qi Core explanation card */}
                <div className="bg-[#030303] border border-neutral-900/60 rounded-xl p-5 md:col-span-2 relative overflow-hidden shadow-[0_0_20px_rgba(4,172,255,0.02)]">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-portal/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#8B0000]/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <h4 className="text-[11px] uppercase font-bold tracking-widest text-[#FAFAFA] font-sc flex items-center gap-2 mb-3">
                    <Zap size={12} className="text-portal" /> Dual Qi Alignment
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] leading-relaxed">
                    <div className="space-y-1 border-l border-portal/30 pl-3">
                      <span className="font-sc uppercase text-portal font-bold tracking-wider">Heavenly Qi (Cultivation Power)</span>
                      <p className="text-neutral-400 font-sans">
                        Your fundamental essence gained from reading realms, making choices, and overcoming tribulations. Tracks your progression to higher cultivator ranks and determines your celestial aura color.
                      </p>
                    </div>
                    
                    <div className="space-y-1 border-l border-[#8B0000]/50 pl-3">
                      <span className="font-sc uppercase text-neutral-300 font-bold tracking-wider">Sect Qi (Contribution Essence)</span>
                      <p className="text-neutral-400 font-sans">
                        Essence stored for your upcoming community contribution achievements. Utilized to exchange for special titles, customize sect affiliations, and fund cooperative arrays when the contribution hall is unlocked.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dao Pillar (Daily Streak) */}
                <div className={`bg-[#030303] border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:col-span-2 relative overflow-hidden shadow-[0_0_20px_rgba(249,115,22,0.03)] border-l-4 ${isCracked ? 'border-human/40 border-l-human/80 border-t-human/20 border-r-human/20 border-b-human/20' : 'border-l-orange-500/40 border-neutral-900'}`}>
                  {isCracked && (
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PGxpbmUgeDE9IjAiIHkxPSIwIiB4Mj0iODAiIHkyPSI4MCIgc3Ryb2tlPSIjZmY0NDQ0MjAiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] opacity-30 pointer-events-none mix-blend-overlay"></div>
                  )}
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`p-2.5 rounded-lg border ${isCracked ? 'bg-human/10 border-human/30' : 'bg-orange-500/10 border-orange-500/20'}`}>
                      <Flame size={18} className={`${isCracked ? 'text-human animate-bounce' : 'text-orange-500 animate-pulse'}`} />
                    </div>
                    <div>
                      <span className={`text-[10px] uppercase font-bold tracking-widest font-sc block ${isCracked ? 'text-human' : 'text-neutral-500'}`}>
                        {isCracked ? 'Dao Pillar Cracked!' : 'Daily Dao Pillar'}
                      </span>
                      <div className={`text-2xl font-black font-sans tracking-wide ${isCracked ? 'text-human opacity-50 line-through' : 'text-orange-500'}`}>
                        {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:items-end justify-center text-xs text-neutral-400 font-mono space-y-2 relative z-10">
                    {isCracked ? (
                      <button
                         tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleRepairPillar}
                        className="px-4 py-2 bg-human/20 hover:bg-human/30 text-human font-bold text-[10px] font-sc uppercase tracking-widest border border-human/50 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Zap size={12} className="text-human" />
                        Repair Pillar (50 Qi)
                      </button>
                    ) : (
                      <div className="flex flex-col items-start sm:items-end gap-2.5">
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-[10px] text-orange-400 font-sc uppercase tracking-wider">
                            {daysTo3} {daysTo3 === 1 ? 'day' : 'days'} to +20 Qi
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-400 font-sc uppercase tracking-wider">
                            {daysTo10} {daysTo10 === 1 ? 'day' : 'days'} to +100 Qi
                          </span>
                        </div>
                        
                        {(() => {
                          const todayStr = new Date().toISOString().split('T')[0];
                          const hasCheckedInToday = profile?.lastReadDate === todayStr;
                          return hasCheckedInToday ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-sc uppercase tracking-wider rounded-lg">
                              <Sparkles size={11} className="text-green-400 animate-pulse" />
                              Refinement Complete Today (+5 Qi)
                            </div>
                          ) : (
                            <button
                              onClick={handleCheckIn}
                              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-sc uppercase font-black text-[10px] tracking-widest rounded-lg shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] transition-all active:scale-95 flex items-center gap-2 cursor-pointer border border-orange-400/30"
                            >
                              <Flame size={12} className="animate-pulse text-black" />
                              Refine Daily Dao
                            </button>
                          );
                        })()}

                        {profile?.lastReadDate ? (
                          <span className="text-[10px] text-neutral-500">
                            Last Refined: <span className="text-neutral-300">{profile.lastReadDate}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-500 italic">Click Refine Daily Dao to establish your pillar.</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Status Effects */}
              {(profile?.activeStatusEffects && profile.activeStatusEffects.length > 0) && (
                <div className="pt-10 border-t border-neutral-900/50 mt-10">
                  <h3 className="text-[11px] uppercase font-bold tracking-widest text-neutral-500 font-sc mb-6 flex items-center gap-2">
                    <Flame size={14} className="text-human" />
                    Active Status Effects
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {profile.activeStatusEffects.map(effect => {
                      const isDebuff = ["Curse", "Affliction"].includes(effect.effectDef.type);
                      const colorClass = isDebuff ? "border-human/30 bg-human/5 text-human" : "border-portal/30 bg-portal/5 text-portal";
                      
                      return (
                        <div key={effect.id} className={`p-4 rounded-xl border ${colorClass} flex flex-col gap-3 relative overflow-hidden group`}>
                          {isDebuff && <div className="absolute inset-0 bg-gradient-to-t from-human/10 to-transparent pointer-events-none opacity-50" />}
                          {!isDebuff && <div className="absolute inset-0 bg-gradient-to-t from-portal/10 to-transparent pointer-events-none opacity-50" />}
                          
                          <div className="flex justify-between items-start z-10">
                            <div>
                              <h4 className="font-sc font-bold uppercase tracking-wider text-sm">{effect.effectDef.name}</h4>
                              <p className="text-[10px] font-mono opacity-80 mt-1">{effect.effectDef.type} • {effect.effectDef.scope}</p>
                            </div>
                            <div className="px-2 py-1 bg-black/40 border border-current rounded text-[9px] uppercase tracking-widest font-bold">
                              {Math.round(effect.effectDef.durationMs / (60 * 60 * 1000))}h
                            </div>
                          </div>
                          
                          <p className="text-xs font-serif opacity-90 z-10 leading-relaxed">
                            {effect.effectDef.description}
                          </p>
                          
                          {effect.effectDef.visual && (
                            <p className="text-[10px] opacity-75 font-sans italic z-10">
                              Visual: {effect.effectDef.visual}
                            </p>
                          )}
                          
                          {effect.progress !== undefined && effect.targetProgress !== undefined && !effect.completedAt && (
                            <div className="z-10 mt-1 space-y-1">
                              <div className="flex justify-between text-[10px] font-mono opacity-80">
                                <span>Challenge Progress: {effect.progress} / {effect.targetProgress} Qi</span>
                                <span>{Math.round((effect.progress / effect.targetProgress) * 100)}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-current/10">
                                <div 
                                  className={`h-full ${isDebuff ? 'bg-human' : 'bg-portal'} transition-all duration-500`}
                                  style={{ width: `${Math.min(100, (effect.progress / effect.targetProgress) * 100)}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {effect.completedAt && (
                            <div className="z-10 mt-1 flex items-center gap-1.5 text-[10px] text-green-400 font-bold uppercase tracking-wider bg-green-950/20 px-2 py-1 border border-green-500/30 rounded w-fit">
                              <Sparkles size={12} className="text-green-400" />
                              REWARD UNLOCKED • COMPLETED!
                            </div>
                          )}

                          {(effect.effectDef.counterplay || effect.effectDef.rewardHook) && (
                            <div className="mt-2 pt-2 border-t border-current/20 z-10 space-y-2">
                              {effect.effectDef.counterplay && (
                                <div className="flex gap-2 items-start text-[10px]">
                                  <Shield size={12} className="shrink-0 mt-0.5 opacity-80" />
                                  <span className="font-sans leading-relaxed">{effect.effectDef.counterplay}</span>
                                </div>
                              )}
                              {effect.effectDef.rewardHook && (
                                <div className="flex gap-2 items-start text-[10px]">
                                  <Sparkles size={12} className="shrink-0 mt-0.5 opacity-80" />
                                  <span className="font-sans leading-relaxed text-amber-400/90">{effect.effectDef.rewardHook}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cosmic Inventory Section */}
              <div className="pt-10 border-t border-neutral-900/50 mt-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="text-[11px] uppercase font-bold tracking-widest text-neutral-500 font-sc flex items-center gap-2">
                    <Award size={14} className="text-portal animate-pulse" />
                    Cosmic Inventory (Sacred Treasury)
                  </h3>
                  <div className="text-[10px] text-neutral-400 font-mono bg-neutral-900/40 border border-neutral-850 px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
                    <Sparkles size={11} className="text-portal" />
                    <span>Unlocked: {(profile?.cosmicInventory || []).length} Relics</span>
                  </div>
                </div>

                {/* Search & Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  {/* Search bar */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                      <Search size={14} />
                    </span>
                    <input
                      type="text"
                      placeholder="Search sacred relics..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      className="w-full bg-black/50 border border-neutral-900 rounded-lg pl-9 pr-4 py-2 text-xs text-signal focus:border-portal/50 outline-none transition-all placeholder:text-neutral-600 font-sans"
                    />
                  </div>

                  {/* Rarity Filter */}
                  <div>
                    <select
                      value={rarityFilter}
                      onChange={(e) => setRarityFilter(e.target.value)}
                      className="w-full bg-black/50 border border-neutral-900 rounded-lg px-3 py-2 text-xs text-neutral-400 focus:border-portal/50 outline-none transition-all appearance-none cursor-pointer font-sans"
                    >
                      <option value="all">All Rarities</option>
                      <option value="Common">Common</option>
                      <option value="Rare">Rare</option>
                      <option value="Epic">Epic</option>
                      <option value="Legendary">Legendary</option>
                      <option value="Mythic">Mythic</option>
                      <option value="Transcendent">Transcendent</option>
                    </select>
                  </div>

                  {/* Milestone Filter */}
                  <div>
                    <select
                      value={milestoneFilter}
                      onChange={(e) => setMilestoneFilter(e.target.value)}
                      className="w-full bg-black/50 border border-neutral-900 rounded-lg px-3 py-2 text-xs text-neutral-400 focus:border-portal/50 outline-none transition-all appearance-none cursor-pointer font-sans"
                    >
                      <option value="all">All Milestones</option>
                      <option value="rank_up">Dao Breakthroughs</option>
                      <option value="chapter_seal">Chapter Sealing</option>
                      <option value="chapter_5">Story Depth (Ch. 5)</option>
                      <option value="challenge_complete">Fate Survival Runs</option>
                    </select>
                  </div>
                </div>

                {/* Artifacts Grid */}
                {(() => {
                  const artifacts = profile?.cosmicInventory || [];
                  const filteredArtifacts = artifacts.filter(art => {
                    const matchesSearch = 
                      art.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                      art.description.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                      (art.attributeBoost && art.attributeBoost.toLowerCase().includes(inventorySearch.toLowerCase())) ||
                      art.milestoneName.toLowerCase().includes(inventorySearch.toLowerCase());
                      
                    const matchesRarity = rarityFilter === 'all' || art.rarity === rarityFilter;
                    const matchesMilestone = milestoneFilter === 'all' || art.milestoneType === milestoneFilter;
                    
                    return matchesSearch && matchesRarity && matchesMilestone;
                  });

                  const renderArtifactIcon = (name: string, rarity: string) => {
                    const lower = name.toLowerCase();
                    const size = 20;
                    let className = "";
                    
                    if (rarity === 'Transcendent') className = "text-cyan-400 animate-pulse drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]";
                    else if (rarity === 'Mythic') className = "text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]";
                    else if (rarity === 'Legendary') className = "text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]";
                    else if (rarity === 'Epic') className = "text-purple-400";
                    else if (rarity === 'Rare') className = "text-emerald-400";
                    else className = "text-neutral-500";

                    if (lower.includes('medallion') || lower.includes('badge')) return <Award size={size} className={className} />;
                    if (lower.includes('seal') || lower.includes('signet')) return <Shield size={size} className={className} />;
                    if (lower.includes('gourd') || lower.includes('nectar') || lower.includes('cauldron') || lower.includes('potion')) return <Zap size={size} className={className} />;
                    if (lower.includes('spindle') || lower.includes('thread') || lower.includes('matrix')) return <RefreshCw size={size} className={className} />;
                    if (lower.includes('pen') || lower.includes('brush') || lower.includes('scribe')) return <Save size={size} className={className} />;
                    if (lower.includes('crown') || lower.includes('circlet') || lower.includes('tiara')) return <Sliders size={size} className={className} />;
                    if (lower.includes('compass')) return <Compass size={size} className={className} />;
                    if (lower.includes('mirror')) return <Globe size={size} className={className} />;
                    if (lower.includes('key')) return <Key size={size} className={className} />;
                    return <Sparkles size={size} className={className} />;
                  };

                  if (filteredArtifacts.length === 0) {
                    return (
                      <div className="border border-dashed border-neutral-900 rounded-xl p-8 text-center bg-black/10">
                        <HelpCircle size={32} className="text-neutral-700 mx-auto mb-2.5 animate-pulse" />
                        <p className="text-xs font-serif text-neutral-500">
                          No sacred relics manifest under current filters. Ascend your Dao level, seal chapters, or succeed in challenges to gain relics!
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredArtifacts.map((art) => {
                        const isEquipped = profile?.equippedArtifactId === art.id;
                        const isTranscendent = art.rarity === 'Transcendent';
                        const isMythic = art.rarity === 'Mythic';
                        const isLegendary = art.rarity === 'Legendary';
                        const isEpic = art.rarity === 'Epic';
                        const isRare = art.rarity === 'Rare';

                        let borderClass = 'border-neutral-900 hover:border-neutral-800';
                        let bgGlowClass = 'bg-[#030303]';
                        let rarityTextClass = 'text-neutral-500';

                        if (isTranscendent) {
                          borderClass = 'border-cyan-500/30 hover:border-cyan-400/50';
                          bgGlowClass = 'bg-cyan-950/5 shadow-[0_0_20px_rgba(6,182,212,0.15)]';
                          rarityTextClass = 'bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-rose-400 to-yellow-400 font-extrabold animate-pulse';
                        } else if (isMythic) {
                          borderClass = 'border-red-950/60 hover:border-red-500/30';
                          bgGlowClass = 'bg-red-950/5 shadow-[0_0_15px_rgba(220,38,38,0.1)]';
                          rarityTextClass = 'text-red-400 font-extrabold animate-pulse';
                        } else if (isLegendary) {
                          borderClass = 'border-amber-950/80 hover:border-amber-500/30';
                          bgGlowClass = 'bg-amber-950/5 shadow-[0_0_12px_rgba(245,158,11,0.08)]';
                          rarityTextClass = 'text-amber-400 font-bold';
                        } else if (isEpic) {
                          borderClass = 'border-purple-950/80 hover:border-purple-500/20';
                          bgGlowClass = 'bg-purple-950/5 shadow-[0_0_10px_rgba(139,92,246,0.05)]';
                          rarityTextClass = 'text-purple-400';
                        } else if (isRare) {
                          borderClass = 'border-emerald-950/80 hover:border-emerald-500/20';
                          bgGlowClass = 'bg-emerald-950/5';
                          rarityTextClass = 'text-emerald-400';
                        }

                        return (
                          <button
                            type="button"
                            key={art.id}
                            className={`text-left w-full border rounded-xl p-4 flex flex-col justify-between transition-all duration-300 relative group cursor-pointer ${borderClass} ${bgGlowClass}`}
                            onClick={() => setInspectArtifact(art)}
                          >
                            {/* Equipped indicator */}
                            {isEquipped && (
                              <div className="absolute top-2 right-2 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                              </div>
                            )}

                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-black/40 border border-neutral-900 flex items-center justify-center relative overflow-hidden group-hover:border-neutral-850 transition-all shrink-0">
                                  {renderArtifactIcon(art.name, art.rarity)}
                                  {isEquipped && (
                                    <div className="absolute inset-0 border border-amber-500/40 rounded-lg animate-pulse"></div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-[13px] font-sans font-medium text-signal truncate group-hover:text-portal transition-colors flex items-center gap-1.5">
                                    {art.name}
                                  </h4>
                                  <span className={`text-[9px] uppercase tracking-widest font-mono font-medium block ${rarityTextClass}`}>
                                    {art.rarity}
                                  </span>
                                </div>
                              </div>

                              <p className="text-[11px] font-serif text-neutral-400 line-clamp-2 leading-relaxed italic">
                                "{art.description}"
                              </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-neutral-900/40 flex items-center justify-between text-[9px] text-neutral-500 font-mono">
                              <div className="flex items-center gap-1 text-portal/70">
                                <Sparkles size={10} />
                                <span>{art.attributeBoost}</span>
                              </div>
                              <span className="text-neutral-600 truncate max-w-[100px] text-right">
                                {art.milestoneName}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Detailed Artifact Inspect Modal */}
              {inspectArtifact && (
                <div 
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" 
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setInspectArtifact(null);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') setInspectArtifact(null); }}
                >
                  <div 
                    className="w-full max-w-md bg-void border border-neutral-900 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(4,172,255,0.1)] relative"
                    role="dialog"
                    aria-modal="true"
                  >
                    {/* Top glow indicator */}
                    <div className={`absolute top-0 inset-x-0 h-[2px] ${
                      inspectArtifact.rarity === 'Transcendent' 
                        ? 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent' 
                        : inspectArtifact.rarity === 'Mythic' 
                        ? 'bg-gradient-to-r from-transparent via-red-500 to-transparent' 
                        : inspectArtifact.rarity === 'Legendary' 
                        ? 'bg-gradient-to-r from-transparent via-amber-500 to-transparent'
                        : inspectArtifact.rarity === 'Epic'
                        ? 'bg-gradient-to-r from-transparent via-purple-500 to-transparent'
                        : inspectArtifact.rarity === 'Rare'
                        ? 'bg-gradient-to-r from-transparent via-emerald-500 to-transparent'
                        : 'bg-gradient-to-r from-transparent via-neutral-500 to-transparent'
                    }`}></div>
                    
                    <div className="p-6 space-y-6">
                      {/* Icon & Title */}
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-black/60 border border-neutral-900 flex items-center justify-center relative shadow-inner overflow-hidden">
                          {(() => {
                            const lower = inspectArtifact.name.toLowerCase();
                            const size = 28;
                            let className = "";
                            const rarity = inspectArtifact.rarity;
                            
                            if (rarity === 'Transcendent') className = "text-cyan-400 animate-pulse drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]";
                            else if (rarity === 'Mythic') className = "text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]";
                            else if (rarity === 'Legendary') className = "text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]";
                            else if (rarity === 'Epic') className = "text-purple-400";
                            else if (rarity === 'Rare') className = "text-emerald-400";
                            else className = "text-neutral-500";

                            if (lower.includes('medallion') || lower.includes('badge')) return <Award size={size} className={className} />;
                            if (lower.includes('seal') || lower.includes('signet')) return <Shield size={size} className={className} />;
                            if (lower.includes('gourd') || lower.includes('nectar') || lower.includes('cauldron') || lower.includes('potion')) return <Zap size={size} className={className} />;
                            if (lower.includes('spindle') || lower.includes('thread') || lower.includes('matrix')) return <RefreshCw size={size} className={className} />;
                            if (lower.includes('pen') || lower.includes('brush') || lower.includes('scribe')) return <Save size={size} className={className} />;
                            if (lower.includes('crown') || lower.includes('circlet') || lower.includes('tiara')) return <Sliders size={size} className={className} />;
                            if (lower.includes('compass')) return <Compass size={size} className={className} />;
                            if (lower.includes('mirror')) return <Globe size={size} className={className} />;
                            if (lower.includes('key')) return <Key size={size} className={className} />;
                            return <Sparkles size={size} className={className} />;
                          })()}
                          <div className="absolute inset-0 bg-gradient-to-t from-portal/5 via-transparent to-transparent"></div>
                        </div>
                        
                        <div className="space-y-1">
                          <span className={`text-[10px] uppercase font-bold tracking-widest font-mono block px-3 py-1 rounded-full bg-neutral-900/50 border border-neutral-850 max-w-fit mx-auto ${
                            inspectArtifact.rarity === 'Transcendent' 
                              ? 'text-cyan-400 border-cyan-950 bg-cyan-950/20' 
                              : inspectArtifact.rarity === 'Mythic' 
                              ? 'text-red-400 border-red-950 bg-red-950/20' 
                              : inspectArtifact.rarity === 'Legendary' 
                              ? 'text-amber-400 border-amber-950 bg-amber-950/20'
                              : inspectArtifact.rarity === 'Epic'
                              ? 'text-purple-400 border-purple-950 bg-purple-950/20'
                              : inspectArtifact.rarity === 'Rare'
                              ? 'text-emerald-400 border-emerald-950 bg-emerald-950/20'
                              : 'text-neutral-400'
                          }`}>
                            {inspectArtifact.rarity} Relic
                          </span>
                          <h3 className="font-display text-xl text-signal">{inspectArtifact.name}</h3>
                          <p className="text-[10px] text-neutral-500 font-mono">
                            Acquired on {new Date(inspectArtifact.unlockedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      {/* Lore / Story description */}
                      <div className="bg-[#030303] border border-neutral-900 p-4 rounded-xl space-y-2 shadow-inner">
                        <h4 className="text-[9px] uppercase font-bold tracking-widest text-neutral-500 font-sc">Sacred Relic Lore</h4>
                        <p className="text-xs font-serif text-neutral-300 leading-relaxed italic">
                          "{inspectArtifact.description}"
                        </p>
                      </div>

                      {/* Meridian Attribute Boost */}
                      <div className="bg-[#030303] border border-neutral-900 p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <h4 className="text-[9px] uppercase font-bold tracking-widest text-neutral-500 font-sc">Karmic Resonance</h4>
                          <p className="text-[10px] text-neutral-500 font-sans mt-0.5">Continuous soul-meridian boost</p>
                        </div>
                        <div className="px-3 py-1.5 bg-portal/10 border border-portal/30 rounded-lg text-xs font-bold font-mono text-portal animate-pulse flex items-center gap-1.5 shadow-[0_0_10px_rgba(4,172,255,0.1)]">
                          <Sparkles size={12} />
                          <span>{inspectArtifact.attributeBoost}</span>
                        </div>
                      </div>

                      {/* Milestone Details */}
                      <div className="text-[10px] text-neutral-500 font-mono flex justify-between items-center px-1">
                        <span>Unlock Catalyst:</span>
                        <span className="text-neutral-300 font-sans font-medium">{inspectArtifact.milestoneName}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                            handleAttuneArtifact(inspectArtifact.id);
                          }}
                          className={`flex-1 py-2.5 border rounded-full font-sc uppercase tracking-widest text-[11px] font-bold transition-all ${
                            profile?.equippedArtifactId === inspectArtifact.id
                              ? 'bg-transparent border-amber-500/40 text-amber-500 hover:bg-amber-500/10'
                              : 'bg-portal/10 border border-portal/30 text-portal hover:bg-portal hover:text-void shadow-[0_0_15px_rgba(4,172,255,0.1)]'
                          }`}
                        >
                          {profile?.equippedArtifactId === inspectArtifact.id ? 'Sever Attunement' : 'Attune Soul to Relic'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectArtifact(null)}
                          className="px-6 py-2.5 border border-neutral-800 text-neutral-400 hover:text-signal hover:border-neutral-700 rounded-full font-sc uppercase tracking-widest text-[11px] font-bold transition-all"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Own Stories Section */}
              <div className="pt-10 border-t border-neutral-900/50 mt-10">
                <h3 className="text-[11px] uppercase font-bold tracking-widest text-neutral-500 font-sc mb-6 flex items-center gap-2">
                  <BookOpen size={14} className="text-human" />
                  Manifested Realms
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Active Stories */}
                  <div className="border border-portal/10 bg-void rounded-xl p-5 shadow-[0_0_15px_rgba(4,172,255,0.03)] hover:border-portal/30 transition-all duration-300">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
                      <h4 className="text-[10px] uppercase font-bold tracking-widest text-portal font-sc">Active Flows</h4>
                      <span className="text-[9px] px-2 py-0.5 bg-portal/10 text-portal rounded-full font-bold">{activeFlows.length}</span>
                    </div>
                    <div className="space-y-3">
                      {activeFlows.length === 0 ? (
                        <div className="text-[11px] text-neutral-600 font-sans italic tracking-wide">No realms manifested yet.</div>
                      ) : (
                        activeFlows.map(s => (
                          <div key={s.id} className="text-[13px] text-neutral-300 font-sans flex items-center gap-3 overflow-hidden group hover:text-signal transition-colors py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-portal flex-shrink-0 animate-pulse"></span>
                            <span className="truncate">{s.title}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Inactive Stories */}
                  <div className="border border-human-brand/10 bg-void rounded-xl p-5 shadow-[0_0_15px_rgba(139,0,0,0.03)] hover:border-human-brand/30 transition-all duration-300">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
                      <h4 className="text-[10px] uppercase font-bold tracking-widest text-human font-sc">Sealed Flows</h4>
                      <span className="text-[9px] px-2 py-0.5 bg-human/10 text-human rounded-full font-bold">{inactiveFlowIds.length}</span>
                    </div>
                    <div className="space-y-3">
                      {inactiveFlowIds.length === 0 ? (
                        <div className="text-[11px] text-neutral-600 font-sans italic tracking-wide">No realms currently sealed.</div>
                      ) : (
                        inactiveFlowIds.map(id => {
                          const story = stories.find(s => s.id === id);
                          const title = story ? story.title : `Story ${id.split('-').pop()}`;
                          return (
                            <div key={id} className="text-[13px] text-neutral-500 font-sans flex items-center gap-3 overflow-hidden hover:text-neutral-400 transition-colors py-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-human-brand/50 flex-shrink-0"></span>
                              <span className="truncate italic">{title}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 flex gap-4 min-h-[40px] mt-8">
                {isEditing ? (
                  <>
                    <button 
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleSave} 
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

      {/* Divine Mirror of the Soul Modal */}
      {showPortraitModal && (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-void border border-neutral-900 w-full max-w-lg rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(4,172,255,0.12)] flex flex-col relative max-h-[90vh] text-signal font-sans">
            {/* Ethereal top border light */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-portal to-transparent"></div>
            
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-neutral-900/50 flex justify-between items-center bg-black/30 shrink-0">
              <div>
                <h3 className="font-display text-xl sm:text-2xl text-signal font-bold tracking-wide flex items-center gap-2">
                  <Sparkles className="text-portal animate-pulse" size={18} />
                  Divine Mirror of the Soul
                </h3>
                <p className="text-[10px] sm:text-[11px] text-portal/70 font-sc font-bold uppercase tracking-widest mt-1">
                  Weave Mortal likeness into Immortal Essence
                </p>
              </div>
              <button 
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                  setShowPortraitModal(false);
                  setPortraitUploadFile(null);
                  setPortraitUploadBase64('');
                  setPortraitDesc('');
                  setGeneratedPortraitUrl('');
                  setPortraitError('');
                }}
                className="text-neutral-500 hover:text-signal transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
              
              {portraitError && (
                <div className="p-3.5 bg-human/10 border border-human/30 text-human rounded-lg text-xs font-mono text-center">
                  {portraitError}
                </div>
              )}

              {/* Upload and Side-by-side View */}
              {!generatedPortraitUrl && !isGeneratingPortrait ? (
                <div className="space-y-4">
                  <label htmlFor="portrait-file-input" className="block text-xs font-sc font-bold uppercase tracking-widest text-neutral-400">
                    Mortal likeness projection
                  </label>
                  
                  {portraitUploadBase64 ? (
                    <div className="relative group rounded-xl overflow-hidden border border-neutral-900 bg-black/60 p-4 flex flex-col items-center justify-center">
                      <img 
                        src={portraitUploadBase64} 
                        alt="Mortal Looks Preview" 
                        className="w-32 h-32 object-cover rounded-full border border-neutral-800/80 grayscale filter group-hover:grayscale-0 transition-all duration-500 animate-[pulse_3s_infinite]"
                      />
                      <button 
                         tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                          setPortraitUploadFile(null);
                          setPortraitUploadBase64('');
                        }}
                        className="mt-3 text-[10px] font-sc font-bold uppercase tracking-widest text-human/80 hover:text-human border border-human/20 hover:border-human/50 px-2.5 py-1 bg-human/5 rounded transition-all"
                      >
                        Reset Likeness
                      </button>
                    </div>
                  ) : (
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('portrait-file-input')?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          document.getElementById('portrait-file-input')?.click();
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                        dragActive 
                          ? 'border-portal bg-portal/5 shadow-[0_0_20px_rgba(4,172,255,0.1)]' 
                          : 'border-neutral-800 hover:border-portal/50 hover:bg-neutral-900/20'
                      }`}
                    >
                      <input 
                        type="file" 
                        id="portrait-file-input" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => e.target.files && e.target.files[0] && handleFileChange(e.target.files[0])}
                      />
                      <Upload size={24} className="text-neutral-500 mb-2 animate-pulse" />
                      <p className="text-xs text-neutral-300 font-sans">
                        Drag & drop your portrait here, or <span className="text-portal font-semibold">click to browse</span>
                      </p>
                      <p className="text-[10px] text-neutral-500 font-mono mt-1">
                        PNG, JPG or WEBP (Standard Photo)
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Form Input for Custom Affiliation/Details */}
              {!generatedPortraitUrl && !isGeneratingPortrait ? (
                <div className="space-y-2">
                  <label htmlFor="portrait-desc-input" className="block text-xs font-sc font-bold uppercase tracking-widest text-neutral-400">
                    Spiritual Path & Attunements (Optional Description)
                  </label>
                  <textarea
                    id="portrait-desc-input"
                    value={portraitDesc}
                    onChange={(e) => setPortraitDesc(e.target.value)}
                    placeholder="e.g., A thunder-infused cultivator with glowing crimson eyes, clad in midnight-black battle robes. Wielding a jade lightning sword."
                    rows={2}
                    maxLength={200}
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-signal focus:outline-none focus:border-portal/70 transition-colors placeholder-neutral-600 font-sans resize-none"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                    <span>Incorporate custom Xianxia visual themes</span>
                    <span>{portraitDesc.length}/200</span>
                  </div>
                </div>
              ) : null}

              {/* Spiritual Attunements Panel */}
              <div className="p-4 bg-neutral-950/80 border border-neutral-900 rounded-xl space-y-3 shadow-inner">
                <div className="flex justify-between items-center pb-2 border-b border-neutral-900/50">
                  <span className="text-[10px] font-sc font-bold uppercase tracking-widest text-neutral-400">Spiritual Attunements Channeled</span>
                  <span className="text-[9px] font-mono text-portal font-bold bg-portal/10 border border-portal/30 px-2 py-0.5 rounded-full uppercase animate-pulse">Loom Ready</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-sc font-bold uppercase tracking-wider text-neutral-500 block">Sect Dao Rank</span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Award size={12} className="text-portal" />
                      <span className="text-signal truncate" title={profile?.dao_rank || 'Mortal Reader'}>
                        {profile?.dao_rank || 'Mortal Reader'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-sc font-bold uppercase tracking-wider text-neutral-500 block">Active Power Stage</span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold flex-row">
                      <Flame size={12} className="text-human" />
                      <span className="text-signal truncate" title={currentPowerStage || 'Mortal Seeker'}>
                        {currentPowerStage || 'Mortal Seeker'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-sc font-bold uppercase tracking-wider text-neutral-500 block">Equipped Artifact</span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Compass size={12} className="text-amber-500" />
                      <span className="text-signal truncate" title={equippedArtifact?.name || 'No Relic'}>
                        {equippedArtifact?.name || 'No Relic'}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] font-serif italic text-neutral-500 leading-normal border-t border-neutral-900/50 pt-2">
                  "The Divine Mirror automatically reads your achievements and weaves robes, relics, and celestial auras directly into your final likeness."
                </p>
              </div>

              {/* Generation Progress Overlay */}
              {isGeneratingPortrait && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                  {/* Glowing custom loader spinner */}
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-portal/10 border-t-portal animate-spin"></div>
                    <div className="absolute inset-2 rounded-full border border-human/10 border-b-human animate-[spin_3s_linear_infinite_reverse]"></div>
                    <div className="absolute inset-4 rounded-full bg-void flex items-center justify-center">
                      <Sparkles size={16} className="text-portal animate-pulse" />
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-w-sm">
                    <h4 className="font-display text-lg text-signal animate-pulse">Refining Soul Signature</h4>
                    <p className="text-xs text-neutral-400 font-mono min-h-[1.5rem] tracking-wide">
                      {generationSteps[generationStep]}
                    </p>
                  </div>
                  
                  <div className="w-48 h-[2px] bg-neutral-900 rounded-full overflow-hidden relative">
                    <div 
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-portal to-human transition-all duration-1000"
                      style={{ width: `${((generationStep + 1) / generationSteps.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Successful Portrait View */}
              {generatedPortraitUrl && !isGeneratingPortrait && (
                <div className="space-y-6 flex flex-col items-center justify-center">
                  <div className="text-center">
                    <p className="text-[10px] font-sc font-bold uppercase tracking-[0.25em] text-portal mb-2">Immortal Manifestation</p>
                    <h4 className="font-display text-2xl text-signal">Cultivator Portrait Forged</h4>
                  </div>
                  
                  <div className="relative w-64 h-64 rounded-full p-1.5 border border-portal/40 shadow-[0_0_30px_rgba(4,172,255,0.15)] bg-black/40 overflow-hidden flex items-center justify-center group">
                    <img 
                      src={generatedPortraitUrl} 
                      alt="Cultivator Portrait" 
                      className="w-full h-full object-cover rounded-full border border-neutral-900 transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 rounded-full border border-portal/20 pointer-events-none scale-105 animate-[spin_20s_linear_infinite]"></div>
                  </div>

                  <p className="text-xs text-neutral-400 font-serif text-center max-w-sm italic leading-relaxed">
                    "Your features have been aligned with the ancient celestial laws, weaving your mortal likeness into the divine fabric."
                  </p>
                </div>
              )}
            </div>

            {/* Footer Control Panel */}
            <div className="border-t border-neutral-900/50 bg-black/20 shrink-0">
              <div className="p-6 flex gap-3">
                {generatedPortraitUrl ? (
                  <>
                    <button 
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleApplyPortrait}
                      className="flex-1 py-3 bg-portal hover:bg-portal/90 text-void font-sc font-bold uppercase text-[11px] tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(4,172,255,0.25)] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Save size={13} /> Attune as Avatar
                    </button>
                    <button 
                      onClick={() => {
                        setGeneratedPortraitUrl('');
                        setPortraitError('');
                      }}
                      className="px-5 py-3 border border-neutral-800 hover:border-neutral-600 text-neutral-300 font-sc font-bold uppercase text-[11px] tracking-widest rounded-xl transition-all cursor-pointer"
                    >
                      Re-forge
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      disabled={!portraitUploadBase64 || isGeneratingPortrait}
                      onClick={handleGeneratePortrait}
                      className={`flex-1 py-3 font-sc font-bold uppercase text-[11px] tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        portraitUploadBase64 && !isGeneratingPortrait
                          ? 'bg-portal hover:bg-portal/90 text-void shadow-[0_0_20px_rgba(4,172,255,0.25)] cursor-pointer'
                          : 'bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-800'
                      }`}
                    >
                      <Sparkles size={13} /> Forge Portrait
                    </button>
                    <button 
                      disabled={isGeneratingPortrait}
                      onClick={() => {
                        setShowPortraitModal(false);
                        setPortraitUploadFile(null);
                        setPortraitUploadBase64('');
                        setPortraitDesc('');
                        setGeneratedPortraitUrl('');
                        setPortraitError('');
                      }}
                      className="px-5 py-3 border border-neutral-800 hover:border-neutral-600 hover:text-signal text-neutral-400 font-sc font-bold uppercase text-[11px] tracking-widest rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
              
              {/* Privacy Shield Notice (Moved to Bottom) */}
              <div className="px-6 py-3 bg-neutral-900/30 border-t border-neutral-900/50 flex items-center justify-center gap-2 text-[10px] text-neutral-500 font-serif">
                <Shield size={12} className="text-portal/60" />
                <span>Absolute Privacy: Images are transient and never stored or displayed publicly.</span>
              </div>
            </div>
          </div>
        </div>
      )}

          {/* Settings & boring things at the very bottom! */}
          {renderBoringThings()}
        </div>
      </div>

      {pendingLanguageChange && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#030303] border border-portal/50 shadow-[0_0_30px_rgba(4,172,255,0.2)] rounded-2xl max-w-sm w-full p-6 text-center animate-fadeIn">
            <Globe size={32} className="text-portal mx-auto mb-4" />
            <h3 className="text-lg font-sc font-bold uppercase tracking-widest text-portal mb-2">Confirm Language Change</h3>
            <p className="text-sm font-sans text-neutral-400 mb-6 leading-relaxed">
              Are you able to read the interface and content in your newly selected language?<br/>
              It will revert automatically in <span className="text-signal font-mono font-bold text-lg">{countdown}</span> seconds.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmLanguageChange}
                className="w-full py-3 bg-portal text-void font-bold uppercase text-xs tracking-widest rounded-xl shadow-[0_0_15px_rgba(4,172,255,0.4)] hover:bg-portal/90 transition-all"
              >
                Yes, Keep Changes
              </button>
              <button 
                onClick={revertLanguageChange}
                className="w-full py-3 bg-transparent border border-neutral-800 text-neutral-400 font-bold uppercase text-xs tracking-widest rounded-xl hover:text-signal hover:border-neutral-600 transition-all"
              >
                No, Revert Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
