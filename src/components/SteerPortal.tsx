import React, { useState } from 'react';
import { 
  Sparkles, Compass, ShieldAlert, ArrowRight, Zap, 
  Heart, Skull, Flame, HelpCircle, GraduationCap, PlaneTakeoff 
} from 'lucide-react';
import { motion } from 'motion/react';

interface SteerPortalProps {
  onSteerArc: (direction: string, customPrompt: string) => Promise<void>;
  isSteering: boolean;
  currentArcIndex: number;
}

const STEERING_PRESETS = [
  {
    id: 'darker',
    name: 'Demonic Depths (Darker)',
    desc: 'Plot veers into blood cultivation, cold-hearted choices, ruthless betrayals, curse arts, and high-fatality cultivator standoffs.',
    icon: <Skull className="text-red-500 animate-pulse" size={24} />,
    color: 'hover:border-red-600/60 hover:shadow-red-950/20 shadow-lg'
  },
  {
    id: 'romance',
    name: 'Jade Companions (Romance)',
    desc: 'Deep double-cultivation bounds, complex emotional entanglements, protective oaths, rescuing partners from supreme celestial factions.',
    icon: <Heart className="text-pink-500" size={24} />,
    color: 'hover:border-pink-600/60 hover:shadow-pink-950/20 shadow-lg'
  },
  {
    id: 'action',
    name: 'Sect Warfare (More Action)',
    desc: 'Ancient battle arrays, territory sieges, high-energy clash of supreme sword arts, breaking grand city walls, of face-to-face mortal fights.',
    icon: <Flame className="text-orange-500" size={24} />,
    color: 'hover:border-orange-600/60 hover:shadow-orange-950/20 shadow-lg'
  },
  {
    id: 'twist',
    name: 'Cosmic Fate Shift (Random Twist)',
    desc: 'Predictable paths shatter. The LitRPG system undergoes a glitch; close friends reveal cosmic treasons; ancient celestial tombs open.',
    icon: <HelpCircle className="text-purple-500" size={24} />,
    color: 'hover:border-purple-600/60 hover:shadow-purple-950/20 shadow-lg'
  },
  {
    id: 'new location',
    name: 'Realm Ascension (New Location)',
    desc: 'Shatter the void boundary! Ascend to higher planets, celestial palaces, or deeper layers where rules change, resetting MC relative power scales.',
    icon: <PlaneTakeoff className="text-cyan-500" size={24} />,
    color: 'hover:border-cyan-600/60 hover:shadow-cyan-950/20 shadow-lg'
  },
  {
    id: 'continue',
    name: 'Alchemy Hermitage (Steady Paths)',
    desc: 'A slice of life cultivator approach. Steady pill refining, ward formation building, trading, and consolidation of inner spiritual roots.',
    icon: <GraduationCap className="text-green-500" size={24} />,
    color: 'hover:border-green-600/60 hover:shadow-green-950/20 shadow-lg'
  }
];

export default function SteerPortal({ onSteerArc, isSteering, currentArcIndex }: SteerPortalProps) {
  const [selectedPreset, setSelectedPreset] = useState('continue');
  const [customDirections, setCustomDirections] = useState('');

  const handleSteerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSteerArc(selectedPreset, customDirections.trim());
  };

  return (
    <div className="max-w-4xl mx-auto bg-void border border-neutral-900 rounded-lg p-6 sm:p-10 relative overflow-hidden" id="steer-portal-root">
      {/* Portal Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-portal/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-human/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="text-center mb-8 border-b border-neutral-950 pb-6">
        <span className="font-sc text-portal font-semibold tracking-[0.2em] text-xs block mb-1 uppercase">Shatter Volume Boundary</span>
        <h2 className="font-display font-bold text-signal text-3xl sm:text-4xl tracking-tight mb-2">
          The Great Steering Chamber
        </h2>
        <p className="text-neutral-400 font-sans text-xs max-w-xl mx-auto leading-relaxed">
          The currents of destiny have concluded this story arc. Assert your cosmic will as the sovereign architect to mandate where this serialized light novel matrix should ascend next.
        </p>
      </div>

      <form onSubmit={handleSteerSubmit} className="space-y-6">
        {/* Preset Selector Grid */}
        <div>
          <label className="block text-xs uppercase tracking-widest font-sc text-neutral-300 mb-4 font-semibold">
            Choose Destiny Template Accent
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="steer-preset-grid">
            {STEERING_PRESETS.map((preset) => {
              const active = preset.id === selectedPreset;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPreset(preset.id)}
                  disabled={isSteering}
                  className={`text-left p-4 rounded border bg-neutral-950 transition-all duration-300 relative ${preset.color} ${
                    active 
                      ? 'border-portal text-signal shadow-[0_0_15px_rgba(4,172,255,0.1)]' 
                      : 'border-neutral-900/60 text-neutral-400 opacity-70 hover:opacity-100 hover:border-neutral-800'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    {preset.icon}
                    <span className="font-sans font-medium text-sm text-signal">
                      {preset.name}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-neutral-400 font-sans font-light">
                    {preset.desc}
                  </p>
                  {active && (
                    <div className="absolute top-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-portal opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-portal"></span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Steering Inputs */}
        <div className="space-y-2">
          <label htmlFor="custom-steer-input" className="block text-xs uppercase tracking-widest font-sc text-neutral-300 font-semibold">
            Custom Divine Dictations (Optional)
          </label>
          <textarea
            id="custom-steer-input"
            rows={3}
            value={customDirections}
            onChange={(e) => setCustomDirections(e.target.value)}
            disabled={isSteering}
            placeholder="Add specific rules, character reappearances, or detailed settings (e.g., 'Introduce a sarcastic dragon pet who eats celestial stones, and reveal the MC's childhood rival is in the new sect as an elder disciple.')"
            className="w-full bg-neutral-950 border border-neutral-800 text-signal font-sans placeholder-neutral-600 focus:outline-none focus:border-portal rounded p-4 text-xs leading-relaxed transition-all resize-none"
          />
          <p className="text-[10px] text-neutral-500 font-sans font-light">
            These notes will be injected directly into the Gemini genesis engine as overriding narrative constants, adapting past memory seamlessly.
          </p>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-neutral-950 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-neutral-400 font-sans flex items-start space-x-2 max-w-sm">
            <ShieldAlert className="text-human flex-shrink-0 mt-0.5" size={14} />
            <span>
              Genesis results in exactly 10 new chapters starting in sequential order, continuing the MC's cultivation rank and living connections.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSteering}
            className={`w-full sm:w-auto font-sc px-6 py-3 rounded text-xs uppercase tracking-widest font-bold flex items-center justify-center space-x-2 transition-all ${
              isSteering
                ? 'bg-neutral-900 border border-neutral-850 text-neutral-500 cursor-not-allowed'
                : 'bg-human text-signal border border-human hover:bg-void hover:text-human hover:border-human shadow-[0_0_15px_rgba(139,0,0,0.3)]'
            }`}
          >
            {isSteering ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full"
                />
                <span>Ascending Realms...</span>
              </>
            ) : (
              <>
                <span>Unveil Next Chapter Arc</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
