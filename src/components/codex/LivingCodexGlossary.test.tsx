import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LivingCodexGlossary } from './LivingCodexGlossary';

const mockMemory = {
  characters: [],
  currentPowerStage: 'Foundation',
  powerSystem: '',
  worldRules: [],
  unresolvedPlotThreads: [],
  resolvedPlotThreads: []
};

describe('LivingCodexGlossary', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <LivingCodexGlossary
        memory={mockMemory}
        arcs={[]}
        mcName="testMc"
      />
    );
    expect(container).toBeDefined();
  });

  it('does not render a duplicate custom glossary term returned by generation', async () => {
    localStorage.setItem('custom_glossary_testMc', JSON.stringify([
      {
        term: 'Moon Gate',
        category: 'Location',
        definition: 'A silver portal under the sect mountain.'
      }
    ]));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        terms: [
          {
            term: '  moon gate  ',
            category: 'Location',
            definition: 'A duplicate silver portal entry.'
          }
        ]
      })
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <LivingCodexGlossary
        memory={mockMemory}
        arcs={[]}
        mcName="testMc"
      />
    );

    await screen.findByText('Moon Gate');

    fireEvent.click(screen.getByRole('button', { name: /channel story lore/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/generate-custom-glossary',
      expect.objectContaining({ method: 'POST' })
    ));

    await waitFor(() => expect(screen.getAllByText('Moon Gate')).toHaveLength(1));
    expect(screen.queryByText('  moon gate  ')).toBeNull();
  });
});
