import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStoryExporter } from './useStoryExporter';
import { Story } from '../types';

describe('useStoryExporter', () => {
  it('should clean novelty formatting properly before export', () => {
    const { result } = renderHook(() => useStoryExporter());
    const exporter = result.current;
    
    // Since `cleanNovelProse` is internal we can intercept document.createElement to check the result
    const createElementSpy = vi.spyOn(document, 'createElement');
    const mockAnchor = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      remove: vi.fn()
    };
    // @ts-expect-error - mock anchor
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
              generatedContent: `The hero enters [System Alert: Trap detected] and then fights.
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

  it('handleExportSingleStory test', async () => {
    const { result } = renderHook(() => useStoryExporter());
    const createElementSpy = vi.spyOn(document, 'createElement');
    const mockAnchor = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      remove: vi.fn()
    };
    // @ts-expect-error - mock anchor
    createElementSpy.mockReturnValue(mockAnchor);
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null);

    await act(async () => {
      await result.current.handleExportSingleStory({
        id: '123',
        title: 'Story single export',
        genre: 'test',
        mcName: 'test',
        customPremise: 'test',
        createdAt: '123',
        updatedAt: '123',
        currentChapterNumber: 1,
        memory: {} as any,
        arcs: []
      });
    });

    expect(mockAnchor.setAttribute).toHaveBeenCalledWith('download', 'story_world_story_single_export.json');
    createElementSpy.mockRestore();
    appendSpy.mockRestore();
  });

  it('handleExportEPUB test', async () => {
    const { result } = renderHook(() => useStoryExporter());
    const createElementSpy = vi.spyOn(document, 'createElement');
    const mockAnchor = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      remove: vi.fn()
    };
    // @ts-expect-error - mock anchor
    createElementSpy.mockReturnValue(mockAnchor);
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null);

    window.URL.createObjectURL = vi.fn().mockImplementation(() => 'mock-url');
    window.URL.revokeObjectURL = vi.fn();

    await act(async () => {
      await result.current.handleExportEPUB({
        id: '123',
        title: 'Story EPUB',
        genre: 'test',
        mcName: 'test',
        customPremise: 'test',
        createdAt: '123',
        updatedAt: '123',
        currentChapterNumber: 1,
        memory: {} as any,
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
                generatedContent: 'Test epub format.',
              }
            ]
          }
        ]
      });
    });

    expect(mockAnchor.setAttribute).toHaveBeenCalledWith('download', 'TOME_story_epub.epub');
    createElementSpy.mockRestore();
    appendSpy.mockRestore();
  });
});
