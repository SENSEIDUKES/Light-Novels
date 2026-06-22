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
import { Story, IntakeData, WorldBlueprint } from './types';

// Top-Level Layout Components
import { GlobalHeader } from './components/GlobalHeader';
import { LibraryScreen } from './components/LibraryScreen';
import { StoryDetailScreen } from './components/StoryDetailScreen';
import { ReaderScreen } from './components/ReaderScreen';
import { ModalsAndToasts } from './components/ModalsAndToasts';
import { CodexSheetOverlay } from './components/CodexSheetOverlay';

// Global FX & Audio
import { AtmosphericAudio } from './components/AtmosphericAudio';
import { ParticleSystem } from './components/ParticleSystem';
import CreationPortal from './components/CreationPortal';
import { AILoadingVeil } from './components/AILoadingVeil';
import UserProfile from './components/UserProfile';

function App() {
  const store = useAppStore();
  const storyEngine = useStoryEngine();
  const storyExporter = useStoryExporter();

  const [isInitializing, setIsInitializing] = useState(true);

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
            store.setUserProfile(docSnap.data() as any);
          } else {
            store.setUserProfile(null);
          }
        });

        // Migrate demo-matrix-1 to avoid multi-tenant database write conflicts
        const latestStories = [...useAppStore.getState().stories];
        const hasDemoMatrix1 = latestStories.some(s => s.id === 'demo-matrix-1');
        if (hasDemoMatrix1) {
          const userDemoId = `demo-matrix-${user.uid}`;
          const updatedStories = latestStories.map(s => {
            if (s.id === 'demo-matrix-1') {
              return { ...s, id: userDemoId };
            }
            return s;
          });
          
          if (useAppStore.getState().activeStoryId === 'demo-matrix-1') {
            useAppStore.getState().setActiveStoryId(userDemoId);
          }
          await useAppStore.getState().saveStories(updatedStories);
        }
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
    const activeStory = store.stories.find(s => s.id === store.activeStoryId);
    if (activeStory && store.selectedChapterNum !== -1) {
      const tgtArc = activeStory.arcs.find(a => a.chapters.some(c => c.number === store.selectedChapterNum));
      const tgtChapter = tgtArc?.chapters.find(c => c.number === store.selectedChapterNum);
      
      if (tgtChapter && !tgtChapter.generatedContent && (tgtChapter.status === 'read' || tgtChapter.status === 'unlocked' || tgtChapter.status === 'generating')) {
        storyStorage.getChapterContent(activeStory.id, store.selectedChapterNum).then(content => {
          if (content) {
            const freshStories = [...store.stories];
            const updated = freshStories.map(s => {
              if (s.id === activeStory.id) {
                return {
                  ...s,
                  arcs: s.arcs.map(a => ({
                    ...a,
                    chapters: a.chapters.map(c => {
                      if (c.number === store.selectedChapterNum) {
                        return {
                          ...c,
                          generatedContent: content.generatedContent,
                          blocks: content.blocks,
                          summary: content.summary,
                          statsChangeMessage: content.statsChangeMessage,
                          cuePayload: content.cuePayload
                        };
                      }
                      return c;
                    })
                  }))
                };
              }
              return s;
            });
            store.setStories(updated);
          }
        });
      }
    }
  }, [store.activeStoryId, store.selectedChapterNum, store.stories]); // Only run when changing chapter

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
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-neutral-950 bg-black/60 pt-10 pb-16 mt-20 text-[10px] text-neutral-600 font-sans">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <p className="tracking-widest uppercase font-sc text-neutral-500 font-semibold">
            SEIHouse: A Better Time Capsule and Translator of Artistic Expression
          </p>
          <p className="max-w-xl mx-auto italic leading-normal font-light">
            This private fiction engine operates server-side, securing your compiled chapter script files and character memory nodes locally in browser cache space. Keep true to your creative spark, and let the matrix tell your story.
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
      <AtmosphericAudio />
    </div>
  );
}

export default App;
