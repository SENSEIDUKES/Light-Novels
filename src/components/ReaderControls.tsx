import React, { useState } from 'react';
import { Play, Pause, ArrowLeft, ArrowRight, Settings, ListMusic, Zap } from 'lucide-react';
import { Chapter } from '../types';

interface ReaderControlsProps {
  selectedChapter: Chapter;
  selectedChapterNum: number;
  maxChapterNum: number;
  navigatePrev: () => void;
  navigateNext: () => void;
  onSwitchTab?: (tab: "reader" | "codex" | "memory") => void;
  
  // Playback state
  isPlayingText: boolean;
  isPausedText: boolean;
  speechRate: number;
  setSpeechRate: React.Dispatch<React.SetStateAction<number>>;
  handleTogglePlayback: () => void;
  readerMode: string;
  
  // Voice Settings
  availableVoices: any[];
  selectedVoiceURI: string;
  setSelectedVoiceURI: (uri: string) => void;
  selectedDialogueVoiceURI: string;
  setSelectedDialogueVoiceURI: (uri: string) => void;
  selectedSideVoiceURI: string;
  setSelectedSideVoiceURI: (uri: string) => void;

  // Immersion Settings
  immersion: any;
  setImmersion: (settings: any) => void;
  handleExportText: () => void;
  handleAlterFate?: (chapterNum: number, direction: string, customPrompt?: string) => Promise<void>;
  setIsAlterFateOpen: (isOpen: boolean) => void;
}

