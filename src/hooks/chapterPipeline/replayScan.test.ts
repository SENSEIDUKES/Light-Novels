import { describe, expect, it } from 'vitest';
import { scanForSceneReplay, stripQuotedSpans } from './replayScan';
import { SceneFingerprint } from '../../types';

const deathFp = (chapterNumber = 9): SceneFingerprint => ({
  actionType: 'death',
  participants: ['Elder Kang'],
  location: 'Azure Peak arena',
  outcome: 'Elder Kang dies',
  chapterNumber,
});

describe('stripQuotedSpans', () => {
  it('removes straight and curly quoted spans', () => {
    expect(stripQuotedSpans('He said "Elder Kang died" sadly.')).not.toContain('Elder Kang');
    expect(stripQuotedSpans('He said “Elder Kang died” sadly.')).not.toContain('Elder Kang');
  });
});

describe('scanForSceneReplay', () => {
  it('flags an actively re-narrated death from the immediate lookback as severe', () => {
    const prose = 'The blade fell. Elder Kang died with a scream as blood soaked the sand.';
    const result = scanForSceneReplay(prose, [deathFp(9)], 10);
    expect(result.severe).toHaveLength(1);
    expect(result.severe[0]).toContain('Elder Kang');
    expect(result.soft).toEqual([]);
  });

  it('never flags dialogue references to a completed death', () => {
    const prose = '"I still cannot believe Elder Kang died," Li Wei whispered into the night.';
    const result = scanForSceneReplay(prose, [deathFp(9)], 10);
    expect(result.severe).toEqual([]);
    expect(result.soft).toEqual([]);
  });

  it('never flags retrospective narration (memories, grief, past-perfect)', () => {
    const mourning = 'Li Wei mourned quietly. Elder Kang had died three days ago, slain in the arena.';
    expect(scanForSceneReplay(mourning, [deathFp(9)], 10).severe).toEqual([]);

    const memory = 'The memory returned: Elder Kang, slain before the whole sect.';
    expect(scanForSceneReplay(memory, [deathFp(9)], 10).severe).toEqual([]);
  });

  it('ignores deaths outside the 2-chapter hard lookback', () => {
    const prose = 'Elder Kang died with a scream.';
    expect(scanForSceneReplay(prose, [deathFp(5)], 10).severe).toEqual([]);
  });

  it('reports breakthrough replays as soft, never severe', () => {
    const fp: SceneFingerprint = {
      actionType: 'breakthrough',
      participants: ['Li Wei'],
      outcome: 'Li Wei reaches Core Formation',
      chapterNumber: 9,
    };
    const prose = 'Light erupted as Li Wei broke through to Core Formation at last.';
    const result = scanForSceneReplay(prose, [fp], 10);
    expect(result.severe).toEqual([]);
    expect(result.soft).toHaveLength(1);
  });

  it('returns clean for empty prose or no fingerprints', () => {
    expect(scanForSceneReplay('', [deathFp()], 10)).toEqual({ severe: [], soft: [] });
    expect(scanForSceneReplay('Some prose.', [], 10)).toEqual({ severe: [], soft: [] });
  });
});
