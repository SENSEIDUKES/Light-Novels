import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DestinyChoicePanel } from './DestinyChoicePanel';

describe('DestinyChoicePanel', () => {
  it('renders without crashing when open', () => {
    const { container } = render(
      <DestinyChoicePanel 
        isOpen={true}
        imageUrls={['url1', 'url2']}
        selectedIndex={0}
        onSelect={vi.fn()}
        onApply={vi.fn()}
        onDiscard={vi.fn()}
      />
    );
    expect(container).toBeDefined();
  });
});
