import React, { createContext, useContext, ReactNode, useState, useMemo } from 'react';
import { StoryMemory, StoryArc, StoryWorld, MultiModelRouting } from '../../types';

interface CodexContextType {
  memory: StoryMemory;
  arcs: StoryArc[];
  activeStory: StoryWorld;
  mcName: string;
  routingConfig?: MultiModelRouting;
  onUpdateMemory: (updatedMemory: StoryMemory) => void;
  onUpdateStory: (updatedStory: StoryWorld) => void;
  pushNotification: (msg: string) => void;
  getPowerRankScore: (powerStr: string | undefined) => { score: number; title: string };
  handleAwakenCardImage: (id: string, type: 'character' | 'location' | 'artifact' | 'beast', entity: any) => Promise<void>;
  previews: Record<string, any>;
  setPreviews: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  generatingId: string | null;
  renderImageHistoryGallery: (entityId: string, type: 'character' | 'location' | 'artifact' | 'beast', imageHistory: any[] | undefined) => React.ReactNode;
}

const CodexContext = createContext<CodexContextType | undefined>(undefined);

export function useCodex() {
  const context = useContext(CodexContext);
  if (!context) {
    throw new Error('useCodex must be used within a CodexProvider');
  }
  return context;
}

export function CodexProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: CodexContextType;
}) {
  return <CodexContext.Provider value={value}>{children}</CodexContext.Provider>;
}
