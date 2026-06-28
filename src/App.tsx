import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

// Store & Hooks
import { useAppStore } from './store/useAppStore';
import { useStoryEngine } from './hooks/useStoryEngine';
import { useStoryExporter } from './hooks/useStoryExporter';
import { storyStorage } from './lib/storage';

// Types
import { UserProfile as UserProfileType } from './types';

// Top-Level Layout Components
import { GlobalHeader } from './components/GlobalHeader';
import { LibraryScreen } from './components/LibraryScreen';
import { StoryDetailScreen } from './components/StoryDetailScreen';
import { ReaderScreen } from './components/ReaderScreen';
import { ModalsAndToasts } from './components/ModalsAndToasts';
import { CodexSheetOverlay } from './components/CodexSheetOverlay';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';

// Global FX & Audio
import { AtmosphericAudio } from './components/AtmosphericAudio';
import { ParticleSystem } from './components/ParticleSystem';
import CreationPortal from './components/CreationPortal';
import AILoadingVeil from './components/AILoadingVeil';
import { PricingScreen } from './components/PricingScreen';
import UserProfile from './components/UserProfile';
import { ChallengeScreen } from './components/ChallengeScreen';
import { SectsScreen } from './components/SectsScreen';
import { IdleCultivationModal } from './components/IdleCultivationModal';

