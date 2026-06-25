import React, { useState, useEffect } from 'react';
import { Sliders } from 'lucide-react';

interface SearchableModelSelectorProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  provider: 'gemini' | 'openrouter' | 'ollama';
  route: 'storyMaker' | 'imageGenerator';
  presets: string[];
  dynamicModelsList: string[];
  isLoading: boolean;
  onRefresh: () => void;
  accentColorClass: string;
}

export const SearchableModelSelector: React.FC<SearchableModelSelectorProps> = ({
  label,
  value,
  onChange,
  provider,
  route,
  presets,
  dynamicModelsList,
  isLoading,
  onRefresh,
  accentColorClass
}) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const allAvailableModels = React.useMemo(() => {
    const list = [...presets];
    for (const m of dynamicModelsList) {
      if (m && !list.includes(m)) {
        list.push(m);
      }
    }
    return list;
  }, [presets, dynamicModelsList]);

  const filteredModels = React.useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return allAvailableModels;
    return allAvailableModels.filter(m => m.toLowerCase().includes(query));
  }, [search, allAvailableModels]);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const borderFocusClass = accentColorClass === 'portal' ? 'focus:border-portal' : 'focus:border-human';
  const textThemeClass = accentColorClass === 'portal' ? 'text-portal font-semibold' : 'text-human font-semibold';
  const bgBadgeClass = accentColorClass === 'portal' ? 'bg-portal/10 text-portal border-portal/30' : 'bg-human/10 text-human border-human/30';

  return (
    <div className="relative mt-2" ref={dropdownRef}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono text-neutral-400 capitalize">{label}</span>
        <div className="flex items-center space-x-2">
          {isLoading && <span className="text-[9px] font-mono text-neutral-500 animate-pulse">Syncing...</span>}
          <button
            type="button"
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={onRefresh}
            title="Refresh list of models from servers"
            className={`text-[9px] font-mono text-neutral-500 hover:${accentColorClass === 'portal' ? 'text-portal' : 'text-human'} transition-colors uppercase`}
          >
            [Sync]
          </button>
        </div>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder={`Type or select a model ID (e.g., ${presets[0] || 'gemini-1.5-flash'})`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && search.trim()) {
              onChange(search.trim());
              setIsOpen(false);
            }
          }}
          onBlur={() => {
            if (search.trim() && search.trim() !== value) {
               onChange(search.trim());
            }
          }}
          onFocus={() => setIsOpen(true)}
          className={`w-full bg-void text-xs text-neutral-300 border border-neutral-900 ${borderFocusClass} p-1.5 pr-8 rounded focus:outline-none font-mono placeholder:text-neutral-700`}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-1 text-neutral-600 hover:text-neutral-450 top-1/2 -translate-y-1/2 p-1 focus:outline-none"
        >
          <Sliders size={12} className={isOpen ? (accentColorClass === 'portal' ? 'text-portal' : 'text-human') : ''} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-neutral-950 border border-neutral-900 rounded shadow-2xl z-50 divide-y divide-neutral-900/40 select-none scrollbar-thin scrollbar-thumb-neutral-800">
          <div className="p-1 px-2 bg-black/60 sticky top-0 flex justify-between items-center z-10 border-b border-neutral-900">
            <span className="text-[9px] font-mono text-neutral-500 pl-1">
              {filteredModels.length} models of {provider.toUpperCase()}
            </span>
            <button
              type="button"
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setIsOpen(false)}
              className="text-[9px] font-mono text-neutral-500 hover:text-neutral-300 px-1"
            >
              [close]
            </button>
          </div>
          
          {search && search.trim() !== '' && !filteredModels.includes(search.trim()) && (
            <div
              onClick={() => {
                onChange(search.trim());
                setSearch(search.trim());
                setIsOpen(false);
              }}
              className="p-2 hover:bg-neutral-800 hover:text-[#FAFAFA] cursor-pointer font-mono text-[10px] text-portal flex items-center justify-between transition-colors bg-neutral-900" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (() => {
                                          onChange(search.trim());
                                          setSearch(search.trim());
                                          setIsOpen(false);
                                        })(); } }}
            >
              <span className="truncate pr-2 font-bold tracking-wide">Use custom: {search.trim()}</span>
              <span className={`text-[8px] bg-neutral-950 border ${bgBadgeClass} px-1 rounded font-sans shrink-0`}>CUSTOM</span>
            </div>
          )}

          {filteredModels.length === 0 ? (
            <div className="p-2.5 text-center text-[10px] font-mono text-neutral-600 italic">
              No matching model string found. Type your custom string above to use directly.
            </div>
          ) : (
            filteredModels.map((model) => {
              const isPreset = presets.includes(model);
              return (
                <div
                  key={model}
                  onClick={() => {
                    onChange(model);
                    setSearch(model);
                    setIsOpen(false);
                  }}
                  className={`p-2 hover:bg-neutral-900 hover:text-[#FAFAFA] cursor-pointer font-mono text-[10px] text-neutral-400 flex items-center justify-between transition-colors ${
                    value === model ? 'bg-neutral-900 text-signal font-semibold' : ''
                  }`} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (() => {
                                          onChange(model);
                                          setSearch(model);
                                          setIsOpen(false);
                                        })(); } }}
                >
                  <span className="truncate pr-2">{model}</span>
                  {isPreset ? (
                    <span className="text-[8px] bg-neutral-900/50 text-neutral-500 px-1 rounded font-sans shrink-0 border border-neutral-850">Preset</span>
                  ) : (
                    <span className={`text-[8px] border ${bgBadgeClass} px-1 rounded font-sans shrink-0`}>API</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
