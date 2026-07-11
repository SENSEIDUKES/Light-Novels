import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SystemBlock, SYSTEM_COLORS_LEGEND } from './SystemBlock';

const panelClass = (container: HTMLElement) =>
  (container.querySelector('.system-block') as HTMLElement)?.className || '';

describe('SystemBlock', () => {
  it('exports SYSTEM_COLORS_LEGEND', () => {
    expect(SYSTEM_COLORS_LEGEND.length).toBeGreaterThan(0);
  });

  it('renders a neutral event without crashing', () => {
    const { container } = render(<SystemBlock system={{ kind: 'status', promptType: 'neutral', title: 'Basic info' }} content="Hello" />);
    expect(container).toBeDefined();
  });

  it('renders a danger event without crashing', () => {
    const { container } = render(<SystemBlock system={{ kind: 'status', promptType: 'warning', title: 'Danger Alert' }} content="Danger" />);
    expect(container).toBeDefined();
  });

  describe('color classification', () => {
    it('treats a recognized promptType as authoritative over conflicting text', () => {
      const { container } = render(
        <SystemBlock system={{ kind: 'status', promptType: 'romance', title: 'Record of a Duel' }} content="" />
      );
      expect(panelClass(container)).toContain('text-pink-400');
    });

    it('renders unknown events neutral gray instead of portal blue', () => {
      const { container } = render(
        <SystemBlock system={{ kind: 'status', title: 'Resonance of the Unnamed' }} content="" />
      );
      const cls = panelClass(container);
      expect(cls).toContain('gray');
      expect(cls).not.toContain('portal');
    });

    it('infers a missing promptType from the title', () => {
      const { container } = render(
        <SystemBlock system={{ kind: 'status', title: 'Breakthrough Achieved' }} content="" />
      );
      expect(panelClass(container)).toContain('text-amber-400');
    });

    it('infers a missing promptType from row labels and values', () => {
      const { container } = render(
        <SystemBlock
          system={{ kind: 'status', title: 'Celestial Notice', rows: [{ label: 'Technique Learned', value: 'Moonlit Step' }] }}
          content=""
        />
      );
      expect(panelClass(container)).toContain('text-green-400');
    });

    it('infers a missing promptType from visible content', () => {
      const { container } = render(
        <SystemBlock system={{ kind: 'status', title: 'Celestial Notice' }} content="A hidden prophecy stirs." />
      );
      expect(panelClass(container)).toContain('text-purple-400');
    });

    it('keeps legacy kind palettes for old chapters without promptType', () => {
      const levelUp = render(<SystemBlock system={{ kind: 'level_up', title: 'Untitled Notice' }} content="" />);
      expect(panelClass(levelUp.container)).toContain('text-amber-400');

      const skill = render(<SystemBlock system={{ kind: 'skill_acquired', title: 'Untitled Notice' }} content="" />);
      expect(panelClass(skill.container)).toContain('#00ffff');

      const quest = render(<SystemBlock system={{ kind: 'quest', title: 'Untitled Notice' }} content="" />);
      expect(panelClass(quest.container)).toContain('text-violet-400');

      const appraisal = render(<SystemBlock system={{ kind: 'appraisal', title: 'Untitled Notice' }} content="" />);
      expect(panelClass(appraisal.container)).toContain('text-yellow-300');
    });

    it('handles an unrecognized promptType by inferring from context, not defaulting to blue', () => {
      const { container } = render(
        <SystemBlock system={{ kind: 'status', promptType: 'spirit_awakening_notice' as any, title: 'Awakening of the Azure Bloodline' }} content="" />
      );
      const cls = panelClass(container);
      expect(cls).toContain('text-amber-400');
      expect(cls).not.toContain('portal');
    });
  });

  describe('model-style fixtures', () => {
    // Gemini 2.5 Flash Lite style: complete structured object with promptType set.
    it('renders a complete structured object (2.5-style) with its declared category', () => {
      const { container } = render(
        <SystemBlock
          system={{
            kind: 'level_up',
            promptType: 'breakthrough',
            title: 'Breakthrough Achieved',
            rarity: 'Mythic',
            rows: [{ label: 'Realm', value: 'Core Formation' }],
          }}
          content="A holographic chime rang out."
        />
      );
      expect(panelClass(container)).toContain('text-amber-400');
    });

    // Gemini 3.1 Flash Lite style: promptType omitted, but title/kind/rows are meaningful.
    it('renders an incomplete structured object (3.1-style) via semantic inference', () => {
      const { container } = render(
        <SystemBlock
          system={{
            kind: 'skill_acquired',
            title: 'Azure Sky Sword Art — Initial Mastery',
            rows: [{ label: 'Technique', value: 'Azure Sky Sword Art' }],
          }}
          content=""
        />
      );
      // "mastery"/"technique" rows infer progression (green), not portal blue.
      const cls = panelClass(container);
      expect(cls).toContain('text-green-400');
      expect(cls).not.toContain('portal');
    });

    it('classifies a non-LitRPG mystery revelation panel', () => {
      const { container } = render(
        <SystemBlock
          system={{ kind: 'status', title: 'The Sealed Archive Opens', rows: [{ label: 'Revelation', value: 'The founder never died' }] }}
          content=""
        />
      );
      expect(panelClass(container)).toContain('text-purple-400');
    });

    it('classifies a LitRPG mechanical quest panel', () => {
      const { container } = render(
        <SystemBlock
          system={{ kind: 'quest', promptType: 'quest_update', title: 'Quest Updated', rows: [{ label: 'Objective', value: 'Reach Level 10' }] }}
          content=""
        />
      );
      expect(panelClass(container)).toContain('text-blue-400');
    });
  });

  describe('special animations', () => {
    it('keeps the death-flag menacing animation', () => {
      const { container } = render(
        <SystemBlock system={{ kind: 'status', promptType: 'corruption', title: 'Death Flag Detected' }} content="" />
      );
      expect(panelClass(container)).toContain('animate-menacing-red');
    });

    it('keeps the Iron Fate menacing animation', () => {
      const { container } = render(
        <SystemBlock system={{ kind: 'status', promptType: 'system_error', title: 'Iron Fate Warning' }} content="" />
      );
      expect(panelClass(container)).toContain('animate-menacing-amber');
    });
  });
});
