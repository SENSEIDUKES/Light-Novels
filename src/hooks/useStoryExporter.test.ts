import { describe, it, expect, vi } from 'vitest';
import { useStoryExporter } from './useStoryExporter';
import { Story } from '../types';

describe('useStoryExporter', () => {
  it('should clean novelty formatting properly before export', () => {
    const exporter = useStoryExporter();
    
    // We access the internal cleanNovelProse by testing the html generated via handleExportFullTome briefly, 
    // but since that triggers click(), let's just directly export the logic if we could, 
    // or test the cleaner wrapper:
    
    // Since `cleanNovelProse` is internal we can intercept document.createElement to check the result
    const createElementSpy = vi.spyOn(document, 'createElement');
    const mockAnchor = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      remove: vi.fn()
    };
    // @ts-expect-error - Mock anchor object doesn't implement all HTMLAnchorElement properties but is sufficient for the spy test
    createElementSpy.mockReturnValue(mockAnchor);
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null);

    const testStory: Story = {
      id: 'test',
      title: 'Tome of Tests',
      genre: '',
      mcName: '',
      customPremise: '',
      createdAt: '',
      updatedAt: '',
      currentChapterNumber: 1,
      memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] },
      arcs: [
        {
          title: 'Arc 1',
          isCompleted: false,
          chapters: [
            {
              number: 1,
              title: 'C1',
              premise: '',
              status: 'unread',
              hasContent: true,
              generatedContent: `The hero enters \\[System Alert: Trap detected\\] and then fights.
[Audio: dramatic.mp3]
Suddenly!
{"statsChangeMessage": "Gain 10 EXP"}`
            }
          ]
        }
      ]
    };

    exporter.handleExportFullTome(testStory);

    expect(mockAnchor.setAttribute).toHaveBeenCalledWith('download', 'TOME_tome_of_tests.html');

    // Extract the encoded data payload
    const hrefCall = mockAnchor.setAttribute.mock.calls.find(call => call[0] === 'href');
    const encodedPayload = hrefCall![1];
    
    const decodedHtml = decodeURIComponent(encodedPayload.split(',')[1]);
    
    // Hidden tags and JSON output should be stripped
    expect(decodedHtml).toContain('The hero enters  and then fights.');
    expect(decodedHtml).toContain('Suddenly!');
    expect(decodedHtml).not.toContain('[System Alert: Trap detected]');
    expect(decodedHtml).not.toContain('[Audio: dramatic.mp3]');
    expect(decodedHtml).not.toContain('{"statsChangeMessage"');

    createElementSpy.mockRestore();
    appendSpy.mockRestore();
  });
});
