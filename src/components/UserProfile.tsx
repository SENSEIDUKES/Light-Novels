import { generateId } from '../lib/id';
import React, { useState, useEffect } from 'react';
import { UserProfile as UserProfileType, Story, AppUser } from '../types';
import { db, auth, LOCAL_ONLY_MODE, setLocalOnlyMode } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { LogOut, Save, User as UserIcon, Calendar, BookOpen, Globe, Cloud, CloudOff, RefreshCw, Sliders, Upload, Download, Database, Zap, Keyboard, Flame, Award, Shield, Compass, Key, Sparkles, Search, Sword, HelpCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';
import { getDaoRankData, AURA_TIERS, getAuraTextStyle, getAuraGlowStyle } from '../lib/qi';
import { getApiHeaders } from '../hooks/storyEngineHelpers';
import { UserProfileAdminPanel } from './UserProfileAdminPanel';
import { UserProfileSettingsPanel } from './UserProfileSettingsPanel';
import { UserProfileInventoryPanel } from './UserProfileInventoryPanel';
import { UserProfileStoriesPanel } from './UserProfileStoriesPanel';
import { UserProfilePortraitModal } from './UserProfilePortraitModal';

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
  const [isQiMenuOpen, setIsQiMenuOpen] = useState(false);
  const [activeQiTooltip, setActiveQiTooltip] = useState<string | null>(null);

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

  const [daoStatus, setDaoStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [daoDetail, setDaoDetail] = useState<string>('Sensing alignment with the cosmic Dao...');

  const checkDaoConnection = React.useCallback(async () => {
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
  }, [localGeminiKey, localOpenrouterKey, localOllamaHost]);

  useEffect(() => {
    checkDaoConnection();
  }, [localGeminiKey, localOpenrouterKey, localOllamaHost, isSettingsOpen, checkDaoConnection]);

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
          data.role = 'owner';
          data.premiumTier = 'immortal';
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
  }, [currentUser, isEditing]);

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
            id: `effect_${Date.now()}_${generateId(7)}`,
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

  // Settings Panel extracted

  // Admin panel extracted

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
          {(!currentUser && !LOCAL_ONLY_MODE) ? (
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
            <UserProfileAdminPanel 
              profile={profile}
              currentUser={currentUser}
              allUsers={allUsers}
              allStories={allStories}
              adminSearchQuery={adminSearchQuery}
              setAdminSearchQuery={setAdminSearchQuery}
              adminTab={adminTab}
              setAdminTab={setAdminTab}
              isFetchingAdminData={isFetchingAdminData}
              fetchAdminData={fetchAdminData}
              adminError={adminError}
              handleUpdateUserTier={handleUpdateUserTier}
              handleUpdateUserRole={handleUpdateUserRole}
              handleDeleteStoryAdmin={handleDeleteStoryAdmin}
            />
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
                            type="button"
                            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                            onClick={() => setLocalOnlyMode(!LOCAL_ONLY_MODE)}
                            className={`w-full px-3 py-2 border transition-all rounded-lg font-sc text-[9px] flex items-center gap-2 font-bold group ${LOCAL_ONLY_MODE ? 'bg-portal/10 border-portal text-portal hover:bg-portal/20' : 'bg-black border-neutral-850 hover:border-portal/50 text-neutral-400 hover:text-portal'}`}
                            title={LOCAL_ONLY_MODE ? "Switch to Cloud Sync Mode" : "Switch to Local-Only Mode"}
                          >
                            {LOCAL_ONLY_MODE ? <CloudOff size={12} className="group-hover:scale-110 transition-transform shrink-0" /> : <Cloud size={12} className="group-hover:scale-110 transition-transform shrink-0" />}
                            <span className="uppercase tracking-widest font-semibold whitespace-nowrap">
                              {LOCAL_ONLY_MODE ? "Local Mode (Click to connect Cloud)" : "Cloud Sync (Click to go Local)"}
                            </span>
                          </button>

                          {!LOCAL_ONLY_MODE && (
                            <button
                              tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleRunAudit}
                              disabled={isAuditing}
                              className="w-full flex items-center gap-2 bg-black hover:bg-neutral-900 text-neutral-300 hover:text-portal border border-neutral-800 hover:border-portal/50 px-3 py-2 rounded-lg text-[9px] font-sc font-bold uppercase tracking-wider disabled:opacity-20 disabled:cursor-not-allowed transition-all group"
                            >
                              <Database size={12} className="text-portal group-hover:scale-110 transition-transform shrink-0" />
                              <span>Audit Sync</span>
                            </button>
                          )}

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
                      <div className="relative flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsQiMenuOpen(!isQiMenuOpen)}
                          className="flex items-center gap-2 px-4 py-1.5 bg-portal/10 border border-portal/30 text-portal text-[11px] font-bold tracking-widest uppercase rounded-lg shadow-[0_0_15px_rgba(4,172,255,0.1)] hover:bg-portal/20 transition-all z-10"
                        >
                          <Zap size={14} className="animate-pulse" />
                          <span>Qi Cores</span>
                        </button>
                        
                        {isQiMenuOpen && (
                          <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 w-[280px] bg-black/95 border border-neutral-800 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-3 z-50 animate-fadeIn space-y-2 backdrop-blur-md">
                            {/* Heavenly Qi Badge */}
                            <div className="space-y-1">
                              <button 
                                onClick={() => setActiveQiTooltip(activeQiTooltip === 'heavenly' ? null : 'heavenly')}
                                className="w-full flex justify-between items-center text-[10px] text-portal font-sc uppercase font-bold tracking-widest border border-portal/20 px-3 py-2.5 rounded-lg bg-portal/5 shadow-[0_0_10px_rgba(4,172,255,0.05)] hover:bg-portal/10 transition-colors"
                              >
                                <div className="flex items-center gap-2.5"><Zap size={14} className="text-portal animate-pulse" /> Heavenly Qi</div>
                                <span className="text-sm font-sans">{profile?.heavenly_qi !== undefined ? profile.heavenly_qi : daoData.currentQi}</span>
                              </button>
                              {activeQiTooltip === 'heavenly' && (
                                <div className="p-2 border-l border-portal/30 ml-1 mb-1 animate-fadeIn">
                                  <p className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                                    Your fundamental essence gained from reading realms, making choices, and overcoming tribulations. Tracks your progression to higher cultivator ranks and determines your celestial aura color.
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            {/* Sect Qi Badge */}
                            <div className="space-y-1">
                              <button 
                                onClick={() => setActiveQiTooltip(activeQiTooltip === 'sect' ? null : 'sect')}
                                className="w-full flex justify-between items-center text-[10px] text-[#FAFAFA] font-sc uppercase font-bold tracking-widest border border-[#8B0000]/40 px-3 py-2.5 rounded-lg bg-[#8B0000]/10 shadow-[0_0_10px_rgba(139,0,0,0.15)] hover:bg-[#8B0000]/20 transition-colors"
                              >
                                <div className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full bg-[#8B0000] animate-pulse shadow-[0_0_8px_rgba(139,0,0,0.8)]" /> Sect Qi</div>
                                <span className="text-sm font-sans">{profile?.sect_qi || 0}</span>
                              </button>
                              {activeQiTooltip === 'sect' && (
                                <div className="p-2 border-l border-[#8B0000]/50 ml-1 mb-1 animate-fadeIn">
                                  <p className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                                    Essence stored for your upcoming community contribution achievements. Utilized to exchange for special titles, customize sect affiliations, and fund cooperative arrays when the contribution hall is unlocked.
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Demonic Qi Badge */}
                            <div className="space-y-1">
                              <button 
                                onClick={() => setActiveQiTooltip(activeQiTooltip === 'demonic' ? null : 'demonic')}
                                className="w-full flex justify-between items-center text-[10px] text-amber-500 font-sc uppercase font-bold tracking-widest border border-amber-600/40 px-3 py-2.5 rounded-lg bg-amber-950/20 shadow-[0_0_10px_rgba(245,158,11,0.15)] hover:bg-amber-950/40 transition-colors"
                              >
                                <div className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" /> Demonic Qi</div>
                                <span className="text-sm font-sans">{profile?.demonic_qi || 0}</span>
                              </button>
                              {activeQiTooltip === 'demonic' && (
                                <div className="p-2 border-l border-amber-600/50 ml-1 mb-1 animate-fadeIn">
                                  <p className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                                    Corrupted cultivation power, unlocked from demonic artifacts or taboos. Proceed with caution when harnessing this forbidden essence.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
                            
                            <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                              {AURA_TIERS.map((tier) => {
                                const currentXp = profile?.dao_xp || profile?.qi || 0;
                                const isUnlocked = currentXp >= tier.unlockedAt;
                                const isSelected = formData.displayNameColor === tier.colorHex;
                                const progress = isUnlocked ? 100 : Math.min(100, Math.max(0, (currentXp / tier.unlockedAt) * 100));
                                
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
                                    className={`p-3 border rounded-xl text-left transition-all relative flex flex-col gap-3 group overflow-hidden ${
                                      !isUnlocked
                                        ? 'bg-black/40 border-neutral-900/80 cursor-not-allowed'
                                        : isSelected
                                        ? 'bg-portal/5 border-portal shadow-[0_0_15px_rgba(4,172,255,0.15)]'
                                        : 'bg-black/40 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/40'
                                    }`}
                                  >
                                    {/* Progress bar background for locked tiers */}
                                    {!isUnlocked && (
                                      <div className="absolute top-0 left-0 bottom-0 bg-neutral-900/30 -z-10" style={{ width: `${progress}%` }} />
                                    )}
                                    {/* Subtle glow background for unlocked tiers */}
                                    {isUnlocked && (
                                      <div className={`absolute inset-0 opacity-20 pointer-events-none -z-10 ${tier.bgGlow}`} />
                                    )}
                                    
                                    <div className="flex items-center gap-3 w-full z-10">
                                      {/* Color Preview Orb */}
                                      <div className="relative shrink-0 flex items-center justify-center w-10 h-10">
                                        <div className={`absolute inset-0 rounded-full opacity-30 ${isUnlocked ? 'animate-ping' : ''}`} style={tier.colorHex.startsWith('#') ? { backgroundColor: tier.colorHex } : undefined}></div>
                                        <div 
                                          className={`w-8 h-8 rounded-full border border-black/50 shadow-inner flex items-center justify-center ${!isUnlocked ? 'grayscale opacity-60' : ''}`}
                                          style={tier.colorHex.startsWith('#') ? { backgroundColor: tier.colorHex, boxShadow: `0 0 10px ${tier.colorHex}` } : { background: 'linear-gradient(to right, #a855f7, #ec4899, #eab308)' }}
                                        >
                                          {!isUnlocked && <span className="text-white drop-shadow-md text-[10px]">🔒</span>}
                                        </div>
                                      </div>

                                      <div className="flex-1 min-w-0 flex flex-col">
                                        <div className="flex justify-between items-center w-full gap-2">
                                          <span 
                                            className={`text-[12px] font-bold uppercase tracking-wider truncate ${!isUnlocked ? 'text-neutral-400' : ''}`} 
                                          >
                                            <span className={isUnlocked && (tier.textColor.includes('text-') || tier.textColor.includes('bg-')) ? tier.textColor : ''} style={!tier.textColor.includes('text') && !tier.textColor.includes('bg-') && isUnlocked ? { color: tier.colorHex } : undefined}>
                                              {formData.displayName || profile?.displayName || tier.rank}
                                            </span>
                                          </span>
                                          {isSelected && (
                                            <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-portal text-void font-bold shrink-0">
                                              Equipped
                                            </span>
                                          )}
                                        </div>
                                        
                                        <span className="text-[10px] text-neutral-300 font-serif italic mt-0.5 truncate">
                                          "{tier.rewardFeeling}"
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Detailed Description Footer */}
                                    <div className="flex items-center justify-between w-full pt-2 border-t border-white/5 z-10">
                                      <span className={`text-[9px] font-mono tracking-tighter uppercase ${!isUnlocked ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                        Aura: {tier.name}
                                      </span>
                                      {!isUnlocked ? (
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] text-neutral-500 font-mono shrink-0">
                                            {currentXp} / {tier.unlockedAt} Qi
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-[9px] text-portal/70 font-mono">
                                          Unlocked
                                        </span>
                                      )}
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
              <UserProfileInventoryPanel profile={profile} handleAttuneArtifact={handleAttuneArtifact} />

              {/* Own Stories Section */}
              <UserProfileStoriesPanel profile={profile} currentUser={currentUser} stories={stories} />

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
        <UserProfilePortraitModal
          showPortraitModal={showPortraitModal}
          setShowPortraitModal={setShowPortraitModal}
          portraitUploadFile={portraitUploadFile}
          setPortraitUploadFile={setPortraitUploadFile}
          portraitUploadBase64={portraitUploadBase64}
          setPortraitUploadBase64={setPortraitUploadBase64}
          portraitDesc={portraitDesc}
          setPortraitDesc={setPortraitDesc}
          isGeneratingPortrait={isGeneratingPortrait}
          portraitError={portraitError}
          generatedPortraitUrl={generatedPortraitUrl}
          generationStep={generationStep}
          handleGeneratePortrait={handleGeneratePortrait}
          handleApplyPortrait={handleApplyPortrait}
          daoData={daoData}
          equippedArtifact={equippedArtifact}
          profile={profile}
        />
      )}

          {/* Settings & boring things at the very bottom! */}
          <UserProfileSettingsPanel 
            syncStatus={syncStatus}
            daoStatus={daoStatus}
            daoDetail={daoDetail}
            checkDaoConnection={checkDaoConnection}
            lastSavedTime={lastSavedTime}
            formData={formData}
            profile={profile}
            handleLanguageChangeDirect={handleLanguageChangeDirect}
          />
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
