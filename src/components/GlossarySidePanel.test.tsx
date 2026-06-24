import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { GlossarySidePanel } from './GlossarySidePanel';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    userProfile: { qi: 0 }
  })
}));

describe('GlossarySidePanel', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <GlossarySidePanel 
        isOpen={true} 
        onClose={vi.fn()} 
        novelId="test" 
      />
    );
    expect(container).toBeDefined();
  });
});
