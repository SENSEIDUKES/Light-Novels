import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LivingCodexImageGallery } from './LivingCodexImageGallery';
import { CodexProvider } from './CodexContext';

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

  it('renders images and handles clicking on them to revert image', () => {
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
    expect(handleRevertImage).toHaveBeenCalledWith('char-1', 'character', 'url2');
  });
});
