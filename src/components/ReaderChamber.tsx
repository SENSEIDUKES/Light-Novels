import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ReaderChamberBase from './ReaderChamberBase';
import { ReaderVignetteOverlay } from './ReaderVignetteOverlay';

const LEGACY_VIGNETTE_SELECTOR = '#reader-chamber-root > .pointer-events-none.absolute.inset-0.z-10';

type ReaderChamberProps = React.ComponentProps<typeof ReaderChamberBase>;

export default function ReaderChamber(props: ReaderChamberProps) {
  const [readerRoot, setReaderRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setReaderRoot(document.getElementById('reader-chamber-root'));
  }, [props.activeStory.id, props.selectedChapterNum]);

  const preferences = props.activeStory.readerPreferences;

  return (
    <>
      <style>{`${LEGACY_VIGNETTE_SELECTOR} { display: none; }`}</style>
      <ReaderChamberBase {...props} />
      {readerRoot
        ? createPortal(
            <ReaderVignetteOverlay
              style={preferences?.vignetteStyle}
              theme={preferences?.themeOverride}
            />,
            readerRoot,
          )
        : null}
    </>
  );
}
