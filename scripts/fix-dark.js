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

      // Handle bg-white missing dark:bg- variants. Focus on class strings
      // We look for "bg-white" and replace with "bg-white dark:bg-zinc-900" if no dark mode modifier nearby
      // We'll use a conservative regex replacement that targets words bounded by spaces or quotes inside className=...
      
      content = content.replace(/\bbg-white\b(?!\s+(?:hover:|focus:|active:)?dark:bg-)/g, 'bg-white dark:bg-zinc-900');
      
      // Text color missing dark: text variants
      content = content.replace(/\btext-zinc-900\b(?!\s+(?:hover:|focus:|active:)?dark:text-)/g, 'text-zinc-900 dark:text-white');
      content = content.replace(/\btext-stone-900\b(?!\s+(?:hover:|focus:|active:)?dark:text-)/g, 'text-stone-900 dark:text-white');
      content = content.replace(/\btext-stone-800\b(?!\s+(?:hover:|focus:|active:)?dark:text-)/g, 'text-stone-800 dark:text-zinc-200');
      content = content.replace(/\btext-zinc-800\b(?!\s+(?:hover:|focus:|active:)?dark:text-)/g, 'text-zinc-800 dark:text-zinc-200');
      content = content.replace(/\btext-zinc-700\b(?!\s+(?:hover:|focus:|active:)?dark:text-)/g, 'text-zinc-700 dark:text-zinc-300');
      
      // Secondary backgrounds
      content = content.replace(/\bbg-zinc-50\b(?!\/)(?!\s+(?:hover:|focus:|active:)?dark:bg-)/g, 'bg-zinc-50 dark:bg-zinc-900/50');
      content = content.replace(/\bbg-stone-50\b(?!\/)(?!\s+(?:hover:|focus:|active:)?dark:bg-)/g, 'bg-stone-50 dark:bg-zinc-900/50');

      // Borders missing variants
      content = content.replace(/\bborder-zinc-100\b(?!\/)(?!\s+(?:hover:|focus:|active:)?dark:border-)/g, 'border-zinc-100 dark:border-zinc-800');
      content = content.replace(/\bborder-zinc-200\b(?!\/)(?!\s+(?:hover:|focus:|active:)?dark:border-)/g, 'border-zinc-200 dark:border-zinc-800');
      content = content.replace(/\bborder-stone-100\b(?!\/)(?!\s+(?:hover:|focus:|active:)?dark:border-)/g, 'border-stone-100 dark:border-zinc-800');
      content = content.replace(/\bborder-stone-200\b(?!\/)(?!\s+(?:hover:|focus:|active:)?dark:border-)/g, 'border-stone-200 dark:border-zinc-800');

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

console.log("Starting bulk dark mode update...");
processDir(path.join(__dirname, '..', 'app'));
processDir(path.join(__dirname, '..', 'components'));
console.log("Done.");
