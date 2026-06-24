import React from 'react';
import { Users } from 'lucide-react';
import { IntakeData } from '../../../types';
import { FormSection, FormSectionId } from './FormSection';

interface CustomCharactersFormProps {
  intake: IntakeData;
  updateIntake: (field: keyof IntakeData, value: any) => void;
  activeSection: FormSectionId;
  setActiveSection: (id: FormSectionId) => void;
}

export const CustomCharactersForm = ({ intake, updateIntake, activeSection, setActiveSection }: CustomCharactersFormProps) => {
  return (
    <FormSection id="characters" title="3.5. Character Intake (Optional)" icon={<Users size={18} />} activeSection={activeSection} setActiveSection={setActiveSection}>
      <div className="space-y-4">
        <p className="text-neutral-500 font-sans text-xs">
          Pre-define characters for your world. Include core traits or relationships to the main character. If left blank or partially filled, the AI will guess.
        </p>
        {intake.customCharacters?.map((char, index) => (
          <div key={char.id} className="border border-neutral-800 bg-neutral-950/50 p-4 rounded-lg space-y-3 relative">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-signal font-sc text-xs uppercase tracking-widest font-bold">Character {index + 1}</h4>
              <button type="button" onClick={() => {
                const newChars = [...(intake.customCharacters || [])];
                newChars.splice(index, 1);
                updateIntake('customCharacters', newChars);
              }} className="text-neutral-500 hover:text-human text-xs transition-colors font-sc uppercase tracking-widest">Remove</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-${labelCounter}">Name</label>
                <input type="text" value={char.name || ''} onChange={(e) => {
                  const newChars = [...(intake.customCharacters || [])];
                  newChars[index].name = e.target.value;
                  updateIntake('customCharacters', newChars);
                }} placeholder="e.g. Lin Yue" className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-${labelCounter}" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-${labelCounter}">Age</label>
                <input type="text" value={char.age || ''} onChange={(e) => {
                  const newChars = [...(intake.customCharacters || [])];
                  newChars[index].age = e.target.value;
                  updateIntake('customCharacters', newChars);
                }} placeholder="e.g. 18, Ancient..." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-${labelCounter}" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-${labelCounter}">Skin Tone</label>
                <input type="text" value={char.skinTone || ''} onChange={(e) => {
                  const newChars = [...(intake.customCharacters || [])];
                  newChars[index].skinTone = e.target.value;
                  updateIntake('customCharacters', newChars);
                }} placeholder="e.g. Pale, Olive..." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-${labelCounter}" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-${labelCounter}">Eye Color</label>
                <input type="text" value={char.eyeColor || ''} onChange={(e) => {
                  const newChars = [...(intake.customCharacters || [])];
                  newChars[index].eyeColor = e.target.value;
                  updateIntake('customCharacters', newChars);
                }} placeholder="e.g. Crimson, Blue..." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-${labelCounter}" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-${labelCounter}">Power Type</label>
                <input type="text" value={char.powerType || ''} onChange={(e) => {
                  const newChars = [...(intake.customCharacters || [])];
                  newChars[index].powerType = e.target.value;
                  updateIntake('customCharacters', newChars);
                }} placeholder="e.g. Frost Dao, Sword..." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-${labelCounter}" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-${labelCounter}">Rank / Level</label>
                <input type="text" value={char.rankLevel || ''} onChange={(e) => {
                  const newChars = [...(intake.customCharacters || [])];
                  newChars[index].rankLevel = e.target.value;
                  updateIntake('customCharacters', newChars);
                }} placeholder="e.g. Foundation Est." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-${labelCounter}" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-${labelCounter}">Role</label>
                <input type="text" value={char.role || ''} onChange={(e) => {
                  const newChars = [...(intake.customCharacters || [])];
                  newChars[index].role = e.target.value;
                  updateIntake('customCharacters', newChars);
                }} placeholder="e.g. Sect Elder, Rogue..." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-${labelCounter}" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-${labelCounter}">Connection to MC</label>
                <input type="text" value={char.connectionToMC || ''} onChange={(e) => {
                  const newChars = [...(intake.customCharacters || [])];
                  newChars[index].connectionToMC = e.target.value;
                  updateIntake('customCharacters', newChars);
                }} placeholder="e.g. Rival, Foe, Ally..." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-${labelCounter}" />
              </div>
            </div>
          </div>
        ))}
        {(!intake.customCharacters || intake.customCharacters.length < 8) && (
          <button
            type="button"
            onClick={() => {
              const newChars = [...(intake.customCharacters || []), { id: crypto.randomUUID(), name: '', age: '', skinTone: '', eyeColor: '', powerType: '', rankLevel: '', role: '', connectionToMC: '' }];
              updateIntake('customCharacters', newChars);
            }}
            className="w-full py-2 border border-dashed border-neutral-800 hover:border-[#04ACFF]/50 hover:bg-[#04ACFF]/5 text-neutral-400 hover:text-[#04ACFF] font-sc text-xs uppercase tracking-widest transition-all rounded"
          >
            + Add Character ({intake.customCharacters?.length || 0}/8)
          </button>
        )}
      </div>
    </FormSection>
  );
};
