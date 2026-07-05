import React from 'react';
import { Zap } from 'lucide-react';
import { IntakeData } from '../../../types';
import { FormSection, FormSectionId } from './FormSection';

interface PowerSystemFormProps {
  intake: IntakeData;
  updateIntake: (field: keyof IntakeData, value: any) => void;
  activeSection: FormSectionId;
  setActiveSection: (id: FormSectionId) => void;
}

export const PowerSystemForm = ({ intake, updateIntake, activeSection, setActiveSection }: PowerSystemFormProps) => {
  return (
    <FormSection id="power" title="4. Power System Seed" icon={<Zap size={18} />} activeSection={activeSection} setActiveSection={setActiveSection}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-itgsjgw">Starting Power Concept</label>
          <input type="text" value={intake.startingPowerConcept || ''} onChange={(e) => updateIntake('startingPowerConcept', e.target.value)} placeholder="e.g., Qi Condensation Tier 1, Feng Shui Level 1..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" id="a11y-control-itgsjgw" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-kytc0oh">Power Flavor</label>
          <input type="text" value={intake.powerFlavor || ''} onChange={(e) => updateIntake('powerFlavor', e.target.value)} placeholder="e.g., Martial arts, Daoist, Demonic, Sword..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" id="a11y-control-kytc0oh" />
        </div>
        <div className="md:col-span-2">
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-6rmg4xp">Known Ranks & Unique Path</label>
          <textarea value={intake.knownRanks || ''} onChange={(e) => updateIntake('knownRanks', e.target.value)} rows={2} placeholder="Optional. If partial, AI will extrapolate a full wuxia/xianxia ladder." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2 resize-none" id="a11y-control-6rmg4xp" />
        </div>
      </div>
    </FormSection>
  );
};
