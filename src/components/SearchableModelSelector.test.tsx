import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SearchableModelSelector } from './SearchableModelSelector';

describe('SearchableModelSelector', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <SearchableModelSelector 
        label="Test" 
        value="value" 
        onChange={vi.fn()} 
        provider="gemini" 
        route="storyMaker" 
        presets={['preset1']} 
        dynamicModelsList={['dyn1']} 
        isLoading={false} 
        onRefresh={vi.fn()} 
        accentColorClass="text-red-500" 
      />
    );
    expect(container).toBeDefined();
  });
});
