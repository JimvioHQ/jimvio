const fs = require('fs');
const path = require('path');

function fixFile(filePath, replacements) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;
  
  replacements.forEach(r => {
    content = content.replace(r.target, r.replacement);
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`Fixed ${filePath}`);
  } else {
    console.log(`No changes for ${filePath}`);
  }
}

fixFile('components/dashboard/dashboard-marketplace-client.tsx', [
  {
    target: /bg-white dark:bg-surface rounded-sm border border-stone-100 dark:border-border shadow-none transition-all text-\[12px\] font-bold text-stone-600 hover:border-stone-900 active:scale-95 whitespace-nowrap/g,
    replacement: 'bg-[var(--color-surface)] rounded-sm border border-[var(--color-border)] shadow-none transition-all text-[12px] font-bold text-[var(--color-text-secondary)] hover:border-[var(--color-text-primary)] active:scale-95 whitespace-nowrap'
  },
  {
    target: /ring-4 ring-stone-900\/5 border-stone-200 dark:border-border/g,
    replacement: 'ring-4 ring-orange-500/5 border-[var(--color-border-strong)]'
  },
  {
    target: /<ListFilter className="h-4 w-4 text-stone-300" \/>\s+<span className="text-stone-300">Sort:<\/span>\s+<span className="text-stone-900 dark:text-white">/g,
    replacement: '<ListFilter className="h-4 w-4 text-[var(--color-text-muted)]" />\n                    <span className="text-[var(--color-text-muted)]">Sort:</span>\n                    <span className="text-[var(--color-text-primary)]">'
  },
  {
    target: /<ChevronDown className=\{cn\("h-4 w-4 text-stone-300 transition-transform", sortOpen && "rotate-180"\)\} \/>/g,
    replacement: '<ChevronDown className={cn("h-4 w-4 text-[var(--color-text-muted)] transition-transform", sortOpen && "rotate-180")} />'
  },
  {
    target: /className="absolute right-0 top-14 w-52 bg-white dark:bg-surface rounded-sm border border-stone-100 dark:border-border shadow-none p-2 z-\[120\]"/g,
    replacement: 'className="absolute right-0 top-14 w-52 bg-[var(--color-surface)] rounded-sm border border-[var(--color-border)] shadow-none p-2 z-[120]"'
  }
]);
