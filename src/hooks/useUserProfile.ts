import React, { useState, useEffect, useRef } from 'react';
import { UserProfile as UserProfileType, Story, AppUser } from '../types';
import { db, auth, LOCAL_ONLY_MODE } from '../lib/firebase';
import { doc, setDoc, onSnapshot, collection, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';
import { getDaoRankData } from '../lib/qi';
import { getApiHeaders } from '../hooks/storyEngineHelpers';
import { generateId } from '../lib/id';
import { generateCultivatorPortrait } from '../services/cultivatorPortrait';

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
  const activeStoryId = useAppStore(state => state.activeStoryId);
  const routingConfig = useAppStore(state => state.routingConfig);

  const activeProfileUid = currentUser?.uid ?? null;
  const activeProfileUidRef = useRef<string | null>(activeProfileUid);
  const visibleProfileUid = activeProfileUid ?? 'anonymous';

  const [storedProfile, setProfile] = useState<UserProfileType | null>(null);
  const profile = storedProfile?.uid === visibleProfileUid ? storedProfile : null;
  const [isEditing, setIsEditing] = useState(false);
  const [storedFormData, setFormData] = useState<Partial<UserProfileType>>({});
  const formData = storedFormData.uid === visibleProfileUid ? storedFormData : {};
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
  const adminRequestVersionRef = useRef(0);

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

  // Profile, editing, portrait, and admin state is account-scoped. Clear it as
  // soon as the identity changes so account A can never be rendered while the
  // account B snapshot is loading (or if that snapshot fails).
  useEffect(() => {
    activeProfileUidRef.current = activeProfileUid;
    adminRequestVersionRef.current += 1;
    setProfile(null);
    setFormData({});
    setIsEditing(false);
    setIsLoading(Boolean(activeProfileUid));
    setError('');
    setShowAdvanced(false);
    setIsQiMenuOpen(false);
    setActiveQiTooltip(null);
    setIsAdminPanelOpen(false);
    setAdminTab('users');
    setAllUsers([]);
    setAllStories([]);
    setIsFetchingAdminData(false);
    setAdminSearchQuery('');
    setAdminError('');
    setPendingLanguageChange(null);
    setCountdown(30);
    setShowPortraitModal(false);
    setPortraitUploadFile(null);
    setPortraitUploadBase64('');
    setPortraitDesc('');
    setIsGeneratingPortrait(false);
    setGeneratedPortraitUrl('');
    setPortraitError('');
    setDragActive(false);
    setGenerationStep(0);
  }, [activeProfileUid]);

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
    setIsGeneratingPortrait(true);
    setPortraitError("");
    setGeneratedPortraitUrl("");
    setGenerationStep(0);

    const stepInterval = setInterval(() => {
      setGenerationStep(prev => (prev < generationSteps.length - 1 ? prev + 1 : prev));
    }, 2500);

    try {
      const apiHeaders = await getApiHeaders();
      const imageUrl = await generateCultivatorPortrait({
        image: portraitUploadBase64 || undefined,
        description: portraitDesc,
        daoRank: profile?.dao_rank || "Mortal Reader",
        daoXp: profile?.dao_xp || 0,
        powerStage: currentPowerStage,
        equippedArtifact: equippedArtifact ? {
          id: equippedArtifact.id,
          name: equippedArtifact.name,
          description: equippedArtifact.description,
          rarity: equippedArtifact.rarity
        } : undefined,
        routingConfig,
      }, apiHeaders);

      setGeneratedPortraitUrl(imageUrl);
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
      let localProfile = null;
      try {
        const localProfileStr = localStorage.getItem('seihouse-local-user-profile');
        localProfile = localProfileStr ? JSON.parse(localProfileStr) : null;
      } catch (e) {
        console.warn("Failed to parse local profile:", e);
      }
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

  const fetchAdminData = async () => {
    const requestUid = activeProfileUidRef.current;
    if (!requestUid) {
      setAllUsers([]);
      setAllStories([]);
      setIsFetchingAdminData(false);
      return;
    }
    const requestVersion = ++adminRequestVersionRef.current;
    const requestIsCurrent = () =>
      activeProfileUidRef.current === requestUid
      && adminRequestVersionRef.current === requestVersion;

    setIsFetchingAdminData(true);
    setAdminError('');
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      if (!requestIsCurrent()) return;
      const usersList: UserProfileType[] = [];
      usersSnap.forEach((d) => {
        usersList.push(d.data() as UserProfileType);
      });
      setAllUsers(usersList);

      const storiesSnap = await getDocs(collection(db, 'stories'));
      if (!requestIsCurrent()) return;
      const storiesList: any[] = [];
      storiesSnap.forEach((d) => {
        const story = d.data();
        if (!story.deleted) storiesList.push(story);
      });
      setAllStories(storiesList);
    } catch (err: any) {
      if (!requestIsCurrent()) return;
      console.error(err);
      setAdminError(err.message || 'Failed to fetch admin data. Check security rules or authentication.');
    } finally {
      if (requestIsCurrent()) {
        setIsFetchingAdminData(false);
      }
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
    if (!window.confirm("Remove this story and its chapter content from the cloud? A deletion marker will remain so offline devices cannot restore it.")) {
      return;
    }
    try {
      const storyRef = doc(db, 'stories', storyId);
      const storySnap = await getDoc(storyRef);
      if (storySnap.exists()) {
        const ownerUid = storySnap.data().userId;
        if (typeof ownerUid !== 'string' || !ownerUid) {
          throw new Error('Story owner is missing; refusing an unsafe deletion');
        }
        await setDoc(storyRef, {
          id: storyId,
          userId: ownerUid,
          deleted: true,
          updatedAt: new Date().toISOString(),
        });
        const chaptersSnap = await getDocs(collection(db, 'stories', storyId, 'chapters'));
        await Promise.all(chaptersSnap.docs.map(chapter => deleteDoc(chapter.ref)));
      }
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

    const expectedUid = currentUser.uid;
    let cancelled = false;
    const snapshotIsCurrent = () =>
      !cancelled && activeProfileUidRef.current === expectedUid;

    setIsLoading(true);
    // Subscribe to profile updates
    const unsubscribe = onSnapshot(
      doc(db, 'users', expectedUid),
      (docSnap) => {
        if (!snapshotIsCurrent()) return;
        if (docSnap.exists()) {
          const data: UserProfileType = {
            ...(docSnap.data() as UserProfileType),
            uid: expectedUid,
          };

          // Auto-bootstrap Owner role and Immortal tier for owner emails.
          const email = currentUser.email?.toLowerCase();
          if (email === 'amaurylindy@gmail.com' || email === 'seihouseproductions@gmail.com') {
            data.role = 'owner';
            data.premiumTier = 'immortal';
          }

          setProfile(data);
          setError('');
        } else {
          const email = currentUser.email?.toLowerCase();
          const isOwner = email === 'amaurylindy@gmail.com' || email === 'seihouseproductions@gmail.com';
          const defaultProfile: UserProfileType = {
            uid: expectedUid,
            username: currentUser.email?.split('@')[0] || `user_${expectedUid.substring(0,5)}`,
            displayName: currentUser.displayName || '',
            avatarUrl: currentUser.photoURL || '',
            preferredLanguage: 'English',
            defaultTranslationLanguage: 'English',
            savedStoryCount: 0,
            activeStories: [],
            inactiveStories: [],
            joinedDate: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            role: isOwner ? 'owner' : 'user',
            premiumTier: isOwner ? 'immortal' : 'mortal'
          };

          // Publish only a profile belonging to the active identity, and do not
          // start a default write from a queued callback after an account switch.
          if (!snapshotIsCurrent()) return;
          setProfile(defaultProfile);
          void setDoc(doc(db, 'users', expectedUid), defaultProfile, { merge: true }).catch(err => {
            if (!snapshotIsCurrent()) return;
            console.error("Failed to create profile", err);
            setError('Unable to create profile data.');
          });
        }
        setIsLoading(false);
      },
      (err) => {
        if (!snapshotIsCurrent()) return;
        console.error(err);
        setProfile(null);
        setFormData({});
        setError('Unable to load profile data.');
        setIsLoading(false);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!isEditing && profile) {
      setFormData(profile);
    }
  }, [profile, isEditing]);

  useEffect(() => {
    if (!currentUser) {
      let localInventory = [];
      try {
        const localInvStr = localStorage.getItem('seihouse-local-cosmic-inventory');
        localInventory = localInvStr ? JSON.parse(localInvStr) : [];
      } catch (e) {
        console.warn("Failed to parse local inventory:", e);
      }

      let localProfile = null;
      try {
        const localProfileStr = localStorage.getItem('seihouse-local-user-profile');
        localProfile = localProfileStr ? JSON.parse(localProfileStr) : null;
      } catch (e) {
        console.warn("Failed to parse local profile:", e);
      }

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
      let localProfile = null;
      try {
        const localProfileStr = localStorage.getItem('seihouse-local-user-profile');
        localProfile = localProfileStr ? JSON.parse(localProfileStr) : null;
      } catch (e) {
        console.warn("Failed to parse local profile:", e);
      }

      let localInventory = [];
      try {
        const localInvStr = localStorage.getItem('seihouse-local-cosmic-inventory');
        localInventory = localInvStr ? JSON.parse(localInvStr) : [];
      } catch (e) {
        console.warn("Failed to parse local inventory:", e);
      }

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
      let localProfile = {};
      try {
        const localProfileStr = localStorage.getItem('seihouse-local-user-profile');
        localProfile = localProfileStr ? JSON.parse(localProfileStr) : {};
      } catch (e) {
        console.warn("Failed to parse local profile:", e);
      }
      const updatedLocalProfile = {
        ...localProfile,
        uid: 'anonymous',
        preferredLanguage: preferredLang,
        defaultTranslationLanguage: defaultTransLang,
        updatedAt: new Date().toISOString()
      };
      try {
        localStorage.setItem('seihouse-local-user-profile', JSON.stringify(updatedLocalProfile));
      } catch(e) {}
      setProfile(updatedLocalProfile as UserProfileType);
      useAppStore.setState({ userProfile: updatedLocalProfile as UserProfileType });
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

  const daoData = getDaoRankData(profile?.dao_xp || profile?.qi || 0);

  return {
    syncStatus,
    lastSavedTime,
    setIsSettingsOpen,
    handleExportLibrary,
    handleImportLibrary,
    storageType,
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
