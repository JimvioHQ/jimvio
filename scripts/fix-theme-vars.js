const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;

      // Replace hardcoded stone dark backgrounds with theme variables
      content = content.replace(/\bdark:bg-stone-950\b/g, 'dark:bg-bg');
      content = content.replace(/\bdark:bg-stone-900\b/g, 'dark:bg-surface');
      content = content.replace(/\bdark:bg-stone-800\b/g, 'dark:bg-surface-secondary');
      
      // Also catch zinc as they are often mixed
      content = content.replace(/\bdark:bg-zinc-950\b/g, 'dark:bg-bg');
      content = content.replace(/\bdark:bg-zinc-900\b/g, 'dark:bg-surface');
      content = content.replace(/\bdark:bg-zinc-800\b/g, 'dark:bg-surface-secondary');
      
      // Borders
      content = content.replace(/\bdark:border-stone-800\b/g, 'dark:border-border');
      content = content.replace(/\bdark:border-zinc-800\b/g, 'dark:border-border');
      content = content.replace(/\bdark:border-stone-700\b/g, 'dark:border-border-strong');
      content = content.replace(/\bdark:border-zinc-700\b/g, 'dark:border-border-strong');

      // Text colors
      content = content.replace(/\bdark:text-stone-400\b/g, 'dark:text-text-muted');
      content = content.replace(/\bdark:text-zinc-400\b/g, 'dark:text-text-muted');
      content = content.replace(/\bdark:text-stone-500\b/g, 'dark:text-text-muted');
      content = content.replace(/\bdark:text-zinc-500\b/g, 'dark:text-text-muted');
      content = content.replace(/\bdark:text-stone-200\b/g, 'dark:text-text-secondary');
      content = content.replace(/\bdark:text-zinc-200\b/g, 'dark:text-text-secondary');
      content = content.replace(/\bdark:text-zinc-100\b/g, 'dark:text-text-primary');

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated theme variables in: ${fullPath}`);
      }
    }
  }
}

const targetDirs = [
  path.join(__dirname, '..', 'app'),
  path.join(__dirname, '..', 'components')
];

targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    processDir(dir);
  }
});
