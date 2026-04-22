const fs = require('fs');
const path = require('path');

const replacements = [
  { pattern: /Ã¢â‚¬"/g, replacement: '—' },
  { pattern: /Ã¢â‚¬/g, replacement: '—' },
  { pattern: /Ã¢•Â/g, replacement: '━' },
  { pattern: /Ã¢"Â/g, replacement: '—' },
  { pattern: /Ã¢" /g, replacement: '—' },
  { pattern: /Ã¢" '/g, replacement: '→' },
  { pattern: /Ã¢Å"Â¦/g, replacement: '🌟' },
  { pattern: /â–¶ï¸ /g, replacement: '▶️' },
  { pattern: /âœ–ï¸ /g, replacement: '✖️' },
  { pattern: /â"€/g, replacement: '─' },
  { pattern: /â‰¥/g, replacement: '≥' },
  { pattern: /â• /g, replacement: '═' },
  { pattern: /â† /g, replacement: '←' },
  { pattern: /ðŸŒ /g, replacement: '🌍' },
  { pattern: /Ã¢•Â/g, replacement: '━' },
  { pattern: /Ã¢•/g, replacement: '━' },
  { pattern: /Ã¢"/g, replacement: '—' },
  { pattern: /ðŸŒŸ/g, replacement: '🌟' },
  { pattern: /â†’/g, replacement: '→' },
  { pattern: /âœ"/g, replacement: '✓' },
  { pattern: /â†‘/g, replacement: '↑' },
  { pattern: /ðŸ‘‹/g, replacement: '👋' },
  { pattern: /ðŸŽ¯/g, replacement: '🎯' },
  { pattern: /ðŸ  /g, replacement: '🏠' },
  { pattern: /ðŸŽ‰/g, replacement: '🎉' },
  { pattern: /ðŸš€/g, replacement: '🚀' },
  { pattern: /â–¶ï¸ /g, replacement: '▶️' },
  { pattern: /âœ–ï¸ /g, replacement: '✖️' }
];

const targetFiles = [
  'components/layout/homepage-hero.tsx',
  'components/marketplace/product-card.tsx',
  'components/marketplace/product-card-client.tsx',
  'app/admin/ugc/submissions/page.tsx',
  'components/layout/navbar.tsx',
  'components/layout/homepage-sections.tsx',
  'components/marketplace/marketplace-client.tsx',
  'components/dashboard/universal-dashboard.tsx',
  'components/marketplace/trending-product-clips-section.tsx',
  'components/marketplace/social-proof-bar.tsx',
  'components/marketplace/top-creators-section.tsx',
  'components/marketplace/campaign-scroll-row.tsx',
  'components/marketplace/community-scroll-row.tsx',
  'components/marketplace/short-clips-reel.tsx',
  'components/marketplace/popular-stores-section.tsx',
  'app/dashboard/page.tsx',
  'components/dashboard/sidebar.tsx',
  'app/ugc/page.tsx',
  'components/studio/VideoStudio.tsx',
  'components/ugc/campaign-card-shared.tsx',
  'components/ugc/ugc-post-card.tsx',
  'components/ugc/ugc-feed.tsx',
  'components/ugc/ugc-post-form.tsx'
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
      console.log(`Fixed corrupted characters in ${file}`);
    } else {
      console.log(`No changes needed in ${file}`);
    }
  } else {
    console.warn(`File not found: ${file}`);
  }
});