export function ReaderControls({
  selectedChapter,
  selectedChapterNum,
  maxChapterNum,
  navigatePrev,
  navigateNext,
  onSwitchTab,
  isPlayingText,
  isPausedText,
  speechRate,
  setSpeechRate,
  handleTogglePlayback,
  readerMode,
  availableVoices,
  selectedVoiceURI,
  setSelectedVoiceURI,
  selectedDialogueVoiceURI,
  setSelectedDialogueVoiceURI,
  selectedSideVoiceURI,
  setSelectedSideVoiceURI,
  immersion,
  setImmersion,
  handleExportText,
  handleAlterFate,
  setIsAlterFateOpen
}: ReaderControlsProps) {
  const [showImmersionPopover, setShowImmersionPopover] = useState<boolean>(false);
  const [showVoiceDetail, setShowVoiceDetail] = useState<boolean>(false);

  const renderSettingsPopover = (isMobile: boolean) => (
    <div className={isMobile 
      ? "fixed bottom-24 left-4 right-4 max-h-[70vh] overflow-y-auto bg-black/95 backdrop-blur-md border border-neutral-850 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] p-4 z-50 text-sans text-left"
      : "absolute bottom-full mb-3 left-0 w-72 max-h-[70vh] overflow-y-auto bg-black/95 backdrop-blur-md border border-neutral-855 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] p-4 z-50 animate-fade-in font-sans text-left"}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-2 mb-3">
        <h4 className="text-[10px] uppercase font-sc text-portal tracking-wider font-bold">
          Immersion Control Matrix
        </h4>
        <span className="text-[8px] font-mono text-neutral-500">
          v2.1
        </span>
      </div>

      <div className="space-y-3.5">
        {/* Master Switch on Top */}
        <div className="flex items-center justify-between bg-neutral-950/85 p-2 rounded-lg border border-neutral-900">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-[#FAFAFA] font-sans">
              Immersion Engine
            </span>
            <span className="text-[9px] text-neutral-500 font-sans">
              Master consciousness coupling
            </span>
          </div>
          <button
            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setImmersion({ master: !immersion.master })}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              immersion.master ? "bg-portal/80 shadow-[0_0_8px_rgba(4,172,255,0.4)]" : "bg-neutral-850"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-void shadow transition duration-200 ease-in-out ${
                immersion.master ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
              }`}
            />
          </button>
        </div>

        {/* Sub-toggles */}
        <div className={`space-y-3 pl-1 transition-opacity duration-200 ${immersion.master ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          
          {/* Auto-scroll */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-neutral-300">
                Autonomous Reading
              </span>
              <span className="text-[8px] text-neutral-500">
                Pages follow reading playhead
              </span>
            </div>
            <button
              tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => immersion.master && setImmersion({ autoScroll: !immersion.autoScroll })}
              disabled={!immersion.master}
              className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                immersion.autoScroll ? "bg-portal/60" : "bg-neutral-850"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
                  immersion.autoScroll ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
                }`}
              />
            </button>
          </div>

          {/* Audio cues */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-neutral-300">
                Aetheric Sound Effects
              </span>
              <span className="text-[8px] text-neutral-500">
                Adaptive localized SFX cues
              </span>
            </div>
            <button
              tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => immersion.master && setImmersion({ audioCues: !immersion.audioCues })}
              disabled={!immersion.master}
              className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                immersion.audioCues ? "bg-portal/60" : "bg-neutral-850"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
                  immersion.audioCues ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
                }`}
              />
            </button>
          </div>

          {/* Image popups */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-neutral-300">
                Holographic Visions
              </span>
              <span className="text-[8px] text-neutral-500">
                Automatic scenic image pop-ups
              </span>
            </div>
            <button
              tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => immersion.master && setImmersion({ imagePopups: !immersion.imagePopups })}
              disabled={!immersion.master}
              className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                immersion.imagePopups ? "bg-portal/60" : "bg-neutral-850"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
                  immersion.imagePopups ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
                }`}
              />
            </button>
          </div>

          {/* Scene music */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-neutral-300">
                Scene Harmonics
              </span>
              <span className="text-[8px] text-neutral-500">
                Atmospheric musical tapestries
              </span>
            </div>
            <button
              tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => immersion.master && setImmersion({ sceneMusic: !immersion.sceneMusic })}
              disabled={!immersion.master}
              className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                immersion.sceneMusic ? "bg-portal/60" : "bg-neutral-850"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
                  immersion.sceneMusic ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
                }`}
              />
            </button>
          </div>
          
        </div>

        {/* Collapsible Voice Settings */}
        <div className="border-t border-neutral-900 pt-2 mt-1">
          <button
            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowVoiceDetail(!showVoiceDetail)}
            className="flex items-center justify-between w-full text-[9px] uppercase font-sc text-neutral-400 hover:text-signal transition-colors py-1 focus:outline-none"
          >
            <span>Voice Matrix Signature</span>
            <span className="text-[8px] font-mono">{showVoiceDetail ? "▲" : "▼"}</span>
          </button>
          
          {showVoiceDetail && (
            <div className="space-y-2 mt-2 animate-fade-in text-neutral-400">
              <div>
                <label className="block text-[8px] text-neutral-500 mb-1" htmlFor={`narrator-voice-${isMobile ? 'mobile' : 'desktop'}`}>
                  Narrator Voice
                </label>
                <select
                  id={`narrator-voice-${isMobile ? 'mobile' : 'desktop'}`}
                  value={selectedVoiceURI}
                  onChange={(e) => setSelectedVoiceURI(e.target.value)}
                  className="w-full bg-void border border-neutral-850 rounded text-[10px] p-1 focus:border-portal focus:outline-none"
                >
                  {availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-[8px] text-neutral-500 mb-1" htmlFor={`dialogue-voice-${isMobile ? 'mobile' : 'desktop'}`}>
                  Protagonist Voice
                </label>
                <select
                  id={`dialogue-voice-${isMobile ? 'mobile' : 'desktop'}`}
                  value={selectedDialogueVoiceURI}
                  onChange={(e) => setSelectedDialogueVoiceURI(e.target.value)}
                  className="w-full bg-void border border-neutral-850 rounded text-[10px] p-1 focus:border-portal focus:outline-none"
                >
                  {availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[8px] text-neutral-500 mb-1" htmlFor={`side-voice-${isMobile ? 'mobile' : 'desktop'}`}>
                  Side Character Voice
                </label>
                <select
                  id={`side-voice-${isMobile ? 'mobile' : 'desktop'}`}
                  value={selectedSideVoiceURI}
                  onChange={(e) => setSelectedSideVoiceURI(e.target.value)}
                  className="w-full bg-void border border-neutral-850 rounded text-[10px] p-1 focus:border-portal focus:outline-none"
                >
                  {availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        
        {/* Playback & Download Settings */}
        <div className="border-t border-neutral-900 pt-3 mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-neutral-300">
                Playback Speed
              </span>
              <span className="text-[8px] text-neutral-500">
                Adjust recitation rate
              </span>
            </div>
            <button
              onClick={() => setSpeechRate((prev) => (prev >= 2 ? 0.5 : prev + 0.5))}
              className="text-[10px] font-mono hover:text-signal bg-void border border-neutral-800 px-3 py-1.5 rounded text-neutral-400 focus:outline-none"
            >
              {speechRate.toFixed(1)}x
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-neutral-300">
                Export Chronicle
              </span>
              <span className="text-[8px] text-neutral-500">
                Download chapter as text
              </span>
            </div>
            <button
              onClick={handleExportText}
              className="text-[9px] font-sc uppercase hover:text-signal bg-void border border-neutral-800 px-3 py-1.5 rounded text-neutral-400 focus:outline-none"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-900 z-40 px-4 py-2 sm:py-3 pb-6 sm:pb-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="max-w-4xl mx-auto">
        {/* Mobile View: Ultra-sleek compact player navigation row */}
        <div className="flex sm:hidden items-center justify-between w-full">
           {/* Left: Settings & Codex */}
           <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowImmersionPopover(!showImmersionPopover)}
                  className={`p-2 border rounded-full transition-colors focus:outline-none ${showImmersionPopover ? "bg-neutral-800 border-neutral-700 text-signal" : "bg-void border-neutral-800 hover:text-signal hover:bg-neutral-900 text-neutral-400"}`}
                >
                  <Settings size={16} />
                </button>
                {showImmersionPopover && renderSettingsPopover(true)}
              </div>
              <button
                onClick={() => onSwitchTab && onSwitchTab("codex")}
                className="p-2 border border-neutral-800 rounded-full bg-void text-neutral-400 hover:text-portal transition-colors focus:outline-none"
                title="Codex"
              >
                <ListMusic size={16} />
              </button>
           </div>
           
           {/* Center: Play/Pause Vinyl Disc */}
           <div className="flex items-center justify-center relative shrink-0">
              <div className="relative group/disc flex items-center justify-center h-14 w-14 select-none animate-duration-[4000ms]">
                <div
                  className={`absolute inset-0 rounded-full border border-neutral-850 bg-[#000000] shadow-[0_0_20px_rgba(4,172,255,0.12)] transition-transform duration-[4000ms] ease-linear overflow-hidden ${
                    isPlayingText && !isPausedText
                      ? "animate-spin"
                      : "group-hover/disc:rotate-12"
                  }`}
                >
                  {/* High-fidelity vinyl ridges */}
                  <div className="absolute inset-[3px] rounded-full border border-dashed border-neutral-850/80" />
                  <div className="absolute inset-[6px] rounded-full border border-double border-neutral-900/60" />
                  <div className="absolute inset-[10px] rounded-full border border-neutral-900/40" />
                  <div className="absolute inset-[15px] rounded-full border border-dashed border-neutral-900/20" />

                  {/* Floating consciousness pulse tracks / laser sheen effect */}
                  {isPlayingText && !isPausedText ? (
                    <>
                      <div className="absolute top-0 bottom-0 left-[27px] w-[2px] bg-gradient-to-b from-transparent via-[#04ACFF]/50 to-transparent rotate-45 transform origin-center" />
                      <div className="absolute top-0 bottom-0 left-[27px] w-[2px] bg-gradient-to-b from-transparent via-[#8B0000]/50 to-transparent -rotate-45 transform origin-center" />
                      <div className="absolute inset-[12px] rounded-full border-2 border-portal/20 animate-pulse" />
                    </>
                  ) : (
                    <div className="absolute top-0 bottom-0 left-[27px] w-[2px] bg-gradient-to-b from-transparent via-neutral-700/40 to-transparent rotate-30 transform origin-center" />
                  )}
                </div>

                {/* Central audio touch Core key */}
                <button
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleTogglePlayback}
                  disabled={!(selectedChapter.generatedContent || (selectedChapter.blocks && selectedChapter.blocks.length > 0))}
                  className={`absolute h-8 w-8 rounded-full flex items-center justify-center transition-all z-10 focus:outline-none ${
                    !(selectedChapter.generatedContent || (selectedChapter.blocks && selectedChapter.blocks.length > 0))
                      ? "bg-neutral-900 text-neutral-600 border border-neutral-800"
                      : isPlayingText && !isPausedText
                        ? "bg-[#8B0000] text-[#FAFAFA] border border-[#FAFAFA]/20 shadow-[0_0_12px_rgba(139,0,0,0.8)] hover:scale-105"
                        : "bg-[#04ACFF] text-[#000000] border border-[#FAFAFA]/10 shadow-[0_0_12px_rgba(4,172,255,0.8)] hover:scale-105"
                  }`}
                  title={
                    isPlayingText && !isPausedText
                      ? "Stop Audio Playback"
                      : "Begin Rhythmic Recitation"
                  }
                >
                  {isPlayingText && !isPausedText ? (
                    <Pause
                      size={12}
                      fill="currentColor"
                      className="text-[#FAFAFA]"
                    />
                  ) : (
                    <Play
                      size={12}
                      fill="currentColor"
                      className="ml-0.5 text-[#000000]"
                    />
                  )}
                </button>
              </div>
           </div>

           {/* Right: Alter Fate & Chapter Nav */}
           <div className="flex items-center gap-1.5">
              {handleAlterFate && (
                <button
                  onClick={() => setIsAlterFateOpen(true)}
                  className="p-2 border border-portal/60 text-portal font-sc font-bold rounded-full hover:bg-portal hover:text-void transition-colors shadow-[0_0_10px_rgba(4,172,255,0.15)] shrink-0 focus:outline-none"
                  title="Alter Fate (Branch)"
                >
                  <Zap size={16} />
                </button>
              )}
              <div className="flex items-center bg-void border border-neutral-800 rounded-full shrink-0">
                 <button onClick={navigatePrev} disabled={selectedChapterNum <= 1} className="p-2 text-neutral-400 disabled:opacity-20 hover:text-signal rounded-l-full focus:outline-none"> <ArrowLeft size={16}/> </button>
                 <span className="text-[10px] font-mono text-neutral-400 select-none px-0.5">{selectedChapterNum}/{maxChapterNum}</span>
                 <button onClick={navigateNext} disabled={selectedChapterNum === maxChapterNum} className="p-2 text-neutral-400 disabled:opacity-20 hover:text-signal rounded-r-full focus:outline-none"> <ArrowRight size={16}/> </button>
              </div>
           </div>
        </div>

        {/* Desktop View (Hidden on Mobile) */}
        <div className="hidden sm:flex flex-row items-center justify-between gap-4">
          {/* TTS Audio Controls */}
          <div className="flex items-center space-x-4">
            {/* Desktop Cosmic Vinyl/Reciter Disk */}
            <div className="relative group/disc flex items-center justify-center h-16 w-16 select-none shrink-0 animate-duration-[4000ms]">
              <div
                className={`absolute inset-0 rounded-full border border-neutral-850 bg-[#000000] shadow-[0_0_20px_rgba(4,172,255,0.1)] transition-transform duration-[4000ms] ease-linear overflow-hidden ${
                  isPlayingText && !isPausedText
                    ? "animate-spin"
                    : "group-hover/disc:rotate-12"
                }`}
              >
                {/* Concentric sound record grooves */}
                <div className="absolute inset-1.5 rounded-full border border-dashed border-neutral-900/60" />
                <div className="absolute inset-3 rounded-full border border-double border-neutral-900/40" />
                <div className="absolute inset-4.5 rounded-full border border-neutral-900/20" />

                {/* Floating consciousness pulse tracks */}
                {isPlayingText && !isPausedText && (
                  <>
                    <div className="absolute top-[4px] left-[26px] right-[26px] h-[1.5px] bg-[#04ACFF]/30 animate-pulse" />
                    <div className="absolute bottom-[4px] left-[26px] right-[26px] h-[1.5px] bg-[#8B0000]/30 animate-pulse [animation-delay:200ms]" />
                    <div className="absolute left-[4px] top-[26px] bottom-[26px] w-[1.5px] bg-[#04ACFF]/30 animate-pulse [animation-delay:400ms]" />
                    <div className="absolute right-[4px] top-[26px] bottom-[26px] w-[1.5px] bg-[#8B0000]/30 animate-pulse [animation-delay:600ms]" />
                  </>
                )}
              </div>

              {/* Central audio touch Core key */}
              <button
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleTogglePlayback}
                disabled={!(selectedChapter.generatedContent || (selectedChapter.blocks && selectedChapter.blocks.length > 0))}
                className={`absolute h-10 w-10 rounded-full flex items-center justify-center transition-all z-10 focus:outline-none ${
                  !(selectedChapter.generatedContent || (selectedChapter.blocks && selectedChapter.blocks.length > 0))
                    ? "bg-neutral-900 text-neutral-600 border border-neutral-800 shadow-none"
                    : isPlayingText && !isPausedText
                      ? "bg-[#8B0000] text-[#FAFAFA] border border-[#fafafa]/25 shadow-[0_0_15px_rgba(139,0,0,0.6)] hover:scale-105"
                      : "bg-[#04ACFF] text-[#000000] border border-[#fafafa]/15 shadow-[0_0_15px_rgba(4,172,255,0.6)] hover:scale-105"
                }`}
                title={
                  isPlayingText && !isPausedText
                    ? "Stop Audio Playback"
                    : "Begin Rhythmic Recitation"
                }
              >
                {isPlayingText && !isPausedText ? (
                  <Pause
                    size={15}
                    fill="currentColor"
                    className="text-[#FAFAFA]"
                  />
                ) : (
                  <Play
                    size={15}
                    fill="currentColor"
                    className="ml-0.5 text-[#000000]"
                  />
                )}
              </button>
            </div>
            
            {/* Title & Info */}
            <div>
              <p className="font-sc font-bold text-signal text-[10px] tracking-widest uppercase flex items-center gap-1.5">
                <span>
                  {isPlayingText && !isPausedText
                    ? "Rhythmic Recitation Active"
                    : "Listen to Chapter"}
                </span>
                {readerMode === 'basic-tts' && isPlayingText && (
                  <span className="text-[7.5px] uppercase font-mono tracking-wider text-[#000000] bg-portal px-1 rounded font-bold">
                    Basic Narration
                  </span>
                )}
              </p>
              <p className="font-sans text-[10px] text-neutral-500">
                Chapter {selectedChapterNum}
              </p>
            </div>
            
            {/* Settings Toggle */}
            <div className="relative ml-2">
              <button
                onClick={() => setShowImmersionPopover(!showImmersionPopover)}
                className={`p-2 border rounded-full transition-colors focus:outline-none ${showImmersionPopover ? "bg-neutral-800 border-neutral-700 text-signal" : "bg-void border-neutral-800 hover:text-signal hover:bg-neutral-900 text-neutral-400"}`}
              >
                <Settings size={16} />
              </button>
              {showImmersionPopover && renderSettingsPopover(false)}
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-4 w-full sm:w-auto mt-4 sm:mt-0">
            {/* Quick Access Lore Action Links */}
            <div className="flex items-center space-x-2 sm:space-x-4 bg-void border border-neutral-900 rounded-full px-2 py-1">
              <button
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={navigatePrev}
                disabled={selectedChapterNum <= 1}
                className="px-2 sm:px-3 py-1.5 flex items-center space-x-1.5 text-neutral-400 hover:text-portal disabled:opacity-25 disabled:pointer-events-none transition-colors text-[9px] sm:text-[10px] font-sc uppercase tracking-wider font-semibold focus:outline-none"
              >
                <ArrowLeft size={14} />
                <span className="hidden sm:inline">Previous Chapter</span>
                <span className="sm:hidden">Prev</span>
              </button>
              <div className="w-[1px] h-4 bg-neutral-800"></div>
              <button
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => onSwitchTab && onSwitchTab("codex")}
                className="px-2 sm:px-3 py-1.5 flex items-center space-x-1.5 text-neutral-400 hover:text-portal transition-colors text-[9px] sm:text-[10px] font-sc uppercase tracking-wider focus:outline-none"
              >
                <ListMusic size={14} />
                <span className="hidden sm:inline">Codex</span>
              </button>
              <div className="w-[1px] h-4 bg-neutral-800"></div>
              <button
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={navigateNext}
                disabled={selectedChapterNum === maxChapterNum}
                className="px-2 sm:px-3 py-1.5 flex items-center space-x-1.5 text-neutral-400 hover:text-human disabled:opacity-25 disabled:pointer-events-none transition-colors text-[9px] sm:text-[10px] font-sc uppercase tracking-wider font-semibold focus:outline-none"
              >
                <span className="hidden sm:inline">Next Chapter</span>
                <span className="sm:hidden">Next</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {handleAlterFate && (
              <button
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setIsAlterFateOpen(true)}
                className="px-4 py-2 border border-portal text-portal font-sc font-bold uppercase tracking-wider text-[10px] rounded-full hover:bg-portal hover:text-void transition-colors flex items-center gap-2 shadow-[0_0_10px_rgba(4,172,255,0.15)] shrink-0 focus:outline-none"
              >
                <Zap size={14} />
                <span className="hidden sm:inline">Alter Fate (Branch)</span>
                <span className="sm:hidden">Alter Fate</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
