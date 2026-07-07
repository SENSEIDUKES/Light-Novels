import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile as UserProfileType, Story, AppUser } from '../types';
import { db, auth, LOCAL_ONLY_MODE } from '../lib/firebase';
import { doc, setDoc, onSnapshot, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';
import { getDaoRankData } from '../lib/qi';
import { getApiHeaders } from '../hooks/storyEngineHelpers';

interface UseUserProfileProps {
  currentUser: AppUser | null;
  stories: Story[];
  onLogout: () => void;
  onNavigateHome: () => void;
}

export function useUserProfile({ currentUser, stories, onLogout, onNavigateHome }: UseUserProfileProps) {
  const syncStatus = useAppStore(state => state.syncStatus);
  const setIsShortcutsOpen = useAppStore(state => state.setIsShortcutsOpen);
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
  const colorInputRef = useRef<HTMLInputElement>(null);
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

  const checkDaoConnection = useCallback(async () => {
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
      } as UserProfileType;

      try {
        localStorage.setItem('seihouse-local-user-profile', JSON.stringify(updatedLocalProfile));
      } catch(e) {}
      setProfile(updatedLocalProfile);
      setFormData(updatedLocalProfile);
      useAppStore.setState({ userProfile: updatedLocalProfile });
    }
  };

  // Derived metrics from actual stories state instead of just the profile fields
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
      const updates: any = {
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
        prevPreferred: profile.preferredLanguage || 'English',
        prevTranslation: profile.defaultTranslationLanguage || 'English'
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

  return {
    syncStatus,
    lastSavedTime,
    setIsSettingsOpen,
    handleExportLibrary,
    handleImportLibrary,
    storageType,
    localGeminiKey,
    localOpenrouterKey,
    localOllamaHost,
    isSettingsOpen,
    activeStoryId,
    routingConfig,
    profile,
    setProfile,
    isEditing,
    setIsEditing,
    formData,
    setFormData,
    isLoading,
    colorInputRef,
    error,
    setError,
    showAdvanced,
    setShowAdvanced,
    isQiMenuOpen,
    setIsQiMenuOpen,
    activeQiTooltip,
    setActiveQiTooltip,
    isAdminPanelOpen,
    setIsAdminPanelOpen,
    adminTab,
    setAdminTab,
    allUsers,
    allStories,
    isFetchingAdminData,
    adminSearchQuery,
    setAdminSearchQuery,
    adminError,
    pendingLanguageChange,
    countdown,
    confirmLanguageChange,
    revertLanguageChange,
    handleFileChange,
    handleDrag,
    handleDrop,
    handleGeneratePortrait,
    handleApplyPortrait,
    daoStatus,
    daoDetail,
    checkDaoConnection,
    fetchAdminData,
    handleUpdateUserRole,
    handleUpdateUserTier,
    handleDeleteStoryAdmin,
    handleLogin,
    handleAttuneArtifact,
    activeStoriesCount,
    setIsShortcutsOpen,
    setPortraitUploadFile,
    setPortraitUploadBase64,
    currentStreak,
    isCracked,
    daysTo3,
    daysTo10,
    handleRepairPillar,
    handleCheckIn,
    handleLanguageChangeDirect,
    handleSave,
    handleChange,
    isAuditing,
    auditResult,
    handleRunAudit,
    handleRecover,
    daoData,
    equippedArtifact,
    currentPowerStage,
    showPortraitModal,
    setShowPortraitModal,
    portraitUploadFile,
    portraitUploadBase64,
    portraitDesc,
    setPortraitDesc,
    isGeneratingPortrait,
    generatedPortraitUrl,
    portraitError,
    dragActive,
    generationStep,
    onLogout,
    onNavigateHome
  };
}
