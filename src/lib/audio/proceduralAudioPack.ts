import type { AudioSpriteManifest } from '@seihouse/audio-player';

/**
 * Offline renderer for the reader's procedural sounds.
 *
 * The atmosphere beds (wind, rain, ocean, crowd, combat) and the one-shot
 * story cues used to be synthesized live on a hand-rolled AudioContext graph
 * inside useAtmosphericAudio. To centralize playback in the SEIHouse Audio
 * Player, the exact same synth graphs are rendered once through an
 * OfflineAudioContext into a single WAV sprite pack, which SAP's
 * AudioSpriteEngine then owns end to end (looping, fades, volume, autoplay
 * unlock). No audio assets ship with the app — the pack is generated
 * client-side on first use and cached for the session.
 */

const SAMPLE_RATE = 44100;
/** Silence between clips so loop points never bleed into a neighbor. */
const CLIP_GAP_SECONDS = 0.15;
/** Overlap-add window that makes the noise-based beds loop seamlessly. */
const LOOP_SEAM_SECONDS = 0.25;

export const ATMOSPHERE_CLIPS = ['wind', 'rain', 'ocean', 'crowd', 'combat'] as const;
export type AtmosphereClipName = (typeof ATMOSPHERE_CLIPS)[number];

export const CUE_CLIPS = [
  'system_alert',
  'breakthrough',
  'artifact_activation',
  'beast_reveal',
  'fate_shift',
  'major_impact',
] as const;
export type CueClipName = (typeof CUE_CLIPS)[number];

type ClipRenderer = (ctx: OfflineAudioContext, destination: AudioNode) => void;

interface ClipSpec {
  name: string;
  /** Audible clip length in seconds (loop period for looping clips). */
  duration: number;
  loop: boolean;
  render: ClipRenderer;
}

