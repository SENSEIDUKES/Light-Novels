import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { LivingCodexImageGallery } from './LivingCodexImageGallery';
import { CodexProvider } from './CodexContext';

const mocks = vi.hoisted(() => ({
  getMediaAsset: vi.fn(),
}));

vi.mock('../../lib/media/mediaAssetClient', () => ({
  getMediaAsset: mocks.getMediaAsset,
}));

vi.mock('../../lib/media/privateMediaResolver', () => ({
  resolveMediaAssetForDisplay: vi.fn(async (descriptor: { id: string }) => ({
    assetId: descriptor.id,
    descriptor,
    url: `blob:${descriptor.id}`,
    source: 'network' as const,
  })),
}));

describe('LivingCodexImageGallery', () => {
  it('renders nothing if imageHistory is empty or has only 1 item', () => {
    const mockContext = {
      handleRevertImage: vi.fn(),
    } as any;

    const { container } = render(
      <CodexProvider value={mockContext}>
        <LivingCodexImageGallery
          entityId="1"
          type="character"
          imageHistory={[]}
        />
      </CodexProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  // Versions are addressed by their durable history id. Passing the rendered
  // URL restored an arbitrary version once PostgreSQL started hydrating every
  // superseded entry with an empty `imageUrl`.
  it('renders images and reverts by the version history id', () => {
    const handleRevertImage = vi.fn();
    const mockContext = {
      handleRevertImage,
    } as any;

    const imageHistory = [
      { id: 'img1', imageUrl: 'url1', chapterNumber: 1, promptUsed: 'prompt1' },
      { id: 'img2', imageUrl: 'url2', chapterNumber: 2, promptUsed: 'prompt2' },
    ];

    const { getAllByRole } = render(
      <CodexProvider value={mockContext}>
        <LivingCodexImageGallery
          entityId="char-1"
          type="character"
          imageHistory={imageHistory}
        />
      </CodexProvider>
    );

    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(2);

    fireEvent.click(buttons[1]);
    expect(handleRevertImage).toHaveBeenCalledWith('char-1', 'character', 'img2');
  });

  // A story read only carries signed delivery URLs for the current surface, so
  // superseded versions arrive with an empty imageUrl and rendered as blanks.
  it('resolves a superseded version from its canonical asset id', async () => {
    mocks.getMediaAsset.mockResolvedValue({ id: 'asset-older', visibility: 'PRIVATE' });
    const mockContext = {
      handleRevertImage: vi.fn(),
      activeStory: { userId: 'owner-a' },
    } as any;

    const { container } = render(
      <CodexProvider value={mockContext}>
        <LivingCodexImageGallery
          entityId="char-1"
          type="character"
          imageHistory={[
            { id: 'img1', assetId: 'asset-older', imageUrl: '', chapterNumber: 1 },
            { id: 'img2', assetId: 'asset-current', imageUrl: 'blob:asset-current', chapterNumber: 2 },
          ]}
        />
      </CodexProvider>
    );

    await waitFor(() => {
      expect(container.querySelectorAll('img')).toHaveLength(2);
    });
    expect(Array.from(container.querySelectorAll('img'), node => node.getAttribute('src')))
      .toEqual(['blob:asset-older', 'blob:asset-current']);
    expect(mocks.getMediaAsset).toHaveBeenCalledWith('asset-older', 'owner-a');
    expect(mocks.getMediaAsset).not.toHaveBeenCalledWith('asset-current', 'owner-a');
  });

  it('uses human-readable chapter and prompt fallbacks', () => {
    const mockContext = {
      handleRevertImage: vi.fn(),
    } as any;

    const { getByRole } = render(
      <CodexProvider value={mockContext}>
        <LivingCodexImageGallery
          entityId="char-1"
          type="character"
          imageHistory={[
            { id: 'img1', imageUrl: 'url1', promptUsed: 'prompt1' },
            { id: 'img2', imageUrl: 'url2' },
          ]}
        />
      </CodexProvider>
    );

    const fallbackButton = getByRole('button', {
      name: 'Revert to image generated at Chapter Unknown. Prompt unavailable',
    });
    expect(fallbackButton.getAttribute('title')).toBe(
      'Generated at Chapter Unknown\nPrompt unavailable',
    );
  });
});
