const fs = require('fs');
const path = require('path');

const patterns = [
  { pattern: /ðŸŒŸ/g, replacement: '🌟' },
  { pattern: /â"€/g, replacement: '─' },
  { pattern: /â‰¥/g, replacement: '≥' },
  { pattern: /â• /g, replacement: '═' },
  { pattern: /â† /g, replacement: '←' },
  { pattern: /â†’/g, replacement: '→' },
  { pattern: /â†‘/g, replacement: '↑' },
  { pattern: /ðŸ‘‹/g, replacement: '👋' },
  { pattern: /ðŸŽ¯/g, replacement: '🎯' },
  { pattern: /ðŸ  /g, replacement: '🏠' },
  { pattern: /ðŸŽ‰/g, replacement: '🎉' },
  { pattern: /ðŸš€/g, replacement: '🚀' },
  { pattern: /â–¶ï¸ /g, replacement: '▶️' },
  { pattern: /âœ–ï¸ /g, replacement: '✖️' },
  { pattern: /Â·/g, replacement: '·' },
  { pattern: /â— /g, replacement: '●' },
  { pattern: /âœ/g, replacement: '✓' }
];

function getAllFiles(dirPath, arrayOfFiles) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles || [];
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      const ext = path.extname(file);
      if (['.tsx', '.ts', '.js', '.jsx'].includes(ext)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const directoriesToScan = ['app', 'components', 'lib', 'services'];
let targetFiles = [];
directoriesToScan.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  targetFiles = getAllFiles(fullPath, targetFiles);
});

console.log(`Scanning ${targetFiles.length} files for corruption...`);

targetFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    patterns.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        changed = true;
      }
    });

    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Fixed: ${file}`);
    }
  } catch (e) {
    console.error(`Error reading ${file}: ${e.message}`);
  }
});

console.log('Sanitization complete.');
