import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Upload } from 'lucide-react';
import { StorySeedPayload, WorldBlueprint } from '../../../types';
import { parseStorySeedJson } from '../../../lib/storySeedFormat';

interface ImportPanelProps {
  show: boolean;
  onClose: () => void;
  onImport: (payloads: StorySeedPayload[]) => Promise<void>;
}

const parseBlueprintData = (inputText: string): WorldBlueprint | null => {
  const text = inputText.trim();
  if (!text) return null;

  try {
    let jsonText = text;
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonText = text.substring(firstBrace, lastBrace + 1);
    }
    const data = JSON.parse(jsonText);
    if (data && typeof data === 'object') {
      return {
        title: data.title || data.novelTitle || 'Imported World',
        logline: data.logline || data.corePremise || '',
        worldOverview: data.worldOverview || data.worldType || '',
        startingLocation: data.startingLocation || '',
        societyStructure: data.societyStructure || '',
        powerSystemOutline: data.powerSystemOutline || data.startingPowerConcept || '',
        mcProfile: data.mcProfile || data.startingIdentity || '',
        majorFactions: Array.isArray(data.majorFactions) ? data.majorFactions : [],
        initialCharacters: Array.isArray(data.initialCharacters) ? data.initialCharacters : [],
        majorMysteries: Array.isArray(data.majorMysteries) ? data.majorMysteries : [],
        firstArcPromise: data.firstArcPromise || '',
        tropeRules: data.tropeRules || '',
        styleBible: data.styleBible || '',
        destinedEnding: data.destinedEnding || '',
        estimatedArcs: data.estimatedArcs || 10,
        unresolvedPlotThreads: Array.isArray(data.unresolvedPlotThreads) ? data.unresolvedPlotThreads : [],
      };
    }
  } catch {
    // Treat as Markdown if JSON fails
  }

  const bp: WorldBlueprint = {
    title: '',
    logline: '',
    worldOverview: '',
    startingLocation: '',
    societyStructure: '',
    powerSystemOutline: '',
    mcProfile: '',
    majorFactions: [],
    initialCharacters: [],
    majorMysteries: [],
    firstArcPromise: '',
    tropeRules: '',
    styleBible: '',
    destinedEnding: '',
    estimatedArcs: 10,
    unresolvedPlotThreads: [],
  };

  const lines = text.split('\n');
  let currentSection: 'overview' | 'society' | 'power' | 'mc' | 'arc' | null = null;
  let isParsingFactions = false;
  
  const overviewLines: string[] = [];
  const societyLines: string[] = [];
  const factionsList: string[] = [];
  const powerLines: string[] = [];
  const mcLines: string[] = [];
  const arcLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentSection === 'overview') overviewLines.push('');
      else if (currentSection === 'society' && !isParsingFactions) societyLines.push('');
      else if (currentSection === 'power') powerLines.push('');
      else if (currentSection === 'mc') mcLines.push('');
      else if (currentSection === 'arc') arcLines.push('');
      continue;
    }

    if (trimmed.startsWith('# ')) {
      bp.title = trimmed.substring(2).trim();
      currentSection = null;
      continue;
    }

    if (trimmed.toLowerCase().startsWith('**logline**:') || trimmed.toLowerCase().startsWith('**logline:**')) {
      const parts = trimmed.split(':');
      bp.logline = parts.slice(1).join(':').trim();
      currentSection = null;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      const heading = trimmed.substring(3).trim().toLowerCase();
      isParsingFactions = false;
      if (heading.includes('overview')) {
        currentSection = 'overview';
      } else if (heading.includes('society') || heading.includes('faction') || heading.includes('structure')) {
        currentSection = 'society';
      } else if (heading.includes('power')) {
        currentSection = 'power';
      } else if (heading.includes('character') || heading.includes('mc') || heading.includes('profile')) {
        currentSection = 'mc';
      } else if (heading.includes('arc') || heading.includes('promise')) {
        currentSection = 'arc';
      } else {
        currentSection = null;
      }
      continue;
    }

    if (currentSection === 'society') {
      if (trimmed.startsWith('### ') && (trimmed.toLowerCase().includes('faction') || trimmed.toLowerCase().includes('major faction'))) {
        isParsingFactions = true;
        continue;
      }
    }

    if (currentSection === 'overview') {
      overviewLines.push(line);
    } else if (currentSection === 'society') {
      if (isParsingFactions) {
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          factionsList.push(trimmed.substring(2).trim());
        } else if (trimmed.startsWith('1. ') || trimmed.startsWith('2. ') || trimmed.startsWith('3. ') || trimmed.startsWith('4. ') || trimmed.startsWith('5. ')) {
          factionsList.push(trimmed.substring(3).trim());
        } else {
          factionsList.push(trimmed);
        }
      } else {
        societyLines.push(line);
      }
    } else if (currentSection === 'power') {
      powerLines.push(line);
    } else if (currentSection === 'mc') {
      mcLines.push(line);
    } else if (currentSection === 'arc') {
      arcLines.push(line);
    }
  }

  bp.worldOverview = overviewLines.join('\n').trim();
  bp.societyStructure = societyLines.join('\n').trim();
  bp.majorFactions = factionsList.map(f => f.trim()).filter(Boolean);
  bp.powerSystemOutline = powerLines.join('\n').trim();
  bp.mcProfile = mcLines.join('\n').trim();
  bp.firstArcPromise = arcLines.join('\n').trim();

  if (bp.title || bp.worldOverview || bp.powerSystemOutline || bp.mcProfile) {
    if (!bp.title) bp.title = 'Imported World';
    return bp;
  }

  return null;
};

