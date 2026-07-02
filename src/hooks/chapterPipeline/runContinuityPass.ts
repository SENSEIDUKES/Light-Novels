import { Story } from '../../types';

export type ContinuityPhase = 'checking' | 'repairing';

/**
 * Runs the Continuity Guard entirely BEHIND the generation veil, before the chapter is
 * ever revealed to the reader. The flow is: check -> (silent repair) -> re-check.
 *
 * By design this is SILENT: transient over-flags are quietly repaired away and never shown.
 * The only thing that can ever surface to the reader (`hasContinuityFaults`) is a SEVERE
 * warning that survives a full repair pass — i.e. a genuine, most-extreme physical
 * impossibility. Everything else is logged to the console and the chapter is revealed as-is.
 *
 * @param onProgress optional hook so the veil can show "Verifying continuity..." /
 *   "Reconciling the timeline..." while this runs.
 */
export const runContinuityPass = async (
  finalRawBlocksStr: string,
  activeStory: Story,
  routingConfig: any,
  apiHeaders: any,
  onProgress?: (phase: ContinuityPhase) => void
) => {
  let hasContinuityFaults = false;
  let continuityWarnings: any[] = [];
  let currentRawBlocksStr = finalRawBlocksStr;

  try {
    onProgress?.('checking');
    const consistencyResponse = await fetch('/api/check-consistency', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({
        chapterText: currentRawBlocksStr,
        memory: activeStory.memory,
        routingConfig
      })
    });

    if (consistencyResponse.ok) {
      const consistencyData = await consistencyResponse.json();
      let warnings = consistencyData.warnings || [];
      const silentLogs = consistencyData.silentLogs || [];
      
      if (silentLogs.length > 0) {
        console.log("Continuity Guard found minor issues (silently logged):", silentLogs);
      }

      if (warnings.length > 0) {
        console.log("Continuity Guard detected SEVERE issues during generation:", warnings);

        console.log("Attempting Continuity Repair...");
        onProgress?.('repairing');
        const repairResponse = await fetch('/api/repair-chapter-stream', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({
            chapterText: currentRawBlocksStr,
            memory: activeStory.memory,
            warnings,
            routingConfig
          })
        });

        if (repairResponse.ok && repairResponse.body) {
          const reader = repairResponse.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let repairRaw = "";
          let buffer = "";

          while(true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || "";
            
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const parsed = JSON.parse(line.substring(6));
                  if (parsed.chunk) {
                    repairRaw += parsed.chunk;
                  }
                } catch(e) {}
              }
            }
          }
          
          if (repairRaw.length > 150) {
             currentRawBlocksStr = repairRaw;
             
             const recheckResponse = await fetch('/api/check-consistency', {
               method: 'POST',
               headers: apiHeaders,
               body: JSON.stringify({
                 chapterText: currentRawBlocksStr,
                 memory: activeStory.memory,
                 routingConfig
               })
             });
             
             if (recheckResponse.ok) {
                const recheckData = await recheckResponse.json();
                warnings = recheckData.warnings || [];
                const recheckSilentLogs = recheckData.silentLogs || [];
                if (recheckSilentLogs.length > 0) {
                  console.log("Continuity Guard found minor issues after repair (silently logged):", recheckSilentLogs);
                }
             } else {
                warnings = [];
             }
          }
        }
        
        if (warnings.length > 0) {
          console.log("Continuity Guard found issues even after repair:", warnings);
          hasContinuityFaults = true;
          continuityWarnings = warnings;
        } else {
          hasContinuityFaults = false;
          continuityWarnings = [];
        }
      }
    }
  } catch (err) {
    console.error("Continuity pass failed", err);
  }

  return { hasContinuityFaults, continuityWarnings, finalRawBlocksStr: currentRawBlocksStr };
};
