import React from 'react';
import { Target, ShieldAlert } from 'lucide-react';
import { IntakeData } from '../../../types';
import { FormSection, FormSectionId } from './FormSection';

interface PlotControlFormProps {
  intake: IntakeData;
  updateIntake: (field: keyof IntakeData, value: any) => void;
  activeSection: FormSectionId;
  setActiveSection: (id: FormSectionId) => void;
}

export const PlotControlForm = ({ intake, updateIntake, activeSection, setActiveSection }: PlotControlFormProps) => {
  const handleFatePressureChange = (pressure: 'Relaxed' | 'Balanced' | 'Hardcore' | 'Dao Master') => {
    updateIntake('fatePressure', pressure);
    updateIntake('hardcoreFateMode', pressure === 'Hardcore' || pressure === 'Dao Master');
  };

  return (
    <FormSection id="plot" title="5. Plot & Trope Control" icon={<Target size={18} />} activeSection={activeSection} setActiveSection={setActiveSection}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
         <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-${labelCounter}">Face-Slapping</label>
          <select value={intake.faceSlappingLevel || ''} onChange={e => updateIntake('faceSlappingLevel', e.target.value)} className="w-full bg-void border border-neutral-800 text-signal text-sm rounded px-2 py-1.5 focus:outline-none" id="a11y-control-${labelCounter}">
            <option value="">AI Default</option><option value="High">High</option><option value="Moderate">Moderate</option><option value="Low">Low</option>
          </select>
        </div>
         <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-${labelCounter}">Romance / Harem</label>
          <select value={intake.romanceLevel || ''} onChange={e => updateIntake('romanceLevel', e.target.value)} className="w-full bg-void border border-neutral-800 text-signal text-sm rounded px-2 py-1.5 focus:outline-none" id="a11y-control-${labelCounter}">
            <option value="">AI Default</option><option value="None">None</option><option value="Single">Single Heroine/Hero</option><option value="Harem">Harem</option>
          </select>
        </div>
         <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-${labelCounter}">Pacing</label>
          <select value={intake.powerPace || ''} onChange={e => updateIntake('powerPace', e.target.value)} className="w-full bg-void border border-neutral-800 text-signal text-sm rounded px-2 py-1.5 focus:outline-none" id="a11y-control-${labelCounter}">
            <option value="">AI Default</option><option value="Fast">Fast</option><option value="Balanced">Balanced</option><option value="Slow">Slow</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-${labelCounter}">Long-term Goal</label>
          <input type="text" value={intake.longTermGoal || ''} onChange={(e) => updateIntake('longTermGoal', e.target.value)} placeholder="e.g., Shatter the heavens..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" id="a11y-control-${labelCounter}" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-${labelCounter}">First Major Conflict</label>
          <input type="text" value={intake.firstMajorConflict || ''} onChange={(e) => updateIntake('firstMajorConflict', e.target.value)} placeholder="e.g., Sect tournament, survival trial..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" id="a11y-control-${labelCounter}" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-${labelCounter}">Things to Avoid</label>
          <input type="text" value={intake.thingsToAvoid || ''} onChange={(e) => updateIntake('thingsToAvoid', e.target.value)} placeholder="e.g., No young masters, no system cheat..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" id="a11y-control-${labelCounter}" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-${labelCounter}">Must Include Elements</label>
          <input type="text" value={intake.mustIncludeElements || ''} onChange={(e) => updateIntake('mustIncludeElements', e.target.value)} placeholder="e.g., Auction arc, pill refinement..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" id="a11y-control-${labelCounter}" />
        </div>
      </div>
      <div className="pt-4 mt-4 border-t border-neutral-900/60">
        <span className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2 flex items-center space-x-2">
          <ShieldAlert size={14} className="text-human" />
          <span>Fate Pressure (Difficulty)</span>
        </span>
        <p className="text-neutral-500 font-sans text-xs mb-3">Determines how actively the world tries to kill the main character or derail their goals. High pressure increases tragedy and betrayal risk.</p>
        <div className="flex flex-wrap gap-2">
          {(['Relaxed', 'Balanced', 'Hardcore', 'Dao Master'] as const).map(level => (
            <button
              key={level}
              type="button"
              onClick={() => handleFatePressureChange(level)}
              className={`px-4 py-2 rounded text-xs font-sc uppercase tracking-widest font-bold transition-all ${
                intake.fatePressure === level
                  ? level === 'Dao Master' || level === 'Hardcore'
                    ? 'bg-human text-signal border-human shadow-[0_0_10px_rgba(139,0,0,0.4)]'
                    : 'bg-portal text-void border-portal shadow-[0_0_10px_rgba(4,172,255,0.4)]'
                  : 'bg-void text-neutral-500 border border-neutral-800 hover:border-neutral-600'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
    </FormSection>
  );
};
