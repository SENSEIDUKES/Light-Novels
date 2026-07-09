import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AkashaRecord from './AkashaRecord';
import { StoryMemory } from '../types';

const createMemory = (overrides: Partial<StoryMemory> = {}): StoryMemory => ({
  powerSystem: 'Qi',
  currentPowerStage: 'Mortal',
  worldRules: [],
  characters: [],
  unresolvedPlotThreads: [],
  resolvedPlotThreads: [],
  ...overrides
});

describe('AkashaRecord', () => {
  it('renders without crashing', () => {
    const { container } = render(<AkashaRecord memory={createMemory()} onUpdateMemory={() => {}} />);
    expect(container).toBeDefined();
  });

  it('toggles only the selected character when names are duplicated', () => {
    const memory = createMemory({
      characters: [
        {
          id: 'char-1',
          name: 'Azure Disciple',
          role: 'Ally',
          description: 'First duplicate name.',
          relationshipToMC: 'Friendly',
          status: 'alive'
        },
        {
          id: 'char-2',
          name: 'Azure Disciple',
          role: 'Rival',
          description: 'Second duplicate name.',
          relationshipToMC: 'Hostile',
          status: 'alive'
        }
      ]
    });
    let updatedMemory: StoryMemory | undefined;

    render(<AkashaRecord memory={memory} onUpdateMemory={(next) => { updatedMemory = next; }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Daoists' }));
    fireEvent.click(screen.getAllByText('ALIVE')[0]);

    expect(updatedMemory?.characters.map((char) => char.status)).toEqual(['deceased', 'alive']);
  });

  it('keeps in-progress character drafts when switching tabs', () => {
    render(<AkashaRecord memory={createMemory()} onUpdateMemory={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Daoists' }));
    fireEvent.click(screen.getByText('Add Spirit'));
    fireEvent.change(screen.getByPlaceholderText('Daoist Name'), { target: { value: 'Ling Yue' } });

    fireEvent.click(screen.getByRole('button', { name: 'Laws' }));
    fireEvent.click(screen.getByRole('button', { name: 'Daoists' }));

    expect((screen.getByPlaceholderText('Daoist Name') as HTMLInputElement).value).toBe('Ling Yue');
  });

  it('uses explicit button types and Tailwind v4 hover opacity classes in add forms', () => {
    render(<AkashaRecord memory={createMemory()} onUpdateMemory={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Daoists' }));
    const addSpiritButton = screen.getByText('Add Spirit').closest('button');

    expect(addSpiritButton?.getAttribute('type')).toBe('button');

    fireEvent.click(addSpiritButton as HTMLButtonElement);

    expect(screen.getByText('Record Spirit').className).toContain('hover:bg-human/80');
  });
});
