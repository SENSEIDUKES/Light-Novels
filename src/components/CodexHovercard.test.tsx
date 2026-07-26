import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CodexHovercard } from './CodexHovercard';

const storyState = vi.hoisted(() => ({
  current: { id: 'story-1', mcName: 'Li Qiye', readerPreferences: {} as Record<string, unknown> },
}));

vi.mock('../hooks/useImageManifest', () => ({
  useImageManifest: () => ({
    manifestImage: vi.fn(),
    generatingIds: new Set()
  })
}));

vi.mock('../store/useAppStore', () => {
  const useAppStore = Object.assign(
    (selector?: (state: any) => unknown) => {
      const state = { activeStoryId: 'story-1', stories: [storyState.current], setAppError: vi.fn() };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ setAppError: vi.fn() }) },
  );
  return { useAppStore };
});

function highlightClass(
  type: 'character' | 'faction' | 'artifact' | 'location',
  entry: Record<string, unknown>,
): string {
  const { unmount } = render(
    <CodexHovercard term={String(entry.name)} type={type} entry={entry as any}>
      <span>{String(entry.name)}</span>
    </CodexHovercard>
  );
  const className = screen.getByRole('button', { name: String(entry.name) }).className;
  unmount();
  return className;
}

describe('CodexHovercard', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <CodexHovercard term="Test" type="character" entry={{ id: '1', name: 'Test' } as any}>
        <span>Hover me</span>
      </CodexHovercard>
    );
    expect(container).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Hover me' }));
    expect(screen.getByRole('button', { name: 'Manifest portrait for Test' }).getAttribute('aria-label'))
      .toBe('Manifest portrait for Test');
  });

  // The reader's colour mapping is category-specific, not one generic
  // highlight: a rival, a mentor, a sacred location and a legendary artifact
  // each carry their own tier colour.
  it('maps each Codex category to its own highlight colour', () => {
    const rival = highlightClass('character', { id: 'c1', name: 'Ye Mo', relationshipToMC: 'Rival' });
    const mentor = highlightClass('character', { id: 'c2', name: 'Elder Mo', relationshipToMC: 'Master' });
    const lover = highlightClass('character', { id: 'c3', name: 'Su Yan', relationshipToMC: 'Dao Companion' });
    const location = highlightClass('location', { id: 'l1', name: 'Market Row', description: 'A busy street.' });
    const sacred = highlightClass('location', { id: 'l2', name: 'Sky Altar', description: 'A sacred terrace.' });
    const legendary = highlightClass('artifact', { id: 'a1', name: 'Jade Blade', tier: 'Legendary' });
    const common = highlightClass('artifact', { id: 'a2', name: 'Iron Knife', tier: 'Common' });
    const faction = highlightClass('faction', { id: 'f1', name: 'Azure Sect' });

    expect(rival).toContain('text-red-500');
    expect(mentor).toContain('text-[#d4af37]');
    expect(lover).toContain('text-pink-400');
    expect(location).toContain('text-purple-400');
    expect(sacred).toContain('text-[#d4af37]');
    expect(legendary).toContain('text-[#d4af37]');
    expect(common).toContain('text-white');
    expect(faction).toContain('text-[#b9d6c1]');

    expect(new Set([rival, mentor, lover, location, common, faction]).size).toBe(6);
  });

  it('keeps the category colour under every reader highlight style', () => {
    const entry = { id: 'c1', name: 'Ye Mo', relationshipToMC: 'Enemy' };

    storyState.current.readerPreferences = {};
    const full = highlightClass('character', entry);
    storyState.current.readerPreferences = { highlightStyle: 'underline' };
    const underline = highlightClass('character', entry);
    storyState.current.readerPreferences = { highlightStyle: 'tint' };
    const tint = highlightClass('character', entry);
    storyState.current.readerPreferences = {};

    for (const className of [full, underline, tint]) {
      expect(className).toContain('text-red-500');
    }
    expect(full).toContain('bg-red-500/10');
    expect(underline).toContain('border-dashed');
    expect(tint).not.toContain('bg-red-500/10');
  });
});
