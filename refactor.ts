import fs from 'fs';

const file = 'src/components/ReaderChamber.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Replace Viewport
const viewportStart = content.indexOf('{/* READING VIEWPORT */}');
const controlsStart = content.indexOf('{/* BOTTOM AUDIO / PLAYER NAVIGATION BAR */}');

if (viewportStart !== -1 && controlsStart !== -1) {
  const replacementViewport = `{/* READING VIEWPORT */}
      <ReaderViewport
        readerRef={readerRef as any}
        driftInnerRef={driftInnerRef as any}
        isReaderFullscreen={isReaderFullscreen}
        handleTouchStart={handleTouchStart}
        handleTouchMove={handleTouchMove}
        handleTouchEnd={handleTouchEnd}
        handleTextClick={handleTextClick}
        handleViewportScroll={handleViewportScroll}
        isTranslating={isTranslating}
        selectedChapter={selectedChapter}
        preferredLang={preferredLang}
        activeTranslationContent={activeTranslationContent}
        showLegend={showLegend}
        isMuted={isMuted}
        readerMode={readerMode}
        currentPrefs={currentPrefs}
        handleWordClick={handleWordClick}
        activeChunks={activeChunks}
        currentChunkIndex={currentChunkIndex}
        activeEntity={activeEntity}
        setActiveEntity={setActiveEntity}
        hoveredEntity={hoveredEntity}
        setHoveredEntity={setHoveredEntity}
        codexTerms={codexTerms}
        handleEntityClick={handleEntityClick}
        handleManifestReveal={handleManifestReveal}
        generatingRevealId={generatingRevealId}
        stories={stories}
        activeStoryId={activeStoryId}
        saveStories={saveStories}
        routingConfig={routingConfig}
        hasSystemBlocks={hasSystemBlocks}
        isCheckingConsistency={isCheckingConsistency}
        handleSealClick={handleSealClick}
        navigateNext={navigateNext}
        selectedChapterNum={selectedChapterNum}
        maxChapterNum={maxChapterNum}
        isGenerating={isGenerating}
        handleGenerate={handleGenerate}
        activeAgentId={activeAgentId}
      />\n\n      `;
      
  content = content.substring(0, viewportStart) + replacementViewport + content.substring(controlsStart);
}

// Now replace Controls
const controlsStartNew = content.indexOf('{/* BOTTOM AUDIO / PLAYER NAVIGATION BAR */}');
const bookmarksStart = content.indexOf('{/* THE CHRONICLE ANCHORS (BOOKMARKS DRAW PANEL) */}');

if (controlsStartNew !== -1 && bookmarksStart !== -1) {
  const replacementControls = `<ReaderControls
        selectedChapter={selectedChapter}
        selectedChapterNum={selectedChapterNum}
        maxChapterNum={maxChapterNum}
        navigatePrev={navigatePrev}
        navigateNext={navigateNext}
        onSwitchTab={onSwitchTab}
        isPlayingText={isPlayingText}
        isPausedText={isPausedText}
        speechRate={speechRate}
        setSpeechRate={setSpeechRate}
        handleTogglePlayback={handleTogglePlayback}
        readerMode={readerMode}
        availableVoices={availableVoices}
        selectedVoiceURI={selectedVoiceURI}
        setSelectedVoiceURI={setSelectedVoiceURI}
        selectedDialogueVoiceURI={selectedDialogueVoiceURI}
        setSelectedDialogueVoiceURI={setSelectedDialogueVoiceURI}
        immersion={immersion}
        setImmersion={setImmersion}
        handleExportText={handleExportText}
        handleAlterFate={handleAlterFate}
        setIsAlterFateOpen={setIsAlterFateOpen}
      />\n\n      `;
      
  content = content.substring(0, controlsStartNew) + replacementControls + content.substring(bookmarksStart);
}

fs.writeFileSync(file, content);
console.log('Refactor complete');
