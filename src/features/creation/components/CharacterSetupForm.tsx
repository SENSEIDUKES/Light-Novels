import React from 'react';
import { Users } from 'lucide-react';
import { IntakeData } from '../../../types';
import { FormSection, FormSectionId } from './FormSection';

interface CharacterSetupFormProps {
  intake: IntakeData;
  updateIntake: (field: keyof IntakeData, value: any) => void;
  activeSection: FormSectionId;
  setActiveSection: (id: FormSectionId) => void;
}

export const CharacterSetupForm = ({ intake, updateIntake, activeSection, setActiveSection }: CharacterSetupFormProps) => {
  return (
    <FormSection id="mc" title="3. Main Character Setup" icon={<Users size={18} />} activeSection={activeSection} setActiveSection={setActiveSection}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Starting Identity</label>
          <input type="text" value={intake.startingIdentity || ''} onChange={(e) => updateIntake('startingIdentity', e.target.value)} placeholder="e.g., Crippled young master, modern transmigrator..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Personality & Alignment</label>
          <input type="text" value={intake.personality || ''} onChange={(e) => updateIntake('personality', e.target.value)} placeholder="e.g., Ruthless but protective, chaotic neutral..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Secret Advantage / Cheat</label>
          <input type="text" value={intake.secretAdvantage || ''} onChange={(e) => updateIntake('secretAdvantage', e.target.value)} placeholder="e.g., System interface, primeval bloodline..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2">Main Flaw / Starting Weakness</label>
          <input type="text" value={intake.startingWeakness || ''} onChange={(e) => updateIntake('startingWeakness', e.target.value)} placeholder="e.g., Destroyed meridians, demonic curse..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
        </div>
      </div>
    </FormSection>
  );
};
