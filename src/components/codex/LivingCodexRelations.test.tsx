import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexRelations } from './LivingCodexRelations';

describe('LivingCodexRelations', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <LivingCodexRelations 
        memory={{ relationships: [], characters: [] } as any}
        charsToRender={[]}
        showAddRelForm={false}
        setShowAddRelForm={vi.fn()}
        newRel={{}}
        setNewRel={vi.fn()}
        handleAddCustomRelationship={vi.fn()}
        setDeletePrompt={vi.fn()}
        selectedNodeChar={null}
        setSelectedNodeChar={vi.fn()}
        mcName="Han Feng"
        activeStory={{ relationships: [] } as any}
        bondSourceId=""
        setBondSourceId={vi.fn()}
        bondTargetId=""
        setBondTargetId={vi.fn()}
        bondAffinity={0}
        setBondAffinity={vi.fn()}
        bondDesc=""
        setBondDesc={vi.fn()}
      />
    );
    expect(container).toBeDefined();
  });
});
