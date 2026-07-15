import React from 'react';
import { useCodex } from './CodexContext';

interface LivingCodexImageGalleryProps {
  entityId: string;
  type: 'character' | 'location' | 'artifact' | 'beast';
  imageHistory: Array<{
    id: string;
    imageUrl: string;
    chapterNumber?: number | null;
    promptUsed?: string;
  }> | undefined;
}

export function LivingCodexImageGallery({
  entityId,
  type,
  imageHistory,
}: LivingCodexImageGalleryProps) {
  const { handleRevertImage } = useCodex();

  if (!imageHistory || imageHistory.length <= 1) return null;

  return (
    <div className="flex space-x-1 overflow-x-auto p-1.5 bg-neutral-950/80 custom-scrollbar border-b border-neutral-900 absolute top-0 w-full z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      {imageHistory.map((img) => (
        <div 
          key={img.id} 
          className="relative flex-shrink-0 w-8 h-8 rounded-sm overflow-hidden border border-neutral-800 cursor-pointer hover:border-portal transition-colors shadow-lg" 
          onClick={() => handleRevertImage(entityId, type, img.imageUrl)}
          title={`Generated at Chapter ${img.chapterNumber || 'Unknown'}\nPrompt: ${img.promptUsed}`} 
          role="button" 
          aria-label={`Revert to image generated at Chapter ${img.chapterNumber || 'Unknown'}. Prompt: ${img.promptUsed}`}
          tabIndex={0} 
          onKeyDown={(e) => { 
            if (e.key === 'Enter' || e.key === ' ') { 
              e.preventDefault(); 
              handleRevertImage(entityId, type, img.imageUrl); 
            } 
          }}
        >
          <img src={img.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
        </div>
      ))}
    </div>
  );
}