const createNoiseBuffer = (ctx: OfflineAudioContext, seconds: number) => {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < output.length; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

const noiseSource = (ctx: OfflineAudioContext) => {
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(ctx, 2);
  source.loop = true;
  return source;
};

// --- Atmosphere beds. Node graphs and levels match the previous live synth. ---

const renderWind: ClipRenderer = (ctx, destination) => {
  const source = noiseSource(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.1;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 300;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  const gain = ctx.createGain();
  gain.gain.value = 0.3;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start();
};

const renderRain: ClipRenderer = (ctx, destination) => {
  const source = noiseSource(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1200;

  const gain = ctx.createGain();
  gain.gain.value = 0.4;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start();
};

const renderOcean: ClipRenderer = (ctx, destination) => {
  const source = noiseSource(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 600;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  const gain = ctx.createGain();
  gain.gain.value = 0.25;

  const volLfo = ctx.createOscillator();
  volLfo.type = 'sine';
  volLfo.frequency.value = 0.08;
  const volLfoGain = ctx.createGain();
  volLfoGain.gain.value = 0.2;
  volLfo.connect(volLfoGain);
  volLfoGain.connect(gain.gain);
  volLfo.start();

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start();
};

const renderCrowd: ClipRenderer = (ctx, destination) => {
  const source = noiseSource(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 500;
  filter.Q.value = 0.5;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 1.5;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 100;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  const gain = ctx.createGain();
  gain.gain.value = 0.2;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start();
};

const renderCombatBed: ClipRenderer = (ctx, destination) => {
  const source = noiseSource(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;

  const gain = ctx.createGain();
  gain.gain.value = 0.2;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start();
};

// --- One-shot cues. Same envelopes and voicings as the old trigger* functions. ---

const renderChime: ClipRenderer = (ctx, destination) => {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, 0);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(0.2, 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, 1.5);

  osc.connect(gain);
  gain.connect(destination);
  osc.start();
  osc.stop(1.5);
};

const renderSystemAlert: ClipRenderer = (ctx, destination) => {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, 0);
  osc.frequency.exponentialRampToValueAtTime(1200, 0.1);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(0.3, 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, 0.5);

  osc.connect(gain);
  gain.connect(destination);
  osc.start();
  osc.stop(0.5);
};

const renderCombatHit: ClipRenderer = (ctx, destination) => {
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(300, 0);
  osc.frequency.exponentialRampToValueAtTime(100, 0.3);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(0.5, 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, 0.3);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  osc.start();
  osc.stop(0.3);
};

const renderQiSurge: ClipRenderer = (ctx, destination) => {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(50, 0);
  osc.frequency.exponentialRampToValueAtTime(300, 1.5);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(0.6, 1.0);
  gain.gain.exponentialRampToValueAtTime(0.001, 1.5);

  osc.connect(gain);
  gain.connect(destination);
  osc.start();
  osc.stop(1.5);
};

const renderMajorHit: ClipRenderer = (ctx, destination) => {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(100, 0);
  osc.frequency.exponentialRampToValueAtTime(20, 0.5);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, 0);
  filter.frequency.exponentialRampToValueAtTime(50, 0.5);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(0.8, 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, 0.5);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  osc.start();
  osc.stop(0.5);
};

const renderFateShift: ClipRenderer = (ctx, destination) => {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, 0);
  osc.frequency.linearRampToValueAtTime(750, 2.0);

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 8;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 50;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(0.3, 1.0);
  gain.gain.exponentialRampToValueAtTime(0.001, 2.0);

  osc.connect(gain);
  gain.connect(destination);
  lfo.start();
  osc.start();
  lfo.stop(2.0);
  osc.stop(2.0);
};

// Loop periods are whole LFO cycles so the modulation is phase-continuous at
// the loop point; the noise seam is smoothed by the overlap-add below.
const CLIP_SPECS: ClipSpec[] = [
  { name: 'wind', duration: 10, loop: true, render: renderWind },
  { name: 'rain', duration: 6, loop: true, render: renderRain },
  { name: 'ocean', duration: 12.5, loop: true, render: renderOcean },
  { name: 'crowd', duration: 8, loop: true, render: renderCrowd },
  { name: 'combat', duration: 8, loop: true, render: renderCombatBed },
  { name: 'system_alert', duration: 0.6, loop: false, render: renderSystemAlert },
  { name: 'breakthrough', duration: 1.6, loop: false, render: renderQiSurge },
  { name: 'artifact_activation', duration: 1.6, loop: false, render: renderChime },
  { name: 'beast_reveal', duration: 0.6, loop: false, render: renderMajorHit },
  { name: 'fate_shift', duration: 2.1, loop: false, render: renderFateShift },
  { name: 'major_impact', duration: 0.4, loop: false, render: renderCombatHit },
];

const getOfflineAudioContext = (): typeof OfflineAudioContext | null => {
  if (typeof window === 'undefined') return null;
  return (
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .webkitOfflineAudioContext ||
    null
  );
};

const renderClip = async (spec: ClipSpec): Promise<Float32Array> => {
  const Offline = getOfflineAudioContext();
  if (!Offline) return new Float32Array(Math.ceil(spec.duration * SAMPLE_RATE));

  const seam = spec.loop ? LOOP_SEAM_SECONDS : 0;
  const frames = Math.ceil((spec.duration + seam) * SAMPLE_RATE);
  const ctx = new Offline(1, frames, SAMPLE_RATE);
  spec.render(ctx, ctx.destination);
  const rendered = (await ctx.startRendering()).getChannelData(0);

  if (!spec.loop) return rendered.slice(0, Math.ceil(spec.duration * SAMPLE_RATE));

  // Loop seam: crossfade the extra tail under the clip head so jumping from
  // the last sample back to the first is continuous even for noise.
  const loopFrames = Math.ceil(spec.duration * SAMPLE_RATE);
  const seamFrames = Math.min(Math.ceil(seam * SAMPLE_RATE), rendered.length - loopFrames);
  const out = rendered.slice(0, loopFrames);
  for (let i = 0; i < seamFrames; i++) {
    const fadeIn = i / seamFrames;
    out[i] = out[i] * fadeIn + rendered[loopFrames + i] * (1 - fadeIn);
  }
  return out;
};

const encodeWav = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * bytesPerSample, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return buffer;
};

let packPromise: Promise<AudioSpriteManifest> | null = null;

/**
 * Render (once per session) the procedural sprite pack and return the SAP
 * manifest pointing at its blob URL. Safe to call repeatedly and from
 * multiple engines — they all share one rendered pack.
 */
export function ensureProceduralAudioPack(): Promise<AudioSpriteManifest> {
  if (!packPromise) {
    packPromise = (async () => {
      const gapFrames = Math.ceil(CLIP_GAP_SECONDS * SAMPLE_RATE);
      const clips: AudioSpriteManifest['clips'] = {};
      const parts: Float32Array[] = [];
      let cursor = 0;

      for (const spec of CLIP_SPECS) {
        const samples = await renderClip(spec);
        clips[spec.name] = {
          offset: cursor / SAMPLE_RATE,
          duration: samples.length / SAMPLE_RATE,
          loop: spec.loop,
        };
        parts.push(samples);
        cursor += samples.length + gapFrames;
      }

      const total = new Float32Array(cursor);
      let write = 0;
      for (const part of parts) {
        total.set(part, write);
        write += part.length + gapFrames;
      }

      const wav = encodeWav(total, SAMPLE_RATE);
      const src = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
      return { src, clips };
    })().catch((err) => {
      // A failed render must not poison the session: allow a retry.
      packPromise = null;
      throw err;
    });
  }
  return packPromise;
}

export function resetProceduralAudioPackForTests() {
  packPromise = null;
}
