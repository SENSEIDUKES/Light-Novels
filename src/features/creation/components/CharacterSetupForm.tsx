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
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="mc-starting-identity-input">Starting Identity</label>
          <input type="text" id="mc-starting-identity-input" value={intake.startingIdentity || ''} onChange={(e) => updateIntake('startingIdentity', e.target.value)} placeholder="e.g., Crippled young master, modern transmigrator..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="mc-personality-input">Personality & Alignment</label>
          <input type="text" id="mc-personality-input" value={intake.personality || ''} onChange={(e) => updateIntake('personality', e.target.value)} placeholder="e.g., Ruthless but protective, chaotic neutral..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="mc-secret-advantage-input">Secret Advantage / Cheat</label>
          <input type="text" id="mc-secret-advantage-input" value={intake.secretAdvantage || ''} onChange={(e) => updateIntake('secretAdvantage', e.target.value)} placeholder="e.g., System interface, primeval bloodline..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="mc-starting-weakness-input">Main Flaw / Starting Weakness</label>
          <input type="text" id="mc-starting-weakness-input" value={intake.startingWeakness || ''} onChange={(e) => updateIntake('startingWeakness', e.target.value)} placeholder="e.g., Destroyed meridians, demonic curse..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" />
        </div>
        <div className="col-span-1 md:col-span-2">
          <div className="flex justify-between items-end mb-2">
            <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest" htmlFor="mc-bio-input">Main Character Biography & Backstory</label>
            <span className="text-[10px] font-mono text-neutral-500">{(intake.mcBio || '').length} / 2000</span>
          </div>
          <p className="text-neutral-500 font-sans text-xs mb-3 leading-relaxed">
            Describe their backstory, personality quirks, hidden talents, major flaws, or specific fated ties. High-density characterization forces a highly customized narrative.
          </p>
          <textarea 
            id="mc-bio-input" 
            maxLength={2000}
            value={intake.mcBio || ''} 
            onChange={(e) => updateIntake('mcBio', e.target.value)} 
            rows={3} 
            placeholder="e.g., Born as the son of a fallen patriarch, carrying the blood of a Primordial dragon, extremely lazy but protective..." 
            className="w-full bg-neutral-950 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded p-3 text-sm resize-none" 
          />
        </div>
      </div>
    </FormSection>
  );
};
