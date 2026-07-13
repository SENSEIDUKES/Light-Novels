import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomCharactersForm } from './CustomCharactersForm';

describe('CustomCharactersForm aliases', () => {
  it('normalizes user-authored aliases and known titles on commit', () => {
    const updateIntake = vi.fn();
    const intake = {
      customCharacters: [{
        id: 'char-intake-1',
        name: 'Mei Lian',
        aliases: [' Sister Mei ', 'mei lian', 'SISTER MEI'],
      }],
    } as any;

    render(
      <CustomCharactersForm
        intake={intake}
        updateIntake={updateIntake}
        activeSection="characters"
        setActiveSection={vi.fn()}
      />,
    );

    const field = screen.getByLabelText('Aliases / Known Titles');
    expect((field as HTMLTextAreaElement).value).toBe('Sister Mei');

    fireEvent.change(field, {
      target: { value: ' Sister Mei ; Pavilion Mistress\nsister mei; Mei Lian ' },
    });
    fireEvent.blur(field);

    expect((field as HTMLTextAreaElement).value).toBe('Sister Mei, Pavilion Mistress');
    expect(updateIntake).toHaveBeenCalledWith('customCharacters', [{
      ...intake.customCharacters[0],
      aliases: ['Sister Mei', 'Pavilion Mistress'],
    }]);
  });
});
