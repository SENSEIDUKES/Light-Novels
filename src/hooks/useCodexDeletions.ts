import { StoryMemory, StoryWorld } from '../types';
import { useAppStore } from '../store/useAppStore';

export function useCodexDeletions(
  memory: StoryMemory,
  onUpdateMemory: (updatedMemory: StoryMemory) => void,
  activeStory: StoryWorld,
  onUpdateStory: (updatedStory: StoryWorld) => void
) {
  const handleDeleteFaction = (id: string) => {
    const currentFactions = memory.factions || [];
    onUpdateMemory({
      ...memory,
      factions: currentFactions.filter(f => f.id !== id)
    });
  };

  const handleDeleteArtifact = (id: string) => {
    const currentArtifacts = memory.artifacts || [];
    onUpdateMemory({
      ...memory,
      artifacts: currentArtifacts.filter(a => a.id !== id)
    });
  };

  const handleDeleteLocation = (id: string) => {
    const currentLocations = memory.locations || [];
    onUpdateMemory({
      ...memory,
      locations: currentLocations.filter(l => l.id !== id)
    });
  };

  const handleDeleteCustomRelationship = (bondId: string) => {
    const currentActiveStory = useAppStore.getState().stories.find(s => s.id === activeStory.id) || activeStory;
    onUpdateStory({
      ...currentActiveStory,
      relationships: (currentActiveStory.relationships || []).filter(b => b.id !== bondId)
    });
  };

  const handleDeleteFateNode = (fateId: string) => {
    const currentActiveStory = useAppStore.getState().stories.find(s => s.id === activeStory.id) || activeStory;
    onUpdateStory({
      ...currentActiveStory,
      karmaNodes: (currentActiveStory.karmaNodes || []).filter(n => n.id !== fateId)
    });
  };

  return {
    handleDeleteFaction,
    handleDeleteArtifact,
    handleDeleteLocation,
    handleDeleteCustomRelationship,
    handleDeleteFateNode
  };
}
