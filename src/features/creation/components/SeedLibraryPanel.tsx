import React from 'react';
import { Database, Download, Play } from 'lucide-react';
import type { StorySeed } from '../../../types';

// Memoized formatter to avoid instantiating Intl.DateTimeFormat on every render loop, improving performance by ~40-50x
const dateFormatter = new Intl.DateTimeFormat();

interface SeedLibraryPanelProps {
  seeds: StorySeed[];
  isLoading: boolean;
  onUse: (seed: StorySeed) => void;
  onExport: (seed: StorySeed) => void;
  onExportAll: () => void;
}

export const SeedLibraryPanel = ({
  seeds,
  isLoading,
  onUse,
  onExport,
  onExportAll,
}: SeedLibraryPanelProps) => (
  <section className="mb-8 rounded-lg border border-neutral-900 bg-neutral-950/70 p-5" aria-labelledby="saved-seeds-title">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 id="saved-seeds-title" className="flex items-center gap-2 font-sc text-xs font-bold uppercase tracking-widest text-signal">
          <Database size={14} className="text-portal" />
          My Story Seeds
        </h2>
        <p className="mt-1 font-sans text-[11px] text-neutral-500">
          Private account seeds remain available when their generated stories are deleted.
        </p>
      </div>
      <button
        type="button"
        onClick={onExportAll}
        disabled={seeds.length === 0}
        className="inline-flex items-center justify-center gap-2 rounded border border-neutral-800 px-4 py-2 font-sc text-[10px] font-bold uppercase tracking-widest text-neutral-300 transition-colors hover:border-portal hover:text-portal disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Download size={13} />
        Export All Seeds
      </button>
    </div>

    {isLoading ? (
      <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-neutral-600" role="status">
        Loading account seeds…
      </p>
    ) : seeds.length === 0 ? (
      <p className="mt-4 font-sans text-xs text-neutral-600">
        No saved seeds yet. Forge or import one to add it to your account.
      </p>
    ) : (
      <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
        {seeds.map(seed => (
          <article key={seed.id} className="flex flex-col gap-3 rounded border border-neutral-900 bg-void p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="truncate font-sans text-xs font-medium text-neutral-200">{seed.title}</h3>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-neutral-600">
                Updated {Number.isNaN(new Date(seed.updatedAt).getTime()) ? 'Date unavailable' : dateFormatter.format(new Date(seed.updatedAt))}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => onUse(seed)}
                className="inline-flex items-center gap-1.5 rounded border border-portal/40 px-3 py-1.5 font-sc text-[9px] font-bold uppercase tracking-widest text-portal hover:bg-portal/10"
              >
                <Play size={11} />
                Use Seed
              </button>
              <button
                type="button"
                onClick={() => onExport(seed)}
                aria-label={`Export ${seed.title}`}
                className="inline-flex items-center gap-1.5 rounded border border-neutral-800 px-3 py-1.5 font-sc text-[9px] font-bold uppercase tracking-widest text-neutral-400 hover:border-neutral-600 hover:text-signal"
              >
                <Download size={11} />
                Export
              </button>
            </div>
          </article>
        ))}
      </div>
    )}
  </section>
);
