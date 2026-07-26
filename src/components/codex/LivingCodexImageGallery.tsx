import React from 'react';
import { useCodex } from './CodexContext';
import { getMediaAsset } from '../../lib/media/mediaAssetClient';
import { resolveMediaAssetForDisplay } from '../../lib/media/privateMediaResolver';

interface LivingCodexImageGalleryProps {
  entityId: string;
  type: 'character' | 'location' | 'artifact' | 'beast';
  imageHistory: Array<{
    id: string;
    assetId?: string;
    imageUrl: string;
    chapterNumber?: number | null;
    promptUsed?: string;
  }> | undefined;
}

/**
 * Resolve the versions PostgreSQL deliberately hydrates without a URL.
 *
 * A story read only carries signed delivery URLs for the assets on the current
 * surface, so every superseded manifestation comes back with an empty
 * `imageUrl` and the version strip rendered as blank tiles. Their canonical
 * asset ids are durable, so fetch a fresh descriptor for each one on demand.
 */
function useHistoricalThumbnails(
  imageHistory: LivingCodexImageGalleryProps['imageHistory'],
): Record<string, string> {
  const [resolved, setResolved] = React.useState<Record<string, string>>({});
  const pending = (imageHistory ?? [])
    .filter(image => image.assetId && !image.imageUrl)
    .map(image => image.assetId as string);
  const pendingKey = pending.join(',');

  React.useEffect(() => {
    if (!pendingKey) return;
    let cancelled = false;
    void Promise.all(pendingKey.split(',').map(async (assetId) => {
      if (resolved[assetId]) return;
      try {
        const url = (await resolveMediaAssetForDisplay(await getMediaAsset(assetId))).url;
        if (!cancelled) setResolved(previous => ({ ...previous, [assetId]: url }));
      } catch (error) {
        console.warn(`Codex image version ${assetId} could not be resolved.`, error);
      }
    }));
    return () => { cancelled = true; };
    // `resolved` is read only to skip work already done; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKey]);

  return resolved;
}

export function LivingCodexImageGallery({
  entityId,
  type,
  imageHistory,
}: LivingCodexImageGalleryProps) {
  const { handleRevertImage } = useCodex();
  const resolvedThumbnails = useHistoricalThumbnails(imageHistory);

  if (!imageHistory || imageHistory.length <= 1) return null;

  return (
    <div className="flex space-x-1 overflow-x-auto p-1.5 bg-neutral-950/80 custom-scrollbar border-b border-neutral-900 absolute top-0 w-full z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      {imageHistory.map((img) => {
        const chapterLabel = img.chapterNumber || 'Unknown';
        const promptLabel = img.promptUsed
          ? `Prompt: ${img.promptUsed}`
          : 'Prompt unavailable';
        const thumbnail = img.imageUrl || (img.assetId ? resolvedThumbnails[img.assetId] : '') || '';

        return (
          <div
            key={img.id}
            className="relative flex-shrink-0 w-8 h-8 rounded-sm overflow-hidden border border-neutral-800 cursor-pointer hover:border-portal transition-colors shadow-lg"
            // Versions are addressed by their durable history id: the rendered
            // URL is blank for every superseded version, so matching on it
            // restored an arbitrary one.
            onClick={() => handleRevertImage(entityId, type, img.id)}
            title={`Generated at Chapter ${chapterLabel}\n${promptLabel}`}
            role="button"
            aria-label={`Revert to image generated at Chapter ${chapterLabel}. ${promptLabel}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleRevertImage(entityId, type, img.id);
              }
            }}
          >
            {thumbnail
              ? <img src={thumbnail} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
              : <div className="w-full h-full bg-neutral-900 animate-pulse" aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}