export const ImportPanel = ({ show, onClose, onImport }: ImportPanelProps) => {
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const completeImport = async (payloads: StorySeedPayload[]) => {
    setIsImporting(true);
    setImportError(null);
    try {
      await onImport(payloads);
      setImportText('');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'The seed could not be added to your account.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!importText.trim()) {
      setImportError('Please paste some seed data first.');
      return;
    }

    const trimmed = importText.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        await completeImport(parseStorySeedJson(trimmed));
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'The pasted seed JSON is invalid.');
      }
      return;
    }

    const parsedBlueprint = parseBlueprintData(importText);
    if (!parsedBlueprint) {
      setImportError('Unable to align past records. Use a story seed JSON file or the copied blueprint Markdown format.');
      return;
    }
    await completeImport([{ intake: {}, blueprint: parsedBlueprint }]);
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      await completeImport(parseStorySeedJson(await file.text()));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'The selected seed file is invalid.');
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-8 p-6 rounded-lg bg-neutral-950 border border-portal/30 space-y-4 max-w-2xl mx-auto shadow-[0_0_25px_rgba(4,172,255,0.08)] overflow-hidden"
        >
          <div className="flex justify-between items-center pb-2 border-b border-neutral-900">
            <h3 className="font-sc font-bold uppercase tracking-widest text-[#FAFAFA] text-xs flex items-center space-x-2">
              <Layers size={14} className="text-portal" />
              <span>Import Seed or Blueprint Data</span>
            </h3>
            <button
              type="button"
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={onClose}
              className="text-neutral-500 hover:text-[#FAFAFA] text-xs"
            >
              Close
            </button>
          </div>
          
          <p className="text-neutral-400 font-sans text-xs leading-relaxed">
            Import a portable seed JSON file, or paste copied World Blueprint Markdown. Imported seeds receive new private IDs in your account.
          </p>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-portal/40 bg-portal/5 px-4 py-3 font-sc text-[10px] font-bold uppercase tracking-widest text-portal transition-colors hover:border-portal hover:bg-portal/10">
            <Upload size={14} />
            Choose Seed JSON File
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleFileImport}
              disabled={isImporting}
              className="sr-only"
            />
          </label>

          <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest text-neutral-700">
            <span className="h-px flex-1 bg-neutral-900" />
            Or paste legacy blueprint data
            <span className="h-px flex-1 bg-neutral-900" />
          </div>

          <textarea
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportError(null);
            }}
            rows={6}
            placeholder={`Paste portable seed JSON or copied World Blueprint Markdown here...\n\ne.g.\n# Great Immortal Temple\n**Logline**: A regression tale...`}
            className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-sans text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
          />

          {importError && (
            <p className="text-xs text-human font-sans font-medium">{importError}</p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleImportSubmit}
              disabled={isImporting}
              className="font-sc px-5 py-2 rounded text-xs uppercase tracking-widest font-bold bg-human text-[#FAFAFA] hover:bg-neutral-900 hover:text-human border border-human transition-colors cursor-pointer"
            >
              {isImporting ? 'Saving Seed…' : 'Activate Seed'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