function App() {
  const store_userProfile = useAppStore(state => state.userProfile);
    const store_stories = useAppStore(state => state.stories);
    const store_setDraftRecoverySession = useAppStore(state => state.setDraftRecoverySession);
    const store_initStorage = useAppStore(state => state.initStorage);
    const store_setCurrentUser = useAppStore(state => state.setCurrentUser);
    const store_setUserProfile = useAppStore(state => state.setUserProfile);
    const store_migrateOrDiscardDemoStories = useAppStore(state => state.migrateOrDiscardDemoStories);
    const store_setSyncStatus = useAppStore(state => state.setSyncStatus);
    const store_setStories = useAppStore(state => state.setStories);
    const store_activeStoryId = useAppStore(state => state.activeStoryId);
    const store_selectedChapterNum = useAppStore(state => state.selectedChapterNum);
    const store_updateChapter = useAppStore(state => state.updateChapter);
    const store_currentScreen = useAppStore(state => state.currentScreen);
    const store_isGenerating = useAppStore(state => state.isGenerating);
    const store_appError = useAppStore(state => state.appError);
    const store_setStoryToDelete = useAppStore(state => state.setStoryToDelete);
    const store_setIsCodexSheetOpen = useAppStore(state => state.setIsCodexSheetOpen);
    const store_currentUser = useAppStore(state => state.currentUser);
    const store_setCurrentScreen = useAppStore(state => state.setCurrentScreen);
  const storyEngine = useStoryEngine();
  const storyExporter = useStoryExporter();

  const [isInitializing, setIsInitializing] = useState(true);

  // Save active generation state to localStorage on any store change
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state) => {
      if (state.isGenerating) {
        const activeGen = {
          isGenerating: state.isGenerating,
          generationPhase: state.generationPhase,
          activeStoryId: state.activeStoryId,
          generatingChapterNum: state.generatingChapterNum,
          timestamp: Date.now()
        };
        try {
          localStorage.setItem('seihouse_active_generation', JSON.stringify(activeGen));
        } catch(e) {}
      } else {
        localStorage.removeItem('seihouse_active_generation');
      }
    });
    return () => unsubscribe();
  }, []);

  // Set HTML lang attribute based on preferred language for native browser UI translation
  useEffect(() => {
    const lang = store_userProfile?.preferredLanguage || 'English';
    const normalized = lang.toLowerCase();
    let langCode = 'en';
    if (normalized.includes("simplified chinese") || normalized.includes("简体中文") || (normalized.includes("chinese") && !normalized.includes("traditional"))) langCode = "zh-CN";
    else if (normalized.includes("traditional chinese") || normalized.includes("繁體中文")) langCode = "zh-TW";
    else if (normalized.includes("spanish")) langCode = "es";
    else if (normalized.includes("japanese") || normalized.includes("日本語")) langCode = "ja";
    else if (normalized.includes("french")) langCode = "fr";
    else if (normalized.includes("portuguese")) langCode = "pt-BR";
    else if (normalized.includes("german")) langCode = "de";
    else if (normalized.includes("korean") || normalized.includes("한국어")) langCode = "ko";
    else if (normalized.includes("vietnamese") || normalized.includes("tiếng việt")) langCode = "vi";
    else if (normalized.includes("indonesian") || normalized.includes("bahasa indonesia")) langCode = "id";
    else if (normalized.includes("thai") || normalized.includes("ภาษาไทย")) langCode = "th";
    else if (normalized.includes("tagalog") || normalized.includes("filipino")) langCode = "tl";
    else if (normalized.includes("malay") || normalized.includes("bahasa melayu")) langCode = "ms";
    
    document.documentElement.lang = langCode;
  }, [store_userProfile?.preferredLanguage]);

  // Check for unsaved chapter session after initialization
  useEffect(() => {
    if (isInitializing) return;

    const savedGen = localStorage.getItem('seihouse_active_generation');
    if (savedGen) {
      try {
        const parsed = JSON.parse(savedGen);
        if (parsed && parsed.isGenerating && Date.now() - parsed.timestamp < 10 * 60 * 1000) {
          const activeStory = store_stories.find(s => s.id === parsed.activeStoryId);
          if (activeStory) {
            if (parsed.generationPhase === 'chapter' && parsed.generatingChapterNum) {
              store_setDraftRecoverySession(parsed);
            }
          } else {
            localStorage.removeItem('seihouse_active_generation');
          }
        }
      } catch (err) {
        console.error("Failed to restore active generation state:", err);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitializing, store_stories]);

  // Initialize Data Persistence
  useEffect(() => {
    const initAndLoad = async () => {
      try {
        await store_initStorage();
      } finally {
        setIsInitializing(false);
      }
    };
    initAndLoad();

    let unsubProfile: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      store_setCurrentUser(user);
      
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = undefined;
      }
      
      if (user) {
        unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfileType;
            if (user.email && ['amaurylindy@gmail.com', 'seihouseproductions@gmail.com'].includes(user.email.toLowerCase())) {
              data.premiumTier = 'immortal';
              data.role = 'owner';
              if (docSnap.data().premiumTier !== 'immortal' || docSnap.data().role !== 'owner') {
                updateDoc(doc(db, 'users', user.uid), { premiumTier: 'immortal', role: 'owner' }).catch(console.error);
              }
            }
            store_setUserProfile(data);
          } else {
            store_setUserProfile(null);
          }
        });

        // Handle unmigrated demo stories: migrate if worked on, otherwise discard them
        await store_migrateOrDiscardDemoStories(user);
      } else {
        store_setUserProfile(null);
      }
    });

    const unsubSync = storyStorage.subscribe(async (status) => {
      store_setSyncStatus(status);
      if (status === 'synced') {
         // Reload stories from storage to catch cloud-merged data
         const freshStories = await storyStorage.getStories();
         store_setStories(freshStories);
      }
    });

    return () => {
      unsubAuth();
      unsubSync();
      if (unsubProfile) unsubProfile();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamically fetch missing content for active chapter
  useEffect(() => {
    // Narrow dependency to just ID and chapter num to avoid looping on whole stories array
    const activeStory = useAppStore.getState().stories.find(s => s.id === store_activeStoryId);
    if (activeStory && store_selectedChapterNum !== -1) {
      const tgtArc = activeStory.arcs.find(a => a.chapters.some(c => c.number === store_selectedChapterNum));
      const tgtChapter = tgtArc?.chapters.find(c => c.number === store_selectedChapterNum);
      
      if (tgtChapter && !tgtChapter.generatedContent && (!tgtChapter.blocks || tgtChapter.blocks.length === 0) && (tgtChapter.status === 'read' || tgtChapter.status === 'unlocked' || tgtChapter.status === 'generating' || tgtChapter.hasContent)) {
        storyStorage.getChapterContent(activeStory.id, store_selectedChapterNum).then(content => {
          if (content) {
            store_updateChapter(activeStory.id, store_selectedChapterNum, {
              generatedContent: content.generatedContent,
              blocks: content.blocks,
              summary: content.summary,
              statsChangeMessage: content.statsChangeMessage,
              cuePayload: content.cuePayload
            });
          } else {
            // Failed to fetch or missing: un-mark hasContent so user can regenerate
            store_updateChapter(activeStory.id, store_selectedChapterNum, {
              hasContent: false
            });
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store_activeStoryId, store_selectedChapterNum]); // Removed store.stories

  // --- IDLE CULTIVATION ---
  const [idleQiEarned, setIdleQiEarned] = useState<number | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        try {
          localStorage.setItem('seihouse-last-session-end', new Date().toISOString());
        } catch (e) {}
      } else if (document.visibilityState === 'visible') {
        checkIdleQi();
      }
    };
    
    const handleBeforeUnload = () => {
      try {
        localStorage.setItem('seihouse-last-session-end', new Date().toISOString());
      } catch (e) {}
    };

    const checkIdleQi = () => {
      const lastSessionStr = localStorage.getItem('seihouse-last-session-end');
      if (lastSessionStr && idleQiEarned === null) {
        const lastSession = new Date(lastSessionStr).getTime();
        const now = Date.now();
        const diffMs = now - lastSession;
        
        const minTimeMs = 60 * 1000; // 1 minute (for testing/realism combo, scale down from 10 mins)
        const maxTimeMs = 24 * 60 * 60 * 1000; // 24 hours
        
        if (diffMs > minTimeMs) {
           const cappedDiff = Math.min(diffMs, maxTimeMs);
           // Calculate Qi: 1 Qi per 10 minutes -> 6 Qi per hour -> 144 Qi per 24 hours.
           const qiEarned = Math.floor(cappedDiff / (10 * 60 * 1000));
           
           if (qiEarned > 0) {
             setIdleQiEarned(qiEarned);
             localStorage.removeItem('seihouse-last-session-end');
           }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Initial check on load
    if (!isInitializing) {
      checkIdleQi();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isInitializing, idleQiEarned]);
  // ------------------------

  if (isInitializing) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#050505]">
        <div className="animate-pulse text-portal font-mono text-sm tracking-widest uppercase">
          Initializing Celestial Matrices...
        </div>
      </div>
    );
  }

  const activeStory = store_stories.find(s => s.id === store_activeStoryId);

  return (
    <div className="min-h-dvh bg-[#050505] text-[#dfd8cf] font-serif overflow-x-hidden selection:bg-human/30 pb-safe">
      <ParticleSystem />

      <GlobalHeader />

      <main className="relative z-10 w-full min-h-[calc(100dvh-140px)]">
        <AnimatePresence mode="wait">
          {store_currentScreen === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="px-4 py-8 max-w-7xl mx-auto w-full"
            >
              <LibraryScreen />
            </motion.div>
          )}

          {store_currentScreen === 'creator' && (
            <motion.div
              key="creator"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="px-4 py-8 max-w-4xl mx-auto w-full"
            >
              <CreationPortal
                onGenerateBlueprint={storyEngine.handleGenerateBlueprint}
                onStartStory={storyEngine.handleStartStory}
                isGenerating={store_isGenerating}
                error={store_appError}
              />
            </motion.div>
          )}

          {store_currentScreen === 'detail' && activeStory && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <StoryDetailScreen 
                 handleGenerateCover={storyEngine.handleGenerateCover}
                 handleApplyCover={storyEngine.handleApplyCover}
                 handleExportFullTome={storyExporter.handleExportFullTome}
                 handleExportEPUB={storyExporter.handleExportEPUB}
                 handleExportSingleStory={storyExporter.handleExportSingleStory}
                 handleDeleteStory={(id, e) => {
                   e.stopPropagation();
                   store_setStoryToDelete(id);
                 }}
                 setIsCodexSheetOpen={store_setIsCodexSheetOpen}
              />
            </motion.div>
          )}

          {store_currentScreen === 'reader' && activeStory && (
            <motion.div
              key="reader"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
               <ReaderScreen 
                  handleGenerateChapter={storyEngine.handleGenerateChapter}
                  handleToggleRead={storyEngine.handleToggleRead}
                  handleSteerArc={storyEngine.handleSteerArc}
                  handleUpdateStoryDirect={storyEngine.handleUpdateStoryDirect}
                  setIsCodexSheetOpen={store_setIsCodexSheetOpen}
                  handleAlterFate={storyEngine.handleAlterFate}
                  handleSealChapter={storyEngine.handleSealChapter}
                  handleCheckConsistency={storyEngine.handleCheckConsistency}
               />
            </motion.div>
          )}

          {store_currentScreen === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <UserProfile 
                currentUser={store_currentUser}
                stories={store_stories}
                onLogout={() => { signOut(auth); store_setCurrentUser(null); }}
                onNavigateHome={() => store_setCurrentScreen('home')}
              />
            </motion.div>
          )}
          {store_currentScreen === 'pricing' && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="px-4 py-8 w-full"
            >
              <PricingScreen />
            </motion.div>
          )}
          {store_currentScreen === 'challenge' && (
            <motion.div
              key="challenge"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <ChallengeScreen />
            </motion.div>
          )}
          {store_currentScreen === 'sects' && (
            <motion.div
              key="sects"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <SectsScreen />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="relative z-0 border-t border-neutral-950 bg-black/60 pt-10 pb-16 mt-20 text-[10px] text-neutral-600 font-sans">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <p className="tracking-widest uppercase font-sc text-neutral-500 font-semibold">
            SEIHouse: A Better Time Capsule and Translator of Artistic Expression
          </p>
          <p id="footer-production-mark" className="max-w-xl mx-auto tracking-[0.3em] font-sans text-neutral-400 hover:text-portal transition-all duration-500 font-semibold text-[11px] uppercase py-2 select-none">
            ⓈSEN
          </p>
        </div>
      </footer>

      {/* OVERLAYS */}
      <CodexSheetOverlay 
         handleUpdateMemoryManual={storyEngine.handleUpdateMemoryManual}
         handleUpdateStoryDirect={storyEngine.handleUpdateStoryDirect}
      />
      <AILoadingVeil />
      <ModalsAndToasts />
      <KeyboardShortcuts />
      <AtmosphericAudio />
      <IdleCultivationModal qiEarned={idleQiEarned} onClose={() => setIdleQiEarned(null)} />
    </div>
  );
}

export default App;
