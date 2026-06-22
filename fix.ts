import fs from 'fs';

let chars = fs.readFileSync('src/components/codex/LivingCodexCharacters.tsx', 'utf-8');
chars = chars.replace(/locsToRender/g, 'locationsToRender');
fs.writeFileSync('src/components/codex/LivingCodexCharacters.tsx', chars);
