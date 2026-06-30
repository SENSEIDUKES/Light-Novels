import { Story } from '../../types';

export const runContinuityPass = async (
  finalRawBlocksStr: string,
  activeStory: Story,
  routingConfig: any,
  apiHeaders: any
) => {
  let hasContinuityFaults = false;
  let continuityWarnings: any[] = [];
  let currentRawBlocksStr = finalRawBlocksStr;
  
  try {
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
      
      if (warnings.length > 0) {
        console.log("Continuity Guard detected issues during generation:", warnings);
        
        console.log("Attempting Continuity Repair...");
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
