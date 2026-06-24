import React from 'react';
import { Sparkles } from 'lucide-react';
import { IntakeData } from '../../../types';
import { FormSection, FormSectionId } from './FormSection';

interface MakeItWorkFormProps {
  intake: IntakeData;
  updateIntake: (field: keyof IntakeData, value: any) => void;
  activeSection: FormSectionId;
  setActiveSection: (id: FormSectionId) => void;
}

export const MakeItWorkForm = ({ intake, updateIntake, activeSection, setActiveSection }: MakeItWorkFormProps) => {
  return (
    <FormSection id="makeitwork" title="6. Make It Work" icon={<Sparkles size={18} />} activeSection={activeSection} setActiveSection={setActiveSection}>
      <p className="text-neutral-500 font-sans text-xs">
        Are your ideas completely contradictory? (e.g. A pacifist monk who constantly slaughters sects). Provide an instruction here to tell the AI <em>how</em> to logically weave your conflicting seeds together.
      </p>
      <textarea
        value={intake.makeItWorkInstruction || ''}
        onChange={(e) => updateIntake('makeItWorkInstruction', e.target.value)}
        rows={3}
        placeholder="e.g., Explain the pacifist monk's slaughter by having his master's soul temporarily take over his body during extreme emotional distress..."
        className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2 resize-none focus:border-portal outline-none"
      />
    </FormSection>
  );
};
