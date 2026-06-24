import React from 'react';
import { Layers } from 'lucide-react';
import { IntakeData } from '../../../types';
import { FormSection, FormSectionId } from './FormSection';

interface WorldSettingFormProps {
  intake: IntakeData;
  updateIntake: (field: keyof IntakeData, value: any) => void;
  activeSection: FormSectionId;
  setActiveSection: (id: FormSectionId) => void;
}

export const WorldSettingForm = ({ intake, updateIntake, activeSection, setActiveSection }: WorldSettingFormProps) => {
  return (
    <FormSection id="world" title="2. World Setting" icon={<Layers size={18} />} activeSection={activeSection} setActiveSection={setActiveSection}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-${labelCounter}">World Type</label>
          <input type="text" value={intake.worldType || ''} onChange={(e) => updateIntake('worldType', e.target.value)} placeholder="e.g., Ancient sect world, tower system..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" id="a11y-control-${labelCounter}" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-${labelCounter}">Starting Location</label>
          <input type="text" value={intake.startingLocation || ''} onChange={(e) => updateIntake('startingLocation', e.target.value)} placeholder="e.g., Outer sect labor camp, mortal city slum..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" id="a11y-control-${labelCounter}" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-${labelCounter}">Society Structure</label>
          <input type="text" value={intake.societyStructure || ''} onChange={(e) => updateIntake('societyStructure', e.target.value)} placeholder="e.g., Sect-led, feudal, corporate..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" id="a11y-control-${labelCounter}" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-${labelCounter}">Danger Level & Atmosphere</label>
          <input type="text" value={intake.dangerLevel || ''} onChange={(e) => updateIntake('dangerLevel', e.target.value)} placeholder="e.g., Cutthroat, grimdark, mystical..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" id="a11y-control-${labelCounter}" />
        </div>
      </div>
    </FormSection>
  );
};
