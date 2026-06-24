import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexArtifacts } from './LivingCodexArtifacts';

describe('LivingCodexArtifacts', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <LivingCodexArtifacts 
        artifactsToRender={[]} 
        showAddArtifactForm={false} 
        setShowAddArtifactForm={vi.fn()} 
        newArtifact={{}} 
        setNewArtifact={vi.fn()} 
        handleAddArtifact={vi.fn()} 
        setDeletePrompt={vi.fn()} 
        handleAwakenCardImage={vi.fn()} 
        renderImageHistoryGallery={vi.fn()} 
        generatingId={null} 
        previews={{}} 
        activeStory={{} as any} 
      />
    );
    expect(container).toBeDefined();
  });
});
