import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle, Flame } from 'lucide-react';
import { FateResultData } from '../types';

interface FateResultCardProps {
  data: FateResultData;
}

export function FateResultCard({ data }: FateResultCardProps) {
  let themeColor = '';
  let Icon = Flame;

  switch (data.outcome) {
    case 'FATE AVERTED':
      themeColor = 'border-amber-500/50 text-amber-400 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]';
      Icon = CheckCircle;
      break;
    case 'FATE SCARRED':
      themeColor = 'border-orange-500/50 text-orange-400 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.2)]';
      Icon = AlertCircle;
      break;
    case 'DOOM MANIFESTED':
    default:
      themeColor = 'border-red-600/60 text-red-500 bg-red-950/40 shadow-[0_0_30px_rgba(220,38,38,0.3)] animate-pulse';
      Icon = Flame;
      break;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`my-12 mx-auto max-w-2xl p-6 border rounded-xl font-mono ${themeColor}`}
    >
      <div className="flex items-center justify-center space-x-3 mb-6">
        <Icon className="w-6 h-6 md:w-8 md:h-8" />
        <h2 className="text-lg md:text-2xl font-bold tracking-[0.2em] uppercase">
          FATE RESULT: {data.outcome}
        </h2>
        <Icon className="w-6 h-6 md:w-8 md:h-8" />
      </div>

      <div className="space-y-6 text-sm md:text-base">
        <div>
          <h3 className="uppercase tracking-widest opacity-70 mb-2">Timeline Scar</h3>
          <p className="font-semibold text-signal text-lg">{data.timelineScar}</p>
        </div>

        {data.permanentCosts && data.permanentCosts.length > 0 && (
          <div>
            <h3 className="uppercase tracking-widest opacity-70 mb-2">
              {data.outcome === 'FATE AVERTED' ? 'Permanent Cost' : 'Permanent Restrictions'}
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              {data.permanentCosts.map((cost, idx) => (
                <li key={idx}>{cost}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="uppercase tracking-widest opacity-70 mb-2">New Story State</h3>
            <p className="font-semibold text-portal">{data.newStoryState}</p>
          </div>

          <div>
            <h3 className="uppercase tracking-widest opacity-70 mb-2">Genre Shift</h3>
            <p className="font-semibold text-purple-400">{data.genreShift}</p>
          </div>
        </div>

        {data.newActiveStats && data.newActiveStats.length > 0 && (
          <div>
            <h3 className="uppercase tracking-widest opacity-70 mb-2">New Active Stats</h3>
            <div className="flex flex-wrap gap-2">
              {data.newActiveStats.map((stat, idx) => (
                <span key={idx} className="px-2 py-1 border border-inherit/30 rounded bg-black/40 text-xs tracking-wider">
                  {stat}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
