import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatchNarration, dispatchNarrativeCue } from './narrativeCues';
import { cinematicEffectGovernor } from './effects/cinematicEffectGovernor';

describe('narrativeCues', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('dispatchNarration dispatches a custom event', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    dispatchNarration({ status: 'start' });
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('seihouse-narration');
    expect(event.detail.status).toBe('start');
  });

  it('dispatchNarrativeCue dispatches a custom event', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    dispatchNarrativeCue({ id: 'test1', type: 'narrative.scene.set' });
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('narrative-cue');
    expect(event.detail.id).toBe('test1');
  });

  it('dispatchNarrativeCue respects once flag', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    dispatchNarrativeCue({ id: 'test2', type: 'narrative.scene.set', once: true });
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    // Should not dispatch again
    dispatchNarrativeCue({ id: 'test2', type: 'narrative.scene.set', once: true });
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });

  it('drives the cinematic effect governor narration signal from the narration lifecycle', () => {
    dispatchNarration({ status: 'start' });
    expect(cinematicEffectGovernor.isActive()).toBe(true);

    dispatchNarration({ status: 'pause' });
    expect(cinematicEffectGovernor.isActive()).toBe(false);

    dispatchNarration({ status: 'resume' });
    expect(cinematicEffectGovernor.isActive()).toBe(true);

    // Block events carry progress, not lifecycle — they must not flip the signal.
    dispatchNarration({ status: 'block', blockIndex: 3 });
    expect(cinematicEffectGovernor.isActive()).toBe(true);

    dispatchNarration({ status: 'end' });
    expect(cinematicEffectGovernor.isActive()).toBe(false);
  });
});
