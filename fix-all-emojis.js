const fs = require('fs');
const path = require('path');

const replacements = [
  { pattern: /ðŸŽ¯/g, replacement: '🎯' },
  { pattern: /ðŸ‡·ðŸ‡¼/g, replacement: '🇷🇼' },
  { pattern: /ðŸ‡°ðŸ‡ª/g, replacement: '🇰🇪' },
  { pattern: /ðŸ‡ºðŸ‡¬/g, replacement: '🇺🇬' },
  { pattern: /ðŸ‡¹ðŸ‡¿/g, replacement: '🇹🇿' },
  { pattern: /ðŸ‡³ðŸ‡¬/g, replacement: '🇳🇬' },
  { pattern: /ðŸ‡¬ðŸ‡­/g, replacement: '🇬🇭' },
  { pattern: /ðŸ‡¿ðŸ‡¦/g, replacement: '🇿🇦' },
  { pattern: /ðŸ‡ªðŸ‡¹/g, replacement: '🇪🇹' },
  { pattern: /ðŸ‡ºðŸ‡¸/g, replacement: '🇺🇸' },
  { pattern: /ðŸ‡¬ðŸ‡§/g, replacement: '🇬🇧' },
  { pattern: /ðŸ‡«ðŸ‡·/g, replacement: '🇫🇷' },
  { pattern: /ðŸ ¦/g, replacement: '🏦' },
  { pattern: /ðŸŽµ/g, replacement: '🎵' },
  { pattern: /ðŸ"¸/g, replacement: '📸' },
  { pattern: /ðŸŽ¬/g, replacement: '🎬' },
  { pattern: /ðŸš€/g, replacement: '🚀' },
  { pattern: /â–▶ï¸ /g, replacement: '▶️' },
  { pattern: /âœ–ï¸ /g, replacement: '✖️' },
  { pattern: /ðŸŒ /g, replacement: '🌍' },
  { pattern: /ðŸŽ‰/g, replacement: '🎉' },
  { pattern: /ðŸ‘‹/g, replacement: '👋' },
  { pattern: /ðŸŒŸ/g, replacement: '🌟' },
  { pattern: /ðŸ‘—/g, replacement: '👗' },
  { pattern: /ðŸ‘š/g, replacement: '👕' },
  { pattern: /ðŸ  /g, replacement: '🏠' },
  { pattern: /ðŸ›‹ï¸ /g, replacement: '🛋️' },
  { pattern: /ðŸ’„/g, replacement: '💄' },
  { pattern: /ðŸ’Š/g, replacement: '💊' },
  { pattern: /ðŸŒ¿/g, replacement: '🌿' },
  { pattern: /ðŸ’Ž/g, replacement: '💎' },
  { pattern: /ðŸŽ¨/g, replacement: '🎨' },
  { pattern: /âœˆï¸ /g, replacement: '✈️' },
  { pattern: /ðŸ ¾/g, replacement: '🐾' },
  { pattern: /ðŸ ¼/g, replacement: '👶' },
  { pattern: /ðŸ› ï¸ /g, replacement: '🛒' },
  { pattern: /ðŸ"±/g, replacement: '📱' },
  { pattern: /ðŸ"·/g, replacement: '📸' },
  { pattern: /ðŸ"¦/g, replacement: '📦' },
];

const targetFiles = [
  'app/dashboard/campaigns/page.tsx',
  'app/dashboard/vendor/setup/page.tsx',
  'app/dashboard/vendor/campaigns/new/page.tsx',
  'app/admin/ugc/submissions/page.tsx',
  'components/ugc/ugc-post-form.tsx',
  'components/ugc/ugc-feed.tsx',
  'components/dashboard/universal-dashboard.tsx',
  'components/marketplace/marketplace-client.tsx'
];

targetFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let originalContent = content;
    
    replacements.forEach(r => {
      content = content.replace(r.pattern, r.replacement);
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content);
      console.log(`Fixed emojis in ${file}`);
    } else {
      console.log(`No changes needed in ${file}`);
    }
  } else {
    console.warn(`File not found: ${file}`);
  }
});
