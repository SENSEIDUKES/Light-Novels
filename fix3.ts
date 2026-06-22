import fs from 'fs';

let main = fs.readFileSync('src/components/LivingCodex.tsx', 'utf-8');

// Update LivingCodexCharacters props
main = main.replace(
  /<LivingCodexCharacters([\s\S]*?renderImageHistoryGallery={renderImageHistoryGallery})/m,
  "<LivingCodexCharacters$1\n            getPowerRankScore={getPowerRankScore}"
);

// Update LivingCodexRelations props
main = main.replace(
  /<LivingCodexRelations([\s\S]*?setSelectedNodeChar={setSelectedNodeChar})/m,
  "<LivingCodexRelations$1\n            mcName={mcName}\n            activeStory={activeStory}\n            bondSourceId={bondSourceId}\n            setBondSourceId={setBondSourceId}\n            bondTargetId={bondTargetId}\n            setBondTargetId={setBondTargetId}\n            bondAffinity={bondAffinity}\n            setBondAffinity={setBondAffinity}\n            bondDesc={bondDesc}\n            setBondDesc={setBondDesc}"
);

// Update LivingCodexPower props
main = main.replace(
  /<LivingCodexPower([\s\S]*?getPowerStageLevel={getPowerStageLevel})/m,
  "<LivingCodexPower$1\n            mcName={mcName}\n            getPowerRankScore={getPowerRankScore}\n            charsToRender={charsToRender}"
);

fs.writeFileSync('src/components/LivingCodex.tsx', main);
console.log("Updated main LivingCodex");
