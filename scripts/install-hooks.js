/* global process, console */
import fs from 'fs';
import path from 'path';

const srcFile = path.join(process.cwd(), 'scripts', 'pre-push');
const gitDir = path.join(process.cwd(), '.git');
const targetDir = path.join(gitDir, 'hooks');
const targetFile = path.join(targetDir, 'pre-push');

console.log('🛡️  Running SEIHouse Git Hook Installer...');

if (fs.existsSync(gitDir)) {
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copy hook content to local .git/hooks/pre-push
    fs.copyFileSync(srcFile, targetFile);

    // Make the hook file executable (chmod +x)
    fs.chmodSync(targetFile, 0o755);

    console.log('✅ Successfully installed executive pre-push hook to .git/hooks/pre-push');
  } catch (error) {
    console.error('❌ Failed to install git pre-push hook:', error.message);
    process.exit(1);
  }
} else {
  console.log('ℹ️  No local .git directory found (skipping hook generation).');
}
