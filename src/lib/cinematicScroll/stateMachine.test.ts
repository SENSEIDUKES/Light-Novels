import { describe, it, expect } from 'vitest';
import {
  CinematicScrollContext,
  CinematicScrollEvent,
  CinematicScrollState,
  deriveState,
  initialContext,
  reduce,
} from './stateMachine';

const apply = (
  events: CinematicScrollEvent['type'][],
  from: CinematicScrollContext = initialContext,
): CinematicScrollContext =>
  events.reduce((ctx, type) => reduce(ctx, { type } as CinematicScrollEvent), from);

const stateAfter = (events: CinematicScrollEvent['type'][]): CinematicScrollState =>
  deriveState(apply(events));

describe('cinematic scroll state machine', () => {
  it('starts idle', () => {
    expect(deriveState(initialContext)).toBe('idle');
  });

  // Table-driven transition coverage.
  const cases: Array<{
    name: string;
    events: CinematicScrollEvent['type'][];
    expected: CinematicScrollState;
  }> = [
    { name: 'narration start → following', events: ['NARRATION_STARTED'], expected: 'following' },
    { name: 'pause → paused', events: ['NARRATION_STARTED', 'NARRATION_PAUSED'], expected: 'paused' },
    {
      name: 'pause then resume → following',
      events: ['NARRATION_STARTED', 'NARRATION_PAUSED', 'NARRATION_RESUMED'],
      expected: 'following',
    },
    { name: 'end → idle', events: ['NARRATION_STARTED', 'NARRATION_ENDED'], expected: 'idle' },
    {
      name: 'user intervention → yielded',
      events: ['NARRATION_STARTED', 'USER_INTERVENED'],
      expected: 'yielded',
    },
    {
      name: 'yield survives narration pause/resume',
      events: ['NARRATION_STARTED', 'USER_INTERVENED', 'NARRATION_PAUSED', 'NARRATION_RESUMED'],
      expected: 'yielded',
    },
    {
      name: 'explicit resume returns to following',
      events: ['NARRATION_STARTED', 'USER_INTERVENED', 'RESUME_REQUESTED'],
      expected: 'following',
    },
    {
      name: 'auto scroll disabled → suppressed',
      events: ['NARRATION_STARTED', 'AUTO_SCROLL_DISABLED'],
      expected: 'suppressed',
    },
    {
      name: 'auto scroll re-enabled → following',
      events: ['NARRATION_STARTED', 'AUTO_SCROLL_DISABLED', 'AUTO_SCROLL_ENABLED'],
      expected: 'following',
    },
    {
      name: 'reduced motion → suppressed',
      events: ['NARRATION_STARTED', 'REDUCED_MOTION_ENABLED'],
      expected: 'suppressed',
    },
    {
      name: 'reduced motion off → following',
      events: ['NARRATION_STARTED', 'REDUCED_MOTION_ENABLED', 'REDUCED_MOTION_DISABLED'],
      expected: 'following',
    },
    {
      name: 'suppression wins over yield priority ordering',
      events: ['NARRATION_STARTED', 'USER_INTERVENED', 'AUTO_SCROLL_DISABLED'],
      expected: 'suppressed',
    },
    {
      name: 'pause wins over suppression',
      events: ['NARRATION_STARTED', 'AUTO_SCROLL_DISABLED', 'NARRATION_PAUSED'],
      expected: 'paused',
    },
    {
      name: 'intervention while idle is a no-op',
      events: ['USER_INTERVENED'],
      expected: 'idle',
    },
    {
      name: 'pause while idle is a no-op',
      events: ['NARRATION_PAUSED'],
      expected: 'idle',
    },
    {
      name: 'a fresh narration start clears an old yield',
      events: ['NARRATION_STARTED', 'USER_INTERVENED', 'NARRATION_ENDED', 'NARRATION_STARTED'],
      expected: 'following',
    },
  ];

  for (const { name, events, expected } of cases) {
    it(name, () => {
      expect(stateAfter(events)).toBe(expected);
    });
  }

  it('yield is permanent: no sequence of narration events alone can resume movement', () => {
    let ctx = apply(['NARRATION_STARTED', 'USER_INTERVENED']);
    // Every event except RESUME_REQUESTED / NARRATION_ENDED+STARTED should
    // leave the machine out of `following`.
    const narrationOnly: CinematicScrollEvent['type'][] = [
      'NARRATION_PAUSED',
      'NARRATION_RESUMED',
      'AUTO_SCROLL_DISABLED',
      'AUTO_SCROLL_ENABLED',
      'REDUCED_MOTION_ENABLED',
      'REDUCED_MOTION_DISABLED',
    ];
    for (const type of narrationOnly) {
      ctx = reduce(ctx, { type } as CinematicScrollEvent);
      expect(deriveState(ctx)).not.toBe('following');
    }
    expect(deriveState(reduce(ctx, { type: 'RESUME_REQUESTED' }))).toBe('following');
  });

  it('returns the same context reference for no-op events (cheap dispatch)', () => {
    expect(reduce(initialContext, { type: 'USER_INTERVENED' })).toBe(initialContext);
    expect(reduce(initialContext, { type: 'NARRATION_PAUSED' })).toBe(initialContext);
  });
});
