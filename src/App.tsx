import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, LOCAL_ONLY_MODE } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Store & Hooks
import { useAppStore } from './store/useAppStore';
import { selectIsGenerating } from './store/useGenerationStore';
import {
  clearGenerationRecoverySnapshot,
  readGenerationRecoverySnapshot,
  shouldPreserveRecoverySnapshotOnAuthResolution,
} from './lib/generationRecovery';
import { useStoryEngine } from './hooks/useStoryEngine';
import { useStoryExporter } from './hooks/useStoryExporter';
import { storyStorage } from './lib/storage';
import type { SyncProgress } from './lib/storage';
import { autoSubmitPreviousWeeksOfferings } from './lib/artifacts';
import {
  formatHarmonySyncProgress,
  getHarmonySyncProgressPercent,
} from './lib/syncProgress';
import {
  mergeChapterContentIntoStories,
  refreshActiveChapterAfterMetadataSync,
} from './lib/syncStoryRefresh';
import {
  isProfileSnapshotStillCurrent,
  isStoryRefreshStillCurrent,
  type StoryRefreshGuardState,
} from './appSessionGuards';
import {
  cacheAccountProfile,
  createAccountProfileFallback,
  withIdentityAvatar,
} from './lib/userProfileCache';
import { retryPendingCultivatorPortraits } from './services/cultivatorPortraitPersistence';
import { ensureAccountSeedForStory } from './lib/storySeedStorage';
import { getUserProfile } from './lib/persistence';
import { isDevBuild } from './lib/env';
import { getDevPreviewStory } from './store/devPreviewStory';

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
import { useIdleCultivation } from './hooks/useIdleCultivation';
import { RankUpCelebration } from './components/RankUpCelebration';

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
    const store_setActiveStoryId = useAppStore(state => state.setActiveStoryId);
    const store_activeStoryId = useAppStore(state => state.activeStoryId);
    const store_selectedChapterNum = useAppStore(state => state.selectedChapterNum);
    const store_setAppError = useAppStore(state => state.setAppError);
    const store_currentScreen = useAppStore(state => state.currentScreen);
    const store_isGenerating = useAppStore(selectIsGenerating);
    const store_appError = useAppStore(state => state.appError);
    const store_setStoryToDelete = useAppStore(state => state.setStoryToDelete);
    const store_setIsCodexSheetOpen = useAppStore(state => state.setIsCodexSheetOpen);
    const store_setIsSettingsOpen = useAppStore(state => state.setIsSettingsOpen);
    const store_setIsShortcutsOpen = useAppStore(state => state.setIsShortcutsOpen);
    const store_currentUser = useAppStore(state => state.currentUser);
    const store_setCurrentScreen = useAppStore(state => state.setCurrentScreen);
    const store_clearActiveRunForAccountTransition = useAppStore(state => state.clearActiveRunForAccountTransition);
    const store_bumpAuthSessionGeneration = useAppStore(state => state.bumpAuthSessionGeneration);
  const storyEngine = useStoryEngine();
  const storyExporter = useStoryExporter();

  const [isInitializing, setIsInitializing] = useState(true);
  // Firebase has answered at least once during this page session. Until it
  // has, a recovery offer cannot be judged: the snapshot's owner is only known
  // to be the current reader after the first resolved authentication state.
  const [hasResolvedAuth, setHasResolvedAuth] = useState(LOCAL_ONLY_MODE);
  const recoveryOfferSettledRef = useRef(false);
  const seedBackfillInFlightRef = useRef(new Set<string>());
  const seedBackfillFailedRef = useRef(new Set<string>());
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    phase: 'initializing',
    completed: 0,
    total: 0,
  });

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

  // Check for an unsaved chapter session once storage and authentication have
  // both settled. The snapshot is written once, by the run that owned it, and
  // removed by that same run or by an account transition — nothing rewrites it
  // from live state, so it still names the story and chapter that run was
  // working on. Waiting for authentication is what keeps the offer honest: the
  // snapshot survives the first resolution only for the account that wrote it.
  useEffect(() => {
    if (isInitializing || !hasResolvedAuth || recoveryOfferSettledRef.current) return;

    const snapshot = readGenerationRecoverySnapshot();
    if (!snapshot) {
      recoveryOfferSettledRef.current = true;
      return;
    }

    // If we are actively generating right now, don't trigger recovery
    if (selectIsGenerating(useAppStore.getState())) {
      recoveryOfferSettledRef.current = true;
      return;
    }
    if (Date.now() - snapshot.timestamp >= 10 * 60 * 1000) {
      clearGenerationRecoverySnapshot();
      recoveryOfferSettledRef.current = true;
      return;
    }

    const savedStory = store_stories.find(s => s.id === snapshot.storyId);
    if (!savedStory) {
      // The library republishes asynchronously after an account is resolved.
      // Wait for it rather than discarding a valid draft against an empty one.
      if (store_stories.length === 0) return;
      clearGenerationRecoverySnapshot();
      recoveryOfferSettledRef.current = true;
      return;
    }

    recoveryOfferSettledRef.current = true;
    const batch = savedStory.chapterGenerationBatch;
    if (batch && (batch.status === 'queued' || batch.status === 'generating' || batch.status === 'paused')) {
      // Batch recovery is driven by its persisted checkpoint, never the
      // single-chapter recovery modal.
      clearGenerationRecoverySnapshot();
      return;
    }
    store_setDraftRecoverySession({
      storyId: snapshot.storyId,
      chapterNumber: snapshot.chapterNumber,
    });
  }, [isInitializing, hasResolvedAuth, store_stories, store_setDraftRecoverySession]);

  // A browser reload cannot keep a model request alive. Convert any persisted
  // in-flight batch to an explicit paused state so the user can safely resume
  // only the chapters that were not already committed.
  useEffect(() => {
    if (isInitializing) return;
    const state = useAppStore.getState();
    const pausedStories = state.stories.map(story => {
      const batch = story.chapterGenerationBatch;
      if (!batch || (batch.status !== 'queued' && batch.status !== 'generating')) return story;
      return {
        ...story,
        chapterGenerationBatch: {
          ...batch,
          status: 'paused' as const,
          currentChapterNumber: null,
          error: 'Generation was paused because the browser session ended.',
        },
      };
    });
    if (pausedStories.some((story, index) => story !== state.stories[index])) {
      state.saveStories(pausedStories).catch(error => console.error('Failed to pause interrupted chapter batch:', error));
    }
  }, [isInitializing]);

  // Preserve legacy embedded seeds as independent account objects. The
  // deterministic seed IDs make this safe to retry if saving the story
  // reference is interrupted after the seed write succeeds.
  useEffect(() => {
    if (isInitializing || LOCAL_ONLY_MODE || !store_currentUser) return;
    const expectedUid = store_currentUser.uid;
    const candidates = store_stories.filter(story =>
      story.userId === expectedUid
      && !story.deleted
      && !story.sourceSeedId
      && story.intake
      && story.blueprint
      && !seedBackfillInFlightRef.current.has(story.id)
      && !seedBackfillFailedRef.current.has(story.id),
    );
    if (candidates.length === 0) return;

    candidates.forEach(story => seedBackfillInFlightRef.current.add(story.id));
    void Promise.allSettled(candidates.map(async story => ({
      storyId: story.id,
      seed: await ensureAccountSeedForStory(story),
    }))).then(async results => {
      if (
        auth.currentUser?.uid !== expectedUid
        || useAppStore.getState().currentUser?.uid !== expectedUid
      ) return;

      const migrated = new Map<string, string>();
      let failed = false;
      results.forEach((result, index) => {
        const storyId = candidates[index].id;
        if (result.status === 'fulfilled') {
          migrated.set(storyId, result.value.seed.id);
        } else {
          failed = true;
          seedBackfillFailedRef.current.add(storyId);
          console.error(`Failed to preserve an embedded story seed for story ${storyId}:`, result.reason);
        }
      });

      if (migrated.size > 0) {
        const latestState = useAppStore.getState();
        const updatedStories = latestState.stories.map(story => {
          const sourceSeedId = migrated.get(story.id);
          return sourceSeedId && !story.sourceSeedId ? { ...story, sourceSeedId } : story;
        });
        if (updatedStories.some((story, index) => story !== latestState.stories[index])) {
          await latestState.saveStories(updatedStories);
        }
      }
      if (failed) {
        useAppStore.getState().setAppError(
          'Some legacy story seeds are still stored inside their stories and are not in your account seed index yet. No story data was changed.',
        );
      }
    }).catch(error => {
      candidates.forEach(story => seedBackfillFailedRef.current.add(story.id));
      console.error('Failed to backfill account story seeds:', error);
      if (
        auth.currentUser?.uid === expectedUid
        && useAppStore.getState().currentUser?.uid === expectedUid
      ) {
        useAppStore.getState().setAppError(
          'Some legacy story seeds are still stored inside their stories and are not in your account seed index yet. No story data was changed.',
        );
      }
    }).finally(() => {
      candidates.forEach(story => seedBackfillInFlightRef.current.delete(story.id));
    });
  }, [isInitializing, store_currentUser, store_stories]);

  // Initialize Data Persistence
  useEffect(() => {
    const unsubProgress = storyStorage.subscribeToSyncProgress(setSyncProgress);
    const initAndLoad = async () => {
      try {
        await store_initStorage();
      } finally {
        setIsInitializing(false);
      }
    };
    initAndLoad();

    let profileSubscriptionVersion = 0;

    // A reload and a real account transition are not the same event. The first
    // resolved authentication state of a page session may legitimately inherit
    // the draft this same reader left behind; every later one is a transition
    // and must not let one account claim another's draft.
    let hasResolvedAuthOnce = false;

    let unsubAuth = () => {};
    if (LOCAL_ONLY_MODE) {
      store_setCurrentUser(null);
      store_setUserProfile(null);
    } else {
      unsubAuth = onAuthStateChanged(auth, async (user) => {
        const subscriptionVersion = ++profileSubscriptionVersion;
        const isFirstAuthResolution = !hasResolvedAuthOnce;
        hasResolvedAuthOnce = true;

        const snapshot = readGenerationRecoverySnapshot();
        if (snapshot && !shouldPreserveRecoverySnapshotOnAuthResolution({
          snapshot,
          isFirstAuthResolution,
          resolvedUserId: user?.uid ?? null,
        })) {
          clearGenerationRecoverySnapshot();
        }
        // Every resolution — including the first — invalidates whatever run is
        // in memory. Signing back in as the same uid still produces a new
        // generation number, so the previous session's run can never resume
        // writing into this one.
        store_bumpAuthSessionGeneration();
        store_clearActiveRunForAccountTransition();
        // Local persistence survives authentication changes. Clear the rendered
        // library and reader selection immediately so one account's stories can
        // never remain visible while the next account's scope is being restored.
        store_setUserProfile(null);
        store_setStories([]);
        store_setActiveStoryId(null);
        store_setDraftRecoverySession(null);
        store_setStoryToDelete(null);
        store_setAppError(null);
        store_setIsSettingsOpen(false);
        store_setIsShortcutsOpen(false);
        store_setIsCodexSheetOpen(false);
        store_setCurrentScreen('home');
        useAppStore.getState().setActiveConflict(null);
        store_setCurrentUser(user);
        setHasResolvedAuth(true);

        if (user) {
          const expectedUid = user.uid;
          const snapshotIsCurrent = () => isProfileSnapshotStillCurrent({
            expectedUid,
            expectedVersion: subscriptionVersion,
            currentVersion: profileSubscriptionVersion,
            authenticatedUid: auth.currentUser?.uid ?? null,
            renderedUid: useAppStore.getState().currentUser?.uid ?? null,
          });

          void getUserProfile(expectedUid)
            .then((storedProfile) => {
              if (!snapshotIsCurrent()) return;
              if (storedProfile) {
                // Role and tier come from the server, which assigns OWNER from
                // the verified ID-token email. Promoting the account here only
                // unlocked UI whose every request PostgreSQL then rejected.
                // PostgreSQL has no identity-avatar column — Firebase
                // Authentication still owns it — so the profile read always
                // answers with an empty avatarUrl. Merge the account photo
                // back instead of blanking the one sign-in just rendered.
                const data = withIdentityAvatar(
                  { ...storedProfile, uid: expectedUid },
                  user,
                );
                cacheAccountProfile(data);
                store_setUserProfile(data);
                void retryPendingCultivatorPortraits(expectedUid)
                  .then(async (recovered) => {
                    if (recovered < 1 || !snapshotIsCurrent()) return;
                    const recoveredProfile = await getUserProfile(expectedUid);
                    if (!recoveredProfile || !snapshotIsCurrent()) return;
                    const recoveredData = withIdentityAvatar(
                      { ...recoveredProfile, uid: expectedUid },
                      user,
                    );
                    cacheAccountProfile(recoveredData);
                    store_setUserProfile(recoveredData);
                  })
                  .catch((error) => {
                    if (!snapshotIsCurrent()) return;
                    console.warn('Pending portrait recovery is temporarily unavailable:', error);
                  });
              } else {
                store_setUserProfile(createAccountProfileFallback(user));
              }
            })
            .catch((error) => {
              if (!snapshotIsCurrent()) return;
              console.error('Failed to load the active user profile:', error);
              store_setUserProfile(createAccountProfileFallback(user));
            });

        } else {
          store_setUserProfile(null);
        }
      });
    }

    let syncRefreshVersion = 0;
    let syncSubscriberDisposed = false;

    // Republish the library from local storage. Harmony calls this twice per
    // pass: once the moment the catalog is level with PostgreSQL (so the real
    // cards render immediately) and again when the pass reaches a terminal
    // status. Both share the same account/selection guards, so a late refresh
    // can never publish a previous account's library or clobber a newer store.
    const refreshLibraryFromStorage = async () => {
      const refreshVersion = ++syncRefreshVersion;
      const refreshUserId = auth.currentUser?.uid ?? null;
      const refreshStartState = useAppStore.getState();
      const refreshSourceState: StoryRefreshGuardState = {
        stories: refreshStartState.stories,
        activeStoryId: refreshStartState.activeStoryId,
        selectedChapterNum: refreshStartState.selectedChapterNum,
      };
      try {
        // Reload after every completed/partial pass so a failed upload cannot hide
        // unrelated stories that were successfully pulled from the cloud. Story
        // metadata is stored separately from chapter bodies, so preserve hydrated
        // reader content and explicitly refresh the active chapter before publishing
        // the new store state.
        const freshStories = await storyStorage.getStories();
        const refreshed = await refreshActiveChapterAfterMetadataSync({
          freshStories,
          currentStories: refreshSourceState.stories,
          activeStoryId: refreshSourceState.activeStoryId,
          selectedChapterNumber: refreshSourceState.selectedChapterNum,
          loadChapter: (storyId, chapterNumber) =>
            storyStorage.getChapterContent(storyId, chapterNumber),
        });

        const latestState = useAppStore.getState();

        if (
          syncSubscriberDisposed ||
          refreshVersion !== syncRefreshVersion ||
          (auth.currentUser?.uid ?? null) !== refreshUserId ||
          !isStoryRefreshStillCurrent(refreshSourceState, latestState)
        ) return;
        store_setStories(refreshed.stories);

        // Auth may resolve after local storage initialization. Run the legacy
        // demo migration only after the correct account-scoped library is loaded.
        if (auth.currentUser && auth.currentUser.uid === refreshUserId) {
          void store_migrateOrDiscardDemoStories(auth.currentUser).catch((error) => {
            console.error('Failed to migrate legacy demo stories after Harmony sync:', error);
          });
        }

        const activeSelectionStillMatches =
          latestState.activeStoryId === refreshSourceState.activeStoryId &&
          latestState.selectedChapterNum === refreshSourceState.selectedChapterNum;
        if (activeSelectionStillMatches && refreshed.unavailable) {
          const storyTitle = refreshed.stories.find(
            story => story.id === refreshSourceState.activeStoryId,
          )?.title || 'the active story';
          store_setAppError(
            `Harmony refreshed ${storyTitle}, but Chapter ${refreshSourceState.selectedChapterNum} is marked as generated and its content is currently unavailable from local or cloud storage. No chapter metadata was changed; sync will retry automatically.`,
          );
        } else if (activeSelectionStillMatches && refreshed.loadFailed) {
          store_setAppError(
            `Harmony refreshed the library, but could not refresh Chapter ${refreshSourceState.selectedChapterNum}. Its saved chapter metadata was left unchanged and sync will retry automatically.`,
          );
        }
      } catch (error) {
        if (
          syncSubscriberDisposed ||
          refreshVersion !== syncRefreshVersion ||
          (auth.currentUser?.uid ?? null) !== refreshUserId
        ) return;
        console.error('Failed to refresh stories after Harmony sync:', error);
        store_setAppError(
          'Harmony could not load the refreshed library on this device. Your saved data was left unchanged and sync will retry automatically.',
        );
      }
    };

    // The catalog is level with PostgreSQL long before Harmony finishes sealing
    // chapter bodies and draining the outbox. Render the library then, rather
    // than holding every card back until the whole pass reaches a terminal
    // status.
    const unsubCatalog = storyStorage.subscribeToCatalogUpdates(() => {
      void refreshLibraryFromStorage();
    });

    const unsubSync = storyStorage.subscribe((status) => {
      store_setSyncStatus(status);
      if (status === 'synced' || status === 'error') {
        void refreshLibraryFromStorage();
      }
    });

    return () => {
      syncSubscriberDisposed = true;
      syncRefreshVersion += 1;
      profileSubscriptionVersion += 1;
      unsubAuth();
      unsubSync();
      unsubCatalog();
      unsubProgress();
    };
    // Note: These Zustand store actions are guaranteed stable.
  }, [
    store_initStorage,
    store_migrateOrDiscardDemoStories,
    store_setCurrentUser,
    store_setStories,
    store_setSyncStatus,
    store_setUserProfile
  ]);

  // Development previews need one readable story to exercise the real
  // Library -> detail -> Reader Chamber path. Keep it in memory, only for an
  // unauthenticated dev/preview build, so it cannot enter production persistence.
  useEffect(() => {
    if (
      isInitializing
      || !isDevBuild()
      || store_currentUser
      || auth.currentUser
      || store_stories.length > 0
    ) return;
    store_setStories([getDevPreviewStory()]);
  }, [isInitializing, store_currentUser, store_stories.length, store_setStories]);

  // Dynamically fetch missing content for active chapter
  useEffect(() => {
    let cancelled = false;
    // Narrow dependency to just ID and chapter num to avoid looping on whole stories array
    const activeStory = useAppStore.getState().stories.find(s => s.id === store_activeStoryId);
    if (activeStory && store_selectedChapterNum !== -1) {
      const tgtArc = activeStory.arcs.find(a => a.chapters.some(c => c.number === store_selectedChapterNum));
      const tgtChapter = tgtArc?.chapters.find(c => c.number === store_selectedChapterNum);
      
      if (tgtChapter && !tgtChapter.generatedContent && (!tgtChapter.blocks || tgtChapter.blocks.length === 0) && (tgtChapter.status === 'read' || tgtChapter.status === 'unlocked' || tgtChapter.status === 'generating' || tgtChapter.hasContent)) {
        storyStorage.getChapterContent(activeStory.id, store_selectedChapterNum)
          .then(content => {
            if (cancelled) return;
            const hasRenderableContent = Boolean(
              content?.generatedContent || (content?.blocks && content.blocks.length > 0),
            );
            if (content && hasRenderableContent) {
              store_setStories(mergeChapterContentIntoStories(
                useAppStore.getState().stories,
                activeStory.id,
                store_selectedChapterNum,
                content,
              ));
            } else if (tgtChapter.hasContent) {
              store_setAppError(
                `Chapter ${store_selectedChapterNum} is marked as generated, but its content is currently unavailable from local or cloud storage. No chapter metadata was changed; Harmony will retry automatically.`,
              );
            }
          })
          .catch(error => {
            if (cancelled) return;
            console.error("Failed to load chapter content due to error (e.g. quota exceeded):", error);
            store_setAppError(
              `Chapter ${store_selectedChapterNum} could not be loaded right now. Its saved chapter metadata was left unchanged and Harmony will retry automatically.`,
            );
          });
      }
    }
    return () => {
      cancelled = true;
    };
  }, [store_activeStoryId, store_selectedChapterNum, store_setAppError, store_setStories]); // Removed store.stories

  // --- IDLE CULTIVATION ---
  const {
    idleQiEarned,
    daysCultivating,
    claimIdleQi,
    closeIdleQi,
  } = useIdleCultivation(isInitializing);

  useEffect(() => {
    if (!isInitializing) {
      autoSubmitPreviousWeeksOfferings().catch(console.error);
    }
  }, [isInitializing]);
  // ------------------------

  if (isInitializing) {
    const progressPercent = getHarmonySyncProgressPercent(syncProgress);
    return (
      <div className="flex h-dvh items-center justify-center bg-[#050505]">
        <div className="w-72 text-center font-mono uppercase" role="status" aria-live="polite" aria-atomic="true">
          <div className="animate-pulse text-sm tracking-widest text-portal">
            {formatHarmonySyncProgress(syncProgress)}
          </div>
          {progressPercent !== null && (
            <div className="mt-4 h-px overflow-hidden bg-portal/20" aria-hidden="true">
              <div
                className="h-full bg-portal transition-[width] duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  const activeStory = store_stories.find(s => s.id === store_activeStoryId);

  return (
    <div className="min-h-dvh bg-[#050505] text-[#dfd8cf] font-serif overflow-x-hidden selection:bg-human/30 pb-safe">
      <ParticleSystem />
      <RankUpCelebration />

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
                 handleSelectCover={storyEngine.handleSelectCover}
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
                  handleGenerateNextFiveChapters={storyEngine.handleGenerateNextFiveChapters}
                  handleToggleRead={storyEngine.handleToggleRead}
                  handleSteerArc={storyEngine.handleSteerArc}
                  updateStoryFields={storyEngine.updateStoryFields}
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
                key={store_currentUser?.uid ?? 'guest'}
                currentUser={store_currentUser}
                stories={store_stories}
                onLogout={() => { void signOut(auth); }}
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
         updateStoryFields={storyEngine.updateStoryFields}
      />
      <AILoadingVeil />
      <ModalsAndToasts />
      <KeyboardShortcuts />
      <AtmosphericAudio />
      <IdleCultivationModal
        qiEarned={idleQiEarned}
        onClose={closeIdleQi}
        onClaim={claimIdleQi}
        daysCultivating={daysCultivating}
      />
    </div>
  );
}

export default App;
