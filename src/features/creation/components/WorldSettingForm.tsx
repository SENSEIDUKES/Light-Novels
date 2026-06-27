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
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="world-type-input">World Type</label>
          <input type="text" id="world-type-input" value={intake.worldType || ''} onChange={(e) => updateIntake('worldType', e.target.value)} placeholder="e.g., Ancient sect world, tower system..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="society-structure-input">Society Structure</label>
          <input type="text" id="society-structure-input" value={intake.societyStructure || ''} onChange={(e) => updateIntake('societyStructure', e.target.value)} placeholder="e.g., Sect-led, feudal, corporate..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="danger-level-input">Danger Level & Atmosphere</label>
          <input type="text" id="danger-level-input" value={intake.dangerLevel || ''} onChange={(e) => updateIntake('dangerLevel', e.target.value)} placeholder="e.g., Cutthroat, grimdark, mystical..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
        </div>
        <div className="md:col-span-2">
          <div className="flex justify-between items-end mb-2">
            <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest" htmlFor="starting-location-input">Starting Location (Detailed regional atmosphere)</label>
            <span className="text-[10px] font-mono text-neutral-500">{(intake.startingLocation || '').length} / 1200</span>
          </div>
          <p className="text-neutral-500 font-sans text-xs mb-3 leading-relaxed">
            Describe the geography, climate, and immediate atmosphere of the starting zone (e.g. outer sect labor quarry, freezing mortal mountain village).
          </p>
          <textarea 
            id="starting-location-input" 
            maxLength={1200}
            value={intake.startingLocation || ''} 
            onChange={(e) => updateIntake('startingLocation', e.target.value)} 
            rows={3} 
            placeholder="e.g., A sprawling outer sect labor quarry built inside a cavernous volcanic rift. The air is heavy with sulfur, and molten ore glows in the deep trenches. Direct supervision is enforced by ruthless whip-wielding overseers..." 
            className="w-full bg-neutral-950 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded p-3 text-sm resize-none" 
          />
        </div>
      </div>
    </FormSection>
  );
};
