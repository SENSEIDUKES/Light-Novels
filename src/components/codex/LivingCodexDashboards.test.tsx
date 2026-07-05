import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LivingCodexDashboards } from './LivingCodexDashboards';

const characters = [
  { id: 'char-1', name: 'Mei Lin', role: 'Ally, Disciple', description: 'Desc', relationshipToMC: 'Friend', status: 'alive' },
  { id: 'char-2', name: 'Raven Lord', role: 'Rival, Sect', description: 'Desc', relationshipToMC: 'Rival', status: 'alive' }
] as any;

const timelinesByCharacter: Record<string, any[]> = {
  'char-1': [
    { chapterNumber: 1, title: 'Lotus Oath', affinity: 12, eventSummary: 'Mei Lin shares spirit tea.', hasInteraction: true },
    { chapterNumber: 3, title: 'Jade Rescue', affinity: 48, eventSummary: 'Mei Lin is rescued at Jade Bridge.', hasInteraction: false }
  ],
  'char-2': [
    { chapterNumber: 2, title: 'Raven Ambush', affinity: -35, eventSummary: 'The Raven Lord springs an ambush.', hasInteraction: true },
    { chapterNumber: 4, title: 'Blood Vow', affinity: -72, eventSummary: 'The Raven Lord swears revenge.', hasInteraction: false }
  ]
};

const mockMemory = {
  characters,
  currentPowerStage: 'Foundation',
  powerSystem: '',
  worldRules: [],
  unresolvedPlotThreads: [],
  resolvedPlotThreads: []
} as any;

const mockStory = {
  id: 'test',
  title: 'test',
  genre: '',
  mcName: 'test',
  customPremise: '',
  createdAt: '',
  updatedAt: '',
  memory: mockMemory,
  arcs: [],
  currentChapterNumber: 1,
  karmaNodes: []
} as any;

function ControlledDashboards() {
  const [selectedChartCharId, setSelectedChartCharId] = React.useState('char-1');

  return (
    <LivingCodexDashboards
      memory={mockMemory}
      activeStory={mockStory}
      flatChapters={[{ chapterNumber: 1 }, { chapterNumber: 2 }, { chapterNumber: 3 }, { chapterNumber: 4 }]}
      charsToRender={characters}
      affinityTimelineOfChar={timelinesByCharacter[selectedChartCharId]}
      powerTimeline={[]}
      selectedChartCharId={selectedChartCharId}
      setSelectedChartCharId={setSelectedChartCharId}
    />
  );
}

function DashboardsWithInvalidInitialSelection() {
  const [selectedChartCharId, setSelectedChartCharId] = React.useState('archived-char');

  return (
    <LivingCodexDashboards
      memory={mockMemory}
      activeStory={mockStory}
      flatChapters={[{ chapterNumber: 1 }, { chapterNumber: 2 }, { chapterNumber: 3 }, { chapterNumber: 4 }]}
      charsToRender={characters}
      affinityTimelineOfChar={timelinesByCharacter[selectedChartCharId] || timelinesByCharacter['char-1']}
      powerTimeline={[]}
      selectedChartCharId={selectedChartCharId}
      setSelectedChartCharId={setSelectedChartCharId}
    />
  );
}

describe('LivingCodexDashboards', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <LivingCodexDashboards
        memory={mockMemory}
        activeStory={mockStory}
        flatChapters={[]}
        charsToRender={characters}
        affinityTimelineOfChar={[]}
        powerTimeline={[]}
        selectedChartCharId="char-1"
        setSelectedChartCharId={() => undefined}
      />
    );
    expect(container).toBeDefined();
  });

  it('updates displayed affinity chapter details when the selected character changes', () => {
    render(<ControlledDashboards />);

    expect(screen.getByText('Chapter 3: Jade Rescue')).toBeTruthy();
    expect(screen.getByText('Affinity: +48')).toBeTruthy();
    expect(screen.getByText('Mei Lin is rescued at Jade Bridge.')).toBeTruthy();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'char-2' } });

    expect(screen.getByText('Chapter 4: Blood Vow')).toBeTruthy();
    expect(screen.getByText('Affinity: -72')).toBeTruthy();
    expect(screen.getByText('The Raven Lord swears revenge.')).toBeTruthy();
  });

  it('falls back to the first renderable character when the selected character is unavailable', () => {
    render(<DashboardsWithInvalidInitialSelection />);

    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('char-1');
    expect(screen.getByText('Chapter 3: Jade Rescue')).toBeTruthy();
    expect(screen.getByText('Affinity: +48')).toBeTruthy();
  });

});
