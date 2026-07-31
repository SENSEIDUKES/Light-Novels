import { Story } from '../types';

const DEV_PREVIEW_STORY: Story = {
  id: 'dev-preview-story',
  title: 'The Placeholder Observatory',
  genre: 'Development Preview',
  mcName: 'The Temporary Reader',
  customPremise: 'A tiny local-only story used to preview the Library and Reader Chamber.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  currentChapterNumber: 1,
  fatePressure: 'Balanced',
  memory: {
    powerSystem: 'Placeholder resonance',
    currentPowerStage: 'First observation',
    worldRules: ['This story exists only for development previews.'],
    characters: [],
    unresolvedPlotThreads: [],
    resolvedPlotThreads: [],
  },
  arcs: [
    {
      title: 'Preview Arc',
      isCompleted: false,
      chapters: [
        {
          number: 1,
          title: 'A Door Made of Light',
          premise: 'The reader opens the temporary observatory.',
          status: 'read',
          hasContent: true,
          generatedContent: [
            'The observatory was only a room, but its ceiling held an entire sky.',
            'The Temporary Reader stepped inside and found a small brass dial waiting on the table. It pointed nowhere, which felt like an invitation.',
            '[Preview complete: the real Reader Chamber is active.]',
          ].join('\n\n'),
          summary: 'The Temporary Reader opens the placeholder observatory.',
        },
        {
          number: 2,
          title: 'The Unwritten Hallway',
          premise: 'The observatory leads toward the next preview chapter.',
          status: 'unread',
        },
      ],
    },
  ],
};

/** Returns a fresh copy so the temporary preview cannot mutate the module fixture. */
export function getDevPreviewStory(): Story {
  const now = new Date().toISOString();
  return {
    ...structuredClone(DEV_PREVIEW_STORY),
    createdAt: now,
    updatedAt: now,
  };
}
