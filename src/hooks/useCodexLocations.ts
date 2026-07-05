import { FormEvent, useState } from 'react';
import { Location, StoryMemory } from '../types';

interface UseCodexLocationsOptions {
  memory: StoryMemory;
  onUpdateMemory: (memory: StoryMemory) => void;
}

const blankLocation: Partial<Location> = { name: '', description: '', realm: '', safetyLevel: 'Safe' };

export function useCodexLocations({ memory, onUpdateMemory }: UseCodexLocationsOptions) {
  const [showAddLocationForm, setShowAddLocationForm] = useState(false);
  const [newLocation, setNewLocation] = useState<Partial<Location>>(blankLocation);

  const handleAddLocation = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!newLocation.name?.trim()) return;

    const currentLocations = memory.locations || [];
    const locationObj: Location = {
      id: `loc-${Date.now()}`,
      name: newLocation.name.trim(),
      description: newLocation.description?.trim() || '',
      realm: newLocation.realm?.trim() || undefined,
      safetyLevel: newLocation.safetyLevel || 'Safe',
    };

    onUpdateMemory({
      ...memory,
      locations: [...currentLocations, locationObj],
    });

    setNewLocation(blankLocation);
    setShowAddLocationForm(false);
  };

  return {
    showAddLocationForm,
    setShowAddLocationForm,
    newLocation,
    setNewLocation,
    handleAddLocation,
  };
}
