import { useEffect, useRef } from 'react';
import {
  createSceneMixEngine,
  createAudioSpriteEngine,
  type SceneMixEngine,
  type AudioSpriteEngine,
  type AudioSpriteInstanceId,
} from '@seihouse/audio-player';
import { SceneScoreEngine, TRACK_LIBRARY } from '../../lib/audio/musicResolver';
import { normalizeAutoCue } from '../../lib/audio/autoCuePolicy';
import {
  MUSIC_LEVEL_CAP,
  effectiveChannelVolume,
  getAudioMixSettings,
} from '../../lib/audio/audioMixSettings';
import { ensureProceduralAudioPack } from '../../lib/audio/proceduralAudioPack';
import { useAudioMix } from './useAudioMix';
import { useAppStore } from '../../store/useAppStore';
import { vibrate } from '../../lib/vibration';

type AtmosphereType = 'none' | 'wind' | 'rain' | 'ocean' | 'crowd' | 'combat';

/** Haptic pattern for each one-shot cue, matching the old trigger functions. */
const CUE_VIBRATIONS: Record<string, Parameters<typeof vibrate>[0]> = {
  system_alert: 'softTap',
  breakthrough: 'surge',
  artifact_activation: 'chime',
  beast_reveal: 'heavyTap',
  fate_shift: 'shift',
  major_impact: 'combatHit',
};

/**
 * The reader's audio conductor. Every layer plays through the SEIHouse Audio
 * Player (SAP):
 *
 *  - Scene-score music → SAP `SceneMixEngine` (two-deck equal-power fades).
 *  - Atmosphere beds (rain, wind, …) and one-shot story cues → SAP
 *    `AudioSpriteEngine` instances playing the procedurally rendered sprite
 *    pack. One engine per channel so each keeps its own volume/mute.
 *
 * User levels come from the central audio mix (Master / Music / Atmosphere /
 * Audio Cues). This hook only decides *what* plays; SAP owns *how*.
 */
