import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

// Store & Hooks
import { useAppStore } from './store/useAppStore';
import { useStoryEngine } from './hooks/useStoryEngine';
import { useStoryExporter } from './hooks/useStoryExporter';
import { storyStorage } from './lib/storage';

// Types
import { Story, IntakeData, WorldBlueprint, UserProfile as UserProfileType } from './types';

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
  const store = useAppStore();
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
        localStorage.setItem('seihouse_active_generation', JSON.stringify(activeGen));
      } else {
        localStorage.removeItem('seihouse_active_generation');
      }
    });
    return () => unsubscribe();
  }, []);

  // Check for unsaved chapter session after initialization
  useEffect(() => {
    if (isInitializing) return;

    const savedGen = localStorage.getItem('seihouse_active_generation');
    if (savedGen) {
      try {
        const parsed = JSON.parse(savedGen);
        if (parsed && parsed.isGenerating && Date.now() - parsed.timestamp < 10 * 60 * 1000) {
          const activeStory = store.stories.find(s => s.id === parsed.activeStoryId);
          if (activeStory) {
            if (parsed.generationPhase === 'chapter' && parsed.generatingChapterNum) {
              store.setDraftRecoverySession(parsed);
            }
          } else {
            localStorage.removeItem('seihouse_active_generation');
          }
        }
      } catch (err) {
        console.error("Failed to restore active generation state:", err);
      }
    }
  }, [isInitializing, store.stories]);

  // Initialize Data Persistence
  useEffect(() => {
    const initAndLoad = async () => {
      try {
        await store.initStorage();
      } finally {
        setIsInitializing(false);
      }
    };
    initAndLoad();

    let unsubProfile: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      store.setCurrentUser(user);
      
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = undefined;
      }
      
      if (user) {
        unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            store.setUserProfile(docSnap.data() as UserProfileType);
          } else {
            store.setUserProfile(null);
          }
        });

        // Handle unmigrated demo stories: migrate if worked on, otherwise discard them
        await store.migrateOrDiscardDemoStories(user);
      } else {
        store.setUserProfile(null);
      }
    });

    const unsubSync = storyStorage.subscribe(async (status) => {
      store.setSyncStatus(status);
      if (status === 'synced') {
         // Reload stories from storage to catch cloud-merged data
         const freshStories = await storyStorage.getStories();
         store.setStories(freshStories);
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
    const activeStory = useAppStore.getState().stories.find(s => s.id === store.activeStoryId);
    if (activeStory && store.selectedChapterNum !== -1) {
      const tgtArc = activeStory.arcs.find(a => a.chapters.some(c => c.number === store.selectedChapterNum));
      const tgtChapter = tgtArc?.chapters.find(c => c.number === store.selectedChapterNum);
      
      if (tgtChapter && !tgtChapter.generatedContent && (!tgtChapter.blocks || tgtChapter.blocks.length === 0) && (tgtChapter.status === 'read' || tgtChapter.status === 'unlocked' || tgtChapter.status === 'generating' || tgtChapter.hasContent)) {
        storyStorage.getChapterContent(activeStory.id, store.selectedChapterNum).then(content => {
          if (content) {
            store.updateChapter(activeStory.id, store.selectedChapterNum, {
              generatedContent: content.generatedContent,
              blocks: content.blocks,
              summary: content.summary,
              statsChangeMessage: content.statsChangeMessage,
              cuePayload: content.cuePayload
            });
          } else {
            // Failed to fetch or missing: un-mark hasContent so user can regenerate
            store.updateChapter(activeStory.id, store.selectedChapterNum, {
              hasContent: false
            });
          }
        });
      }
    }
  }, [store.activeStoryId, store.selectedChapterNum]); // Removed store.stories

  // --- IDLE CULTIVATION ---
  const [idleQiEarned, setIdleQiEarned] = useState<number | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        localStorage.setItem('seihouse-last-session-end', new Date().toISOString());
      } else if (document.visibilityState === 'visible') {
        checkIdleQi();
      }
    };
    
    const handleBeforeUnload = () => {
      localStorage.setItem('seihouse-last-session-end', new Date().toISOString());
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

  const activeStory = store.stories.find(s => s.id === store.activeStoryId);

  return (
    <div className="min-h-dvh bg-[#050505] text-[#dfd8cf] font-serif overflow-x-hidden selection:bg-human/30 pb-safe">
      <ParticleSystem />

      <GlobalHeader />

      <main className="relative z-10 w-full min-h-[calc(100dvh-140px)]">
        <AnimatePresence mode="wait">
          {store.currentScreen === 'home' && (
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

          {store.currentScreen === 'creator' && (
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
                isGenerating={store.isGenerating}
                error={store.appError}
              />
            </motion.div>
          )}

          {store.currentScreen === 'detail' && activeStory && (
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
                   store.setStoryToDelete(id);
                 }}
                 setIsCodexSheetOpen={store.setIsCodexSheetOpen}
              />
            </motion.div>
          )}

          {store.currentScreen === 'reader' && activeStory && (
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
                  setIsCodexSheetOpen={store.setIsCodexSheetOpen}
                  handleAlterFate={storyEngine.handleAlterFate}
                  handleSealChapter={storyEngine.handleSealChapter}
                  handleCheckConsistency={storyEngine.handleCheckConsistency}
               />
            </motion.div>
          )}

          {store.currentScreen === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <UserProfile 
                currentUser={store.currentUser}
                stories={store.stories}
                onLogout={() => { signOut(auth); store.setCurrentUser(null); }}
                onNavigateHome={() => store.setCurrentScreen('home')}
              />
            </motion.div>
          )}
          {store.currentScreen === 'pricing' && (
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
          {store.currentScreen === 'challenge' && (
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
          {store.currentScreen === 'sects' && (
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
            Ⓢ SEIHOUSE PRODUCTIONS
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
