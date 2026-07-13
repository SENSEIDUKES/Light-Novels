import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CodexEntryContextDialog } from './CodexEntryContextDialog';

describe('CodexEntryContextDialog', () => {
  it('blocks alias collisions and saves approved nested pin metadata', () => {
    const onSave = vi.fn();
    render(
      <CodexEntryContextDialog
        entry={{
          id: 'char-1',
          name: 'Mei Lian',
          provenance: { sourceChapterNumber: 2 },
        }}
        peerEntries={[
          { id: 'char-1', name: 'Mei Lian' },
          { id: 'char-2', name: 'Lan Wei', aliases: ['Little Lan'] },
        ]}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    const aliasInput = screen.getByLabelText('New alias or known title for Mei Lian');
    fireEvent.change(aliasInput, { target: { value: 'Little Lan' } });
    fireEvent.click(screen.getByLabelText('Add alias or known title for Mei Lian'));

    expect(screen.getByRole('alert').textContent).toContain('already identifies Lan Wei');
    expect((screen.getByRole('button', { name: 'Save Context' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByLabelText('Remove Little Lan from Mei Lian'));
    fireEvent.change(aliasInput, { target: { value: 'Pavilion Mistress' } });
    fireEvent.click(screen.getByLabelText('Add alias or known title for Mei Lian'));
    fireEvent.click(screen.getByLabelText('Pin Mei Lian to context'));
    fireEvent.change(screen.getByLabelText('Context priority'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Author context note'), {
      target: { value: '  Always speaks formally.  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Context' }));

    expect(onSave).toHaveBeenCalledWith({
      aliases: ['Pavilion Mistress'],
      contextPriority: 7,
      authorContextNote: 'Always speaks formally.',
      provenance: { sourceChapterNumber: 2, isUserPinned: true },
    });
  });
});
