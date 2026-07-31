import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ReaderCodexPower } from './ReaderCodexPower';

describe('ReaderCodexPower', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ReaderCodexPower 
        memory={{ currentPowerStage: 'Foundation' } as any}
        activeStory={{} as any}
        getPowerStageLevel={() => ({ score: 1, title: 'Foundation' })}
        mcName="Han Feng"
        getPowerRankScore={() => ({ score: 1, title: 'Foundation' })}
        charsToRender={[]}
      />
    );
    expect(container).toBeDefined();
  });
});
