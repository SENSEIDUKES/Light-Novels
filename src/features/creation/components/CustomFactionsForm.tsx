import React from 'react';
import { Shield } from 'lucide-react';
import { IntakeData } from '../../../types';
import { FormSection, FormSectionId } from './FormSection';

interface CustomFactionsFormProps {
  intake: IntakeData;
  updateIntake: (field: keyof IntakeData, value: any) => void;
  activeSection: FormSectionId;
  setActiveSection: (id: FormSectionId) => void;
}

export const CustomFactionsForm = ({ intake, updateIntake, activeSection, setActiveSection }: CustomFactionsFormProps) => {
  return (
    <FormSection id="factions" title="3.8. Faction/Sect Intake (Optional)" icon={<Shield size={18} />} activeSection={activeSection} setActiveSection={setActiveSection}>
      <div className="space-y-4">
        <p className="text-neutral-500 font-sans text-xs">
          Pre-define factions or sects for your world. Include their alignment, power level, and connection to the main character.
        </p>
        {intake.customFactions?.map((faction, index) => (
          <div key={faction.id} className="border border-neutral-800 bg-neutral-950/50 p-4 rounded-lg space-y-3 relative">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-signal font-sc text-xs uppercase tracking-widest font-bold">Faction {index + 1}</h4>
              <button type="button"  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                const newFactions = [...(intake.customFactions || [])];
                newFactions.splice(index, 1);
                updateIntake('customFactions', newFactions);
              }} className="text-neutral-500 hover:text-human text-xs transition-colors font-sc uppercase tracking-widest">Remove</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-${labelCounter}">Name</label>
                <input type="text" value={faction.name || ''} onChange={(e) => {
                  const newFactions = [...(intake.customFactions || [])];
                  newFactions[index].name = e.target.value;
                  updateIntake('customFactions', newFactions);
                }} placeholder="e.g. Heavenly Sword Sect" className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-${labelCounter}" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-${labelCounter}">Role</label>
                <input type="text" value={faction.role || ''} onChange={(e) => {
                  const newFactions = [...(intake.customFactions || [])];
                  newFactions[index].role = e.target.value;
                  updateIntake('customFactions', newFactions);
                }} placeholder="e.g. Ruling Power, Assassin Guild..." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-${labelCounter}" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-${labelCounter}">Power Level</label>
                <input type="text" value={faction.powerLevel || ''} onChange={(e) => {
                  const newFactions = [...(intake.customFactions || [])];
                  newFactions[index].powerLevel = e.target.value;
                  updateIntake('customFactions', newFactions);
                }} placeholder="e.g. Mid Tier, Universal Force..." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-${labelCounter}" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-${labelCounter}">Alignment (Good/Bad)</label>
                <input type="text" value={faction.alignment || ''} onChange={(e) => {
                  const newFactions = [...(intake.customFactions || [])];
                  newFactions[index].alignment = e.target.value;
                  updateIntake('customFactions', newFactions);
                }} placeholder="e.g. Righteous, Demonic, Neutral..." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-${labelCounter}" />
              </div>
              <div className="md:col-span-2">
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-${labelCounter}">Connection to MC</label>
                <input type="text" value={faction.connectionToMC || ''} onChange={(e) => {
                  const newFactions = [...(intake.customFactions || [])];
                  newFactions[index].connectionToMC = e.target.value;
                  updateIntake('customFactions', newFactions);
                }} placeholder="e.g. MC's starting sect, Sworn enemies..." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-${labelCounter}" />
              </div>
            </div>
          </div>
        ))}
        {(!intake.customFactions || intake.customFactions.length < 5) && (
          <button
            type="button"
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
              const newFactions = [...(intake.customFactions || []), { id: crypto.randomUUID(), name: '', role: '', powerLevel: '', alignment: '', connectionToMC: '' }];
              updateIntake('customFactions', newFactions);
            }}
            className="w-full py-2 border border-dashed border-neutral-800 hover:border-[#04ACFF]/50 hover:bg-[#04ACFF]/5 text-neutral-400 hover:text-[#04ACFF] font-sc text-xs uppercase tracking-widest transition-all rounded"
          >
            + Add Faction ({intake.customFactions?.length || 0}/5)
          </button>
        )}
      </div>
    </FormSection>
  );
};
