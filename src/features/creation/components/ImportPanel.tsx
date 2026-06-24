import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers } from 'lucide-react';
import { WorldBlueprint } from '../../../types';

interface ImportPanelProps {
  show: boolean;
  onClose: () => void;
  onImport: (blueprint: WorldBlueprint) => void;
}

export const parseBlueprintData = (inputText: string): WorldBlueprint | null => {
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
  } catch (e) {
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

  const handleImportSubmit = () => {
    if (!importText.trim()) {
      setImportError('Please paste some seed data first.');
      return;
    }

    const parsed = parseBlueprintData(importText);
    if (parsed) {
      onImport(parsed);
      setImportText('');
      setImportError(null);
    } else {
      setImportError('Unable to align past records. Ensure headings match the copied blueprint format, or standard JSON representation.');
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
              onClick={onClose}
              className="text-neutral-500 hover:text-[#FAFAFA] text-xs"
            >
              Close
            </button>
          </div>
          
          <p className="text-neutral-400 font-sans text-xs leading-relaxed">
            Paste your copied World Blueprint Markdown (copied via "Copy Blueprint") or the raw JSON config below. We will parse the fields and load you directly into the blueprint stage.
          </p>

          <textarea
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportError(null);
            }}
            rows={6}
            placeholder={`Paste copied World Blueprint details (Markdown) or JSON here...\n\ne.g.\n# Great Immortal Temple\n**Logline**: A regression tale...`}
            className="w-full bg-void border border-neutral-900 focus:border-portal text-neutral-300 font-sans text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-portal/20 transition-all"
          />

          {importError && (
            <p className="text-xs text-human font-sans font-medium">{importError}</p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleImportSubmit}
              className="font-sc px-5 py-2 rounded text-xs uppercase tracking-widest font-bold bg-human text-[#FAFAFA] hover:bg-neutral-900 hover:text-human border border-human transition-colors cursor-pointer"
            >
              Activate Seed
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