export function useAtmosphericAudio() {
  const currentScreen = useAppStore(state => state.currentScreen);
  const { mix } = useAudioMix();

  // Which bed is playing is narrative-driven state, not a user setting: cues
  // pick rain/wind/… from chapter metadata. Persisted so a reload resumes
  // the same bed.
  const atmosphereRef = useRef<AtmosphereType>(
    typeof localStorage !== 'undefined'
      ? ((localStorage.getItem('seihouse-audio-atmosphere') as AtmosphereType) || 'none')
      : 'none',
  );

  const bgmTrackIdRef = useRef<string>(
    (() => {
      if (typeof localStorage === 'undefined') return 'auto';
      const saved = localStorage.getItem('seihouse-bgm-track') || 'auto';
      // A stale id (e.g. a track later removed from the library) falls back
      // to auto so the narrative cues aren't gated off by a dead pin.
      return saved === 'auto' || TRACK_LIBRARY.some(t => t.id === saved) ? saved : 'auto';
    })(),
  );

  // BGM: the SAP scene-mix engine owns the decks and the equal-power
  // crossfades; this hook only tells it what to play.
  const sceneMixRef = useRef<SceneMixEngine | null>(null);
  const scoreEngineRef = useRef(new SceneScoreEngine());
  const bgmIntensityRef = useRef<number>(1.0);
  const lastChapterCueIdRef = useRef<string | null>(null);
  // Current chapter's environment/theme tags, kept so switching the score
  // back to 'auto' can restore the chapter-appropriate bed.
  const chapterTagsRef = useRef<string[]>([]);

  // Atmosphere + cue playback: SAP sprite engines over the rendered pack.
  const atmoEngineRef = useRef<AudioSpriteEngine | null>(null);
  const cueEngineRef = useRef<AudioSpriteEngine | null>(null);
  const atmoLoopRef = useRef<{ id: AudioSpriteInstanceId; clip: AtmosphereType } | null>(null);
  const combatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Monotonic token so overlapping syncAtmosphere calls (pack still loading)
  // can't each start a bed — only the newest call proceeds after its await.
  const atmoSyncTokenRef = useRef(0);

  const currentScreenRef = useRef(currentScreen);
  useEffect(() => { currentScreenRef.current = currentScreen; }, [currentScreen]);

  const musicLevel = () =>
    effectiveChannelVolume('music') * MUSIC_LEVEL_CAP * bgmIntensityRef.current;

  const musicAllowed = () =>
    currentScreenRef.current === 'reader' && effectiveChannelVolume('music') > 0;

  const cuesAllowed = () =>
    currentScreenRef.current === 'reader' && effectiveChannelVolume('cues') > 0;

  const syncBgmVolumes = () => {
    const engine = sceneMixRef.current;
    if (!engine) return;
    const muted = !musicAllowed();
    engine.setMuted(muted);
    engine.setLevel(muted ? 0 : musicLevel());
  };

  const ensureSpriteEngine = async (
    ref: React.MutableRefObject<AudioSpriteEngine | null>,
  ): Promise<AudioSpriteEngine | null> => {
    try {
      if (!ref.current) {
        ref.current = createAudioSpriteEngine();
        const manifest = await ensureProceduralAudioPack();
        await ref.current.load(manifest);
      } else {
        await ref.current.ready();
      }
      return ref.current;
    } catch (err) {
      console.warn('SAP sprite pack unavailable (audio disabled):', err);
      return null;
    }
  };

  const stopAtmosphereLoop = () => {
    if (combatIntervalRef.current) {
      clearInterval(combatIntervalRef.current);
      combatIntervalRef.current = null;
    }
    if (atmoLoopRef.current && atmoEngineRef.current) {
      atmoEngineRef.current.fadeOut(atmoLoopRef.current.id, 400);
    }
    atmoLoopRef.current = null;
  };

  /**
   * Reconcile the atmosphere layer with the selected bed and the current mix.
   * Level changes retarget the running loop; bed changes crossfade via the
   * sprite engine; muted/off states release everything.
   */
  const syncAtmosphere = async () => {
    const token = ++atmoSyncTokenRef.current;
    const atmosphere = atmosphereRef.current;
    const level = effectiveChannelVolume('atmosphere');
    const audible = currentScreenRef.current === 'reader' && atmosphere !== 'none' && level > 0;

    if (!audible) {
      stopAtmosphereLoop();
      return;
    }

    const engine = await ensureSpriteEngine(atmoEngineRef);
    if (!engine) return;

    // Re-check after the async load — a newer sync call, a bed change or a
    // mix change may have superseded this one.
    if (token !== atmoSyncTokenRef.current
      || atmosphereRef.current !== atmosphere
      || effectiveChannelVolume('atmosphere') <= 0
      || currentScreenRef.current !== 'reader') return;

    engine.setMasterVolume(level);

    if (atmoLoopRef.current?.clip !== atmosphere) {
      stopAtmosphereLoop();
      const id = engine.play(atmosphere, { loop: true });
      atmoLoopRef.current = id ? { id, clip: atmosphere } : null;

      // Combat keeps its randomized percussion hits on top of the bed.
      if (atmosphere === 'combat' && atmoLoopRef.current) {
        combatIntervalRef.current = setInterval(() => {
          if (Math.random() > 0.6) {
            atmoEngineRef.current?.play('major_impact');
          }
        }, 2500);
      }
    }
  };

  const setAtmosphere = (next: AtmosphereType) => {
    if (atmosphereRef.current === next) return;
    atmosphereRef.current = next;
    try {
      localStorage.setItem('seihouse-audio-atmosphere', next);
    } catch {}
    window.dispatchEvent(new CustomEvent('seihouse-audio-state', {
      detail: { atmosphere: next, bgmTrackId: bgmTrackIdRef.current },
    }));
    void syncAtmosphere();
  };

  const playCue = async (fxType: string) => {
    if (!cuesAllowed()) return;
    const pattern = CUE_VIBRATIONS[fxType];
    if (pattern) vibrate(pattern);
    const engine = await ensureSpriteEngine(cueEngineRef);
    if (!engine || !cuesAllowed()) return;
    engine.setMasterVolume(effectiveChannelVolume('cues'));
    engine.play(fxType);
  };

  // Engine lifecycle: one scene mix + (lazily) two sprite engines per mount.
  useEffect(() => {
    if (!sceneMixRef.current) {
      const engine = createSceneMixEngine({ loop: true });
      // Apply the saved level/mute state before anything can play, so the
      // first crossfade never bursts in at the engine's default level.
      const muted = !musicAllowed();
      engine.setMuted(muted);
      engine.setLevel(muted ? 0 : musicLevel());
      sceneMixRef.current = engine;

      // Restore a persisted pin after reload: the cue paths are gated off
      // while a track is pinned, so without this the scene stays silent
      // until the user touches the score picker again.
      if (bgmTrackIdRef.current !== 'auto') {
        const savedTrack = TRACK_LIBRARY.find(t => t.id === bgmTrackIdRef.current);
        if (savedTrack && savedTrack.url) {
          engine.crossfadeTo({
            id: savedTrack.id,
            title: savedTrack.id,
            artist: 'SEIHouse',
            audioFile: savedTrack.url,
          });
        }
      }
    }
    return () => {
      sceneMixRef.current?.dispose();
      sceneMixRef.current = null;
      stopAtmosphereLoop();
      atmoEngineRef.current?.dispose();
      atmoEngineRef.current = null;
      cueEngineRef.current?.dispose();
      cueEngineRef.current = null;
    };
  }, []);

  // Re-level every SAP layer whenever the user mix or the screen changes.
  // Master off collapses all effective levels to 0 without touching the
  // stored per-channel settings, so unmuting restores the exact same mix.
  useEffect(() => {
    syncBgmVolumes();
    cueEngineRef.current?.setMasterVolume(effectiveChannelVolume('cues', mix));
    void syncAtmosphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mix, currentScreen]);

  // Control events from the Audio menu (track pin) and any legacy callers.
  useEffect(() => {
    const handleControl = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (detail.atmosphere) {
        setAtmosphere(detail.atmosphere as AtmosphereType);
      }
      if (typeof detail.bgmTrackId === 'string') {
        const requestedId = detail.bgmTrackId;
        bgmTrackIdRef.current = requestedId;
        try {
          localStorage.setItem('seihouse-bgm-track', requestedId);
        } catch {}
        window.dispatchEvent(new CustomEvent('seihouse-audio-state', {
          detail: { atmosphere: atmosphereRef.current, bgmTrackId: requestedId },
        }));
        // This runs synchronously inside the user's click, which doubles
        // as the gesture browsers require before audio may start.
        if (sceneMixRef.current) {
          if (requestedId === 'auto') {
            // Hand control back to the narrative: restart the calm bed
            // (matched to the current chapter's tags) so the next cue can
            // take over from a known state.
            const bedTrack = scoreEngineRef.current.resolveChapterDefault(chapterTagsRef.current);
            if (bedTrack && bedTrack.url) {
              sceneMixRef.current.crossfadeTo({
                id: bedTrack.id,
                title: bedTrack.id,
                artist: 'SEIHouse',
                audioFile: bedTrack.url,
              });
            }
          } else {
            const track = TRACK_LIBRARY.find(t => t.id === requestedId);
            if (track && track.url) {
              sceneMixRef.current.crossfadeTo({
                id: track.id,
                title: track.id,
                artist: 'SEIHouse',
                audioFile: track.url,
              });
            }
          }
        }
      }
    };
    window.addEventListener('seihouse-audio-control', handleControl);
    return () => window.removeEventListener('seihouse-audio-control', handleControl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Narrative cue routing: metadata drives the continuous layers (score +
  // atmosphere bed), narrative.fx.play drives budgeted one-shots.
  useEffect(() => {
    const handleCue = (e: Event) => {
      try {
        // With master audio off, or outside the reader, neither play nor
        // change any audio state.
        if (!getAudioMixSettings().master.enabled) return;
        if (currentScreenRef.current !== 'reader') return;

        const cue = (e as CustomEvent).detail;

        if (cue.type === 'narrative.metadata.signature') {
          // Metadata signatures feed the CONTINUOUS systems only — scene-score
          // music, intensity ducking and the atmosphere bed. They are never a
          // one-shot effect anymore: automatic one-shots go exclusively
          // through narrative.fx.play, where the cinematic governor budgets
          // them and the auto-cue policy keeps them high-confidence.
          const meta = cue.metadata || cue.value;

          if (meta) {
            // A manually pinned track always wins over narrative cues.
            if (meta.music && musicAllowed() && bgmTrackIdRef.current === 'auto') {
              const newTrack = scoreEngineRef.current.evaluateSceneContext(
                meta.music,
                meta.environment || [],
                { danger: meta.danger, tension: meta.tension, intensity: meta.intensity },
              );
              if (newTrack && newTrack.url && sceneMixRef.current) {
                // The engine no-ops on the already-active track, parks the
                // incoming deck past leading silence, and runs an
                // equal-power crossfade between the scores.
                sceneMixRef.current.crossfadeTo({
                  id: newTrack.id,
                  title: newTrack.id,
                  artist: 'SEIHouse',
                  audioFile: newTrack.url,
                });
              }
            }

            if (typeof meta.intensity === 'number') {
              bgmIntensityRef.current = Math.max(0.1, Math.min(1.0, meta.intensity));
              syncBgmVolumes();
            }

            if (meta.environment?.includes('rain') || meta.sceneType === 'travel') {
              setAtmosphere('rain');
            } else if (meta.environment?.includes('ocean') || meta.environment?.includes('sea') || meta.environment?.includes('water')) {
              setAtmosphere('ocean');
            } else if (meta.mysticism && meta.mysticism > 0.5) {
              setAtmosphere('wind');
            } else if (meta.danger && meta.danger > 0.5) {
              setAtmosphere('wind');
            } else if (meta.environment?.includes('mountain')) {
              setAtmosphere('wind');
            }
          }
        } else if (cue.type === 'narrative.chapter.enter') {
          // The header re-fires this cue whenever the observer re-attaches
          // (e.g. while blocks stream in during generation). Only treat it
          // as a chapter change the first time we see this cue id, so an
          // escalated score isn't reset mid-chapter.
          if (cue.id && cue.id === lastChapterCueIdRef.current) return;
          lastChapterCueIdRef.current = cue.id || null;

          scoreEngineRef.current.resetScene();
          const meta = cue.value;

          // Raise the escalation baseline for the whole chapter so a
          // high-stakes chapter can score war/fighting music even on
          // blocks that don't restate the danger value.
          scoreEngineRef.current.setChapterContext({
            danger: meta?.danger,
            tension: meta?.tension,
            intensity: meta?.intensity,
          });

          // Start a calm bed immediately — adventure/ambient carry the
          // chapter until a block earns an escalation. This runs even for
          // chapters without a cue payload so there is always a bed.
          chapterTagsRef.current = [meta?.environment, meta?.theme].flat().filter(Boolean);

          if (musicAllowed() && bgmTrackIdRef.current === 'auto') {
            const bedTrack = scoreEngineRef.current.resolveChapterDefault(chapterTagsRef.current);
            if (bedTrack && bedTrack.url && sceneMixRef.current) {
              sceneMixRef.current.crossfadeTo({
                id: bedTrack.id,
                title: bedTrack.id,
                artist: 'SEIHouse',
                audioFile: bedTrack.url,
              });
            }
          }

          if (meta) {
            if (typeof meta.intensity === 'number') {
              bgmIntensityRef.current = Math.max(0.2, Math.min(1.0, meta.intensity));
              syncBgmVolumes();
            }

            if (meta.element === 'water' && (meta.environment === 'sea' || meta.environment === 'ocean' || meta.environment === 'coast')) {
              setAtmosphere('ocean');
            } else if (meta.element === 'water' || meta.emotion === 'sorrow') {
              setAtmosphere('rain');
            } else if (meta.mysticism && meta.mysticism > 0.7) {
              setAtmosphere('wind');
            } else if (meta.danger && meta.danger > 0.6) {
              setAtmosphere('wind');
            } else if (meta.tension && meta.tension > 0.8) {
              setAtmosphere('wind');
            } else if (meta.theme === 'war' || meta.theme === 'combat' || meta.danger > 0.8) {
              setAtmosphere('combat');
            } else if (meta.theme === 'city' || meta.theme === 'festival' || meta.environment === 'city') {
              setAtmosphere('crowd');
            } else {
              setAtmosphere('none');
            }
          }
        } else if (cue.type === 'narrative.fx.play') {
          // Final gate: even a cue that slipped past the dispatch sites is
          // re-validated here. Footsteps / territory Foley / broad
          // environment tags normalize to null and play nothing — suppress,
          // never guess. The sprite engine is touched only for a cue that
          // will actually sound.
          const fxType = normalizeAutoCue(typeof cue.value === 'string' ? cue.value : '');
          if (!fxType) return;
          void playCue(fxType);
        }
      } catch (err) {
        console.warn('Audio system error during cue handling (safely caught):', err);
      }
    };

    window.addEventListener('narrative-cue', handleCue);
    return () => window.removeEventListener('narrative-cue', handleCue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Headless: renders nothing, so it can never block menu options.
}
