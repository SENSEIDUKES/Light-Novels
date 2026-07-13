import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CodexEntryContextFields } from './CodexEntryContextFields';
import type { CodexEntryContextValue } from '../../lib/codexEntryContext';

function ControlledFields() {
  const [value, setValue] = useState<CodexEntryContextValue>({
    aliases: ['Sister Mei'],
    contextPriority: 2,
    authorContextNote: 'Speaks formally.',
    provenance: { sourceChapterNumber: 3 },
  });

  return (
    <>
      <CodexEntryContextFields
        idPrefix="character-mei"
        entityLabel="Mei"
        value={value}
        onChange={(updates) => setValue(current => ({ ...current, ...updates }))}
      />
      <output data-testid="context-value">{JSON.stringify(value)}</output>
    </>
  );
}

const readValue = () => JSON.parse(screen.getByTestId('context-value').textContent || '{}');

describe('CodexEntryContextFields', () => {
  it('adds, deduplicates, and removes aliases as controlled values', () => {
    render(<ControlledFields />);

    const aliasInput = screen.getByLabelText('New alias or known title for Mei');
    fireEvent.change(aliasInput, { target: { value: '  The Pavilion Mistress  ' } });
    fireEvent.keyDown(aliasInput, { key: 'Enter' });

    expect(readValue().aliases).toEqual(['Sister Mei', 'The Pavilion Mistress']);

    fireEvent.change(aliasInput, { target: { value: 'sister mei' } });
    fireEvent.click(screen.getByLabelText('Add alias or known title for Mei'));
    expect(readValue().aliases).toEqual(['Sister Mei', 'The Pavilion Mistress']);

    fireEvent.click(screen.getByLabelText('Remove Sister Mei from Mei'));
    expect(readValue().aliases).toEqual(['The Pavilion Mistress']);
  });

  it('edits priority and the author note', () => {
    render(<ControlledFields />);

    fireEvent.change(screen.getByLabelText('Context priority'), { target: { value: '9' } });
    fireEvent.change(screen.getByLabelText('Author context note'), {
      target: { value: 'Never uses contractions.' },
    });

    expect(readValue()).toMatchObject({
      contextPriority: 9,
      authorContextNote: 'Never uses contractions.',
    });
  });

  it('toggles only the nested provenance pin while preserving provenance', () => {
    render(<ControlledFields />);

    const pinButton = screen.getByLabelText('Pin Mei to context');
    expect(pinButton.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(pinButton);

    expect(readValue().provenance).toEqual({ sourceChapterNumber: 3, isUserPinned: true });
    const unpinButton = screen.getByLabelText('Unpin Mei from context');
    expect(unpinButton.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(unpinButton);
    expect(readValue().provenance).toEqual({ sourceChapterNumber: 3, isUserPinned: false });
  });
});
