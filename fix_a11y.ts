import * as fs from 'fs';
import * as path from 'path';

function processFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Add aria-label to <button> containing only icons or no text
  // Actually, we'll just check if <button ...> doesn't have aria-label and has a title, we'll add aria-label=title
  content = content.replace(/<button([^>]*)title=(['"])(.*?)\2([^>]*)>/g, (match, p1, p2, p3, p4) => {
    if (!match.includes('aria-label')) {
      return `<button${p1}title=${p2}${p3}${p2} aria-label=${p2}${p3}${p2}${p4}>`;
    }
    return match;
  });

  // Handle divs and spans with onClick
  // This is tricky without AST, but let's try a regex for simple cases.
  // Look for `<div ... onClick={...} ... >` and see if it has role, tabIndex, onKeyDown.

  // Actually, let's use a simpler approach. Add a generic fix for non-button interactive elements.
  // Let's use TS morph if available, or just standard regex.
  // Let's search for onClick= and if it's on a div/span without tabIndex, we add it.

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        walkDir(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir('./src/components');
walkDir('./src/features');
