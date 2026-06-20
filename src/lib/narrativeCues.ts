export type NarrativeCueEventType = 
  | 'narrative.scene.set'
  | 'narrative.ambience.crossfade'
  | 'narrative.fx.play'
  | 'narrative.metadata.signature'
  | 'narrative.chapter.enter'
  | 'narrative.paragraph.enter';

export interface NarrativeCue {
  id: string;
  type: NarrativeCueEventType;
  once?: boolean;
  value?: any;
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
