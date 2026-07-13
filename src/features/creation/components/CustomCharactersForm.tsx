import React from 'react';
import { Users } from 'lucide-react';
import { IntakeData } from '../../../types';
import { normalizeCodexAliases, parseCodexAliases } from '../../../lib/codexContext';
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
              <button type="button"  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                const newChars = [...(intake.customCharacters || [])];
                newChars.splice(index, 1);
                updateIntake('customCharacters', newChars);
              }} className="text-neutral-500 hover:text-human text-xs transition-colors font-sc uppercase tracking-widest">Remove</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-boqy7nd">Name</label>
                <input type="text" value={char.name || ''} onChange={(e) => {
                  const newChars = [...(intake.customCharacters || [])];
                  newChars[index].name = e.target.value;
                  updateIntake('customCharacters', newChars);
                }} placeholder="e.g. Lin Yue" className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-boqy7nd" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-d46u9ft">Age</label>
                <input type="text" value={char.age || ''} onChange={(e) => {
                  const newChars = [...(intake.customCharacters || [])];
                  newChars[index].age = e.target.value;
                  updateIntake('customCharacters', newChars);
                }} placeholder="e.g. 18, Ancient..." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-d46u9ft" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-do4p8xt">Skin Tone</label>
                <input type="text" value={char.skinTone || ''} onChange={(e) => {
                  const newChars = [...(intake.customCharacters || [])];
                  newChars[index].skinTone = e.target.value;
                  updateIntake('customCharacters', newChars);
                }} placeholder="e.g. Pale, Olive..." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-do4p8xt" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-6rltp1u">Eye Color</label>
                <input type="text" value={char.eyeColor || ''} onChange={(e) => {
                  const newChars = [...(intake.customCharacters || [])];
                  newChars[index].eyeColor = e.target.value;
                  updateIntake('customCharacters', newChars);
                }} placeholder="e.g. Crimson, Blue..." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-6rltp1u" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-92o8irp">Power Type</label>
                <input type="text" value={char.powerType || ''} onChange={(e) => {
                  const newChars = [...(intake.customCharacters || [])];
                  newChars[index].powerType = e.target.value;
                  updateIntake('customCharacters', newChars);
                }} placeholder="e.g. Frost Dao, Sword..." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-92o8irp" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-8msejsu">Rank / Level</label>
                <input type="text" value={char.rankLevel || ''} onChange={(e) => {
                  const newChars = [...(intake.customCharacters || [])];
                  newChars[index].rankLevel = e.target.value;
                  updateIntake('customCharacters', newChars);
                }} placeholder="e.g. Foundation Est." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-8msejsu" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-iupjvwi">Role</label>
                <input type="text" value={char.role || ''} onChange={(e) => {
                  const newChars = [...(intake.customCharacters || [])];
                  newChars[index].role = e.target.value;
                  updateIntake('customCharacters', newChars);
                }} placeholder="e.g. Sect Elder, Rogue..." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id="a11y-control-iupjvwi" />
              </div>
              <div>
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor={`mc-char-connection-${char.id}`}>Connection to MC</label>
                <input type="text" value={char.connectionToMC || ''} onChange={(e) => {
                  const newChars = [...(intake.customCharacters || [])];
                  newChars[index].connectionToMC = e.target.value;
                  updateIntake('customCharacters', newChars);
                }} placeholder="e.g. Rival, Foe, Ally..." className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors" id={`mc-char-connection-${char.id}`} />
              </div>
              <div className="col-span-1 sm:col-span-2 md:col-span-4">
                <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest mb-1" htmlFor={`char-aliases-${char.id}`}>Aliases / Known Titles</label>
                <textarea
                  key={`${char.id}-${normalizeCodexAliases(char.aliases, char.name).join('|')}`}
                  id={`char-aliases-${char.id}`}
                  rows={2}
                  defaultValue={normalizeCodexAliases(char.aliases, char.name).join(', ')}
                  onBlur={(e) => {
                    const aliases = parseCodexAliases(e.currentTarget.value, char.name);
                    e.currentTarget.value = aliases.join(', ');
                    const newChars = [...(intake.customCharacters || [])];
                    newChars[index] = { ...newChars[index], aliases };
                    updateIntake('customCharacters', newChars);
                  }}
                  placeholder="e.g. Sister Mei; Pavilion Mistress"
                  className="w-full resize-none bg-void border border-neutral-800 text-signal text-xs rounded px-2 py-1.5 focus:border-portal outline-none transition-colors"
                />
                <p className="mt-1 text-[9px] font-sans text-neutral-600">User-authored only. Separate names or titles with commas, semicolons, or new lines.</p>
              </div>
              <div className="col-span-1 sm:col-span-2 md:col-span-4">
                <div className="flex justify-between items-end mb-1">
                  <label className="block font-sc text-[10px] text-neutral-400 uppercase tracking-widest" htmlFor={`char-bio-${char.id}`}>Biography & Traits</label>
                  <span className="text-[9px] font-mono text-neutral-500">{(char.bio || '').length} / 2000</span>
                </div>
                <textarea 
                  id={`char-bio-${char.id}`} 
                  value={char.bio || ''} 
                  onChange={(e) => {
                    const newChars = [...(intake.customCharacters || [])];
                    newChars[index] = { ...newChars[index], bio: e.target.value };
                    updateIntake('customCharacters', newChars);
                  }} 
                  maxLength={2000} 
                  rows={2} 
                  placeholder="Vivid biography, personality quirks, hidden talents, major flaws, or specific fated actions..." 
                  className="w-full bg-void border border-neutral-800 text-signal text-xs rounded px-3 py-2 focus:border-portal outline-none transition-colors resize-none" 
                />
              </div>
            </div>
          </div>
        ))}
        {(!intake.customCharacters || intake.customCharacters.length < 8) && (
          <button
            type="button"
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
              const newChars = [...(intake.customCharacters || []), { id: crypto.randomUUID(), name: '', aliases: [], age: '', skinTone: '', eyeColor: '', powerType: '', rankLevel: '', role: '', connectionToMC: '', bio: '' }];
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
