import { StoryMemory } from '../../types';

/** Requests and consumes the existing repair-chapter SSE stream. */
export const repairChapterStream = async (
  chapterText: string,
  memory: StoryMemory,
  warnings: string[],
  routingConfig: any,
  apiHeaders: any
): Promise<string> => {
  const repairResponse = await fetch('/api/repair-chapter-stream', {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({
      chapterText,
      memory,
      warnings,
      routingConfig,
    }),
  });

  if (!repairResponse.ok || !repairResponse.body) {
    return '';
  }

  const reader = repairResponse.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let repairRaw = '';
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const parsed = JSON.parse(line.substring(6));
          if (parsed.chunk) {
            repairRaw += parsed.chunk;
          }
        } catch (e) {}
      }
    }
  }

  return repairRaw;
};
