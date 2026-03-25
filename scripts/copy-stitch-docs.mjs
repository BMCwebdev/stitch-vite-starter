import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Skip in CI — these assets are only needed for local development
if (process.env.CI) {
  console.log('Skipping Stitch docs copy in CI environment');
  process.exit(0);
}

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcBase = path.join(
  __dirname,
  '../node_modules/@bonterratech/stitch-extension/dist',
);
const directoriesToCopy = ['stitch-documentation', 'stitch-source'];
const destBase = path.join(__dirname, '../stitch-ai-assets');

// Create the destination directory if it doesn't exist
fs.mkdirSync(destBase, { recursive: true });

// Copy each directory
directoriesToCopy.forEach((dir) => {
  const srcPath = path.join(srcBase, dir);
  const destPath = path.join(destBase, dir);

  // Skip if source doesn't exist
  if (!fs.existsSync(srcPath)) {
    console.log(`Source directory ${dir} not found, skipping.`);
    return;
  }

  // Remove old directory if it exists
  if (fs.existsSync(destPath)) {
    fs.rmSync(destPath, { recursive: true, force: true });
  }

  // Copy the whole directory including the directory itself
  fs.cpSync(srcPath, destPath, { recursive: true });

  console.log(`Copied ${dir} to stitch-ai-assets/${dir}`);
});

console.log('All Stitch assets copied to stitch-ai-assets directory');
