/**
 * Rasterize Jimvio email glyphs to PNG so Gmail and Outlook can show them.
 * Run: node scripts/generate-email-icons.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "email", "icons");

const ORANGE = "#FF5A1F";
const GRAY = "#94A3B8";

function icon(body, color = ORANGE) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
${body}
</svg>`;
}

const ICONS = {
  "cart-check": icon(`
    <path d="M3 5h2.2l1.6 9.2a1.6 1.6 0 0 0 1.6 1.3h7.8"/>
    <path d="M7.2 8.2h10.2l-1.1 5.2H8.4"/>
    <circle cx="9" cy="19.2" r="1.15" fill="${ORANGE}" stroke="none"/>
    <circle cx="16.2" cy="19.2" r="1.15" fill="${ORANGE}" stroke="none"/>
    <circle cx="17.6" cy="7.2" r="3.15" fill="#ffffff" stroke="${ORANGE}"/>
    <path d="M16.2 7.2l.9.9 1.9-2"/>
  `),
  "cart-plus": icon(`
    <path d="M3 5h2.2l1.6 9.2a1.6 1.6 0 0 0 1.6 1.3h7.8"/>
    <path d="M7.2 8.2h10.2l-1.1 5.2H8.4"/>
    <circle cx="9" cy="19.2" r="1.15" fill="${ORANGE}" stroke="none"/>
    <circle cx="16.2" cy="19.2" r="1.15" fill="${ORANGE}" stroke="none"/>
    <circle cx="17.8" cy="6.6" r="3.15" fill="#ffffff" stroke="${ORANGE}"/>
    <path d="M17.8 5.1v3M16.3 6.6h3"/>
  `),
  "mail-check": icon(`
    <path d="M4 7.5h11.2A2 2 0 0 1 17.2 9.5v.4"/>
    <path d="M4 7.5l6.2 4.2L14.6 9"/>
    <path d="M4 7.5V16a2 2 0 0 0 2 2h6.2"/>
    <circle cx="17.4" cy="15.6" r="3.3" fill="#ffffff" stroke="${ORANGE}"/>
    <path d="M15.9 15.6l1 1.05 2.05-2.2"/>
  `),
  "shield-user": icon(`
    <path d="M12 3.2l6.2 2.2v5.4c0 3.7-2.5 6.4-6.2 7.9-3.7-1.5-6.2-4.2-6.2-7.9V5.4L12 3.2z"/>
    <circle cx="12" cy="10" r="1.7"/>
    <path d="M9.3 14.2c.6-1.1 1.5-1.6 2.7-1.6s2.1.5 2.7 1.6"/>
    <circle cx="17.2" cy="16.6" r="2.7" fill="#ffffff" stroke="${ORANGE}"/>
    <path d="M16.2 16.6l.7.7 1.45-1.6"/>
  `),
  "shield-check": icon(`
    <path d="M12 3.2l6.4 2.3v5.5c0 3.8-2.6 6.6-6.4 8.1-3.8-1.5-6.4-4.3-6.4-8.1V5.5L12 3.2z"/>
    <path d="M8.8 11.6l2.2 2.2 4.2-4.4"/>
  `),
  lock: icon(`
    <rect x="6" y="10.2" width="12" height="9" rx="2"/>
    <path d="M8.4 10.2V8.1a3.6 3.6 0 0 1 7.2 0v2.1"/>
    <circle cx="12" cy="14.4" r="1" fill="${ORANGE}" stroke="none"/>
  `),
  bag: icon(`
    <path d="M6.2 8.2h11.6l-.8 10.2a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.8L6.2 8.2z"/>
    <path d="M9 8.2V6.8a3 3 0 0 1 6 0v1.4"/>
  `),
  card: icon(`
    <rect x="3.2" y="6" width="17.6" height="12" rx="2"/>
    <path d="M3.2 10h17.6"/>
    <path d="M7 14.2h4"/>
  `),
  box: icon(`
    <path d="M12 3.6l7 3.2v6.4L12 20.4 5 13.2V6.8l7-3.2z"/>
    <path d="M12 11.2V20.2"/>
    <path d="M5.4 7.2L12 11.2l6.6-4"/>
  `),
  calendar: icon(`
    <rect x="4" y="5.5" width="16" height="14" rx="2"/>
    <path d="M8 3.8v3.2M16 3.8v3.2M4 10h16"/>
  `),
  clock: icon(`
    <circle cx="12" cy="12" r="7.2"/>
    <path d="M12 8.4V12l2.6 2"/>
  `),
  alert: icon(`
    <circle cx="12" cy="12" r="7.2"/>
    <path d="M12 8.2v4.4"/>
    <circle cx="12" cy="15.6" r="0.8" fill="${ORANGE}" stroke="none"/>
  `),
  compass: icon(`
    <circle cx="12" cy="12" r="7.2"/>
    <path d="M14.8 9.2l-1.2 4.4-4.4 1.2 1.2-4.4 4.4-1.2z"/>
  `),
  pin: icon(`
    <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z"/>
    <circle cx="12" cy="11" r="1.8"/>
  `),
  monitor: icon(`
    <rect x="3.5" y="4.5" width="17" height="11.5" rx="2"/>
    <path d="M8 19.5h8M12 16v3.5"/>
  `),
  chat: icon(`
    <path d="M6 16.5l-1.6 3 3.4-1.6"/>
    <path d="M7.2 16.8A6.8 6.8 0 1 1 12 18.2H7.6"/>
  `),
  chevron: icon(`<path d="M9 6l6 6-6 6"/>`, GRAY),
  instagram: icon(
    `<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3.4"/><circle cx="17.2" cy="6.8" r="0.8" fill="${GRAY}" stroke="none"/>`,
    GRAY,
  ),
  tiktok: icon(
    `<path d="M14 6.2v8.2a3.2 3.2 0 1 1-2.4-3.1"/>
     <path d="M14 6.2a4.2 4.2 0 0 0 3.6 2"/>`,
    GRAY,
  ),
  linkedin: icon(
    `<rect x="4" y="4" width="16" height="16" rx="2"/>
     <path d="M8 10.5V16M8 8.2v.2M11.2 16v-3.3c0-1.2.7-2 1.8-2s1.7.8 1.7 2V16"/>`,
    GRAY,
  ),
};

await mkdir(outDir, { recursive: true });
for (const [name, svg] of Object.entries(ICONS)) {
  const png = await sharp(Buffer.from(svg))
    .resize(160, 160)
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();
  await writeFile(join(outDir, `${name}.png`), png);
}
console.log(`Wrote ${Object.keys(ICONS).length} icons to ${outDir}`);
