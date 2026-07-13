import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomFactionsForm } from './CustomFactionsForm';

describe('CustomFactionsForm aliases', () => {
  it('normalizes user-authored faction aliases on commit', () => {
    const updateIntake = vi.fn();
    const intake = {
      customFactions: [{
        id: 'faction-intake-1',
        name: 'Heavenly Sword Sect',
        aliases: ['Azure Hall'],
      }],
    } as any;

    render(
      <CustomFactionsForm
        intake={intake}
        updateIntake={updateIntake}
        activeSection="factions"
        setActiveSection={vi.fn()}
      />,
    );

    const field = screen.getByLabelText('Aliases / Known Titles');
    fireEvent.change(field, {
      target: { value: 'Azure Hall, Eastern Pavilion; azure hall; Heavenly Sword Sect' },
    });
    fireEvent.blur(field);

    expect((field as HTMLTextAreaElement).value).toBe('Azure Hall, Eastern Pavilion');
    expect(updateIntake).toHaveBeenCalledWith('customFactions', [{
      ...intake.customFactions[0],
      aliases: ['Azure Hall', 'Eastern Pavilion'],
    }]);
  });
});
