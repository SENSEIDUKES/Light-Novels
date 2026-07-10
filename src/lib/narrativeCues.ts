export type NarrativeCueEventType = 
  | 'narrative.scene.set'
  | 'narrative.ambience.crossfade'
  | 'narrative.fx.play'
  | 'narrative.metadata.signature'
  | 'narrative.chapter.enter'
  | 'narrative.paragraph.enter';

export interface NarrativeCuePayload {
  name?: string;
  intensity?: number;
  tension?: number;
  powerShift?: number;
  emotion?: string;
  relationshipShift?: number;
  danger?: number;
  mysticism?: number;
  element?: string;
  signature?: string;
  [key: string]: any;
}

export interface NarrativeCue {
  id: string;
  type: NarrativeCueEventType;
  once?: boolean;
  value?: string | NarrativeCuePayload;
  metadata?: NarrativeCuePayload;
}

export interface NarrationEventDetail {
  status: 'start' | 'block' | 'pause' | 'resume' | 'end';
  blockId?: string;
  blockIndex?: number;
  durationMs?: number;
  /** Normalized progress for the current paragraph/clip when available. */
  progress?: NarrationProgress;
}

export function dispatchNarration(detail: NarrationEventDetail) {
  const event = new CustomEvent('seihouse-narration', { detail });
  window.dispatchEvent(event);
}

const triggeredOnce = new Set<string>();

export function dispatchNarrativeCue(cue: NarrativeCue) {
  if (cue.once) {
    if (triggeredOnce.has(cue.id)) {
      return;
    }
    triggeredOnce.add(cue.id);
  }

  const event = new CustomEvent('narrative-cue', { detail: cue });
  window.dispatchEvent(event);
}
import type { NarrationProgress } from './narration/progress';
