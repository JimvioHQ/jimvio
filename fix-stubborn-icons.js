const fs = require('fs');
const path = require('path');

function fixFile(filePath, lineFixes) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return;
  
  let lines = fs.readFileSync(fullPath, 'utf8').split('\n');
  let changed = false;
  
  for (const [lineNum, replacement] of Object.entries(lineFixes)) {
    const idx = parseInt(lineNum) - 1;
    if (lines[idx]) {
      lines[idx] = replacement;
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(fullPath, lines.join('\n'));
    console.log(`Fixed ${filePath}`);
  }
}

fixFile('components/marketplace/marketplace-client.tsx', {
  302: '  home: "🏠",',
  303: '  furniture: "🛋️",',
  307: '  sports: "⚽",',
  315: '  travel: "✈️",',
  316: '  pets: "🐾",',
  317: '  baby: "👶",',
  393: '    const icon = cat.slug ? getCategoryIcon(cat.slug, cat.name) : "🛒";',
  580: '              icon="🛒"'
});

fixFile('app/dashboard/vendor/setup/page.tsx', {
  325: '                { value: "bank",      label: "Bank Transfer",  icon: "🏦", desc: "Direct bank transfer" },'
});
