/**
 * Jimvio icon ecosystem generator.
 * Produces size-optimized PNGs, ICO, and syncs Next.js icon files.
 *
 * Run: npm run icons:generate
 */
import sharp from "sharp";
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE_DIR = join(ROOT, "public", "icons", "source");
const OUT_DIR = join(ROOT, "public", "icons");
const BRAND_ORANGE = { r: 251, g: 76, b: 7, alpha: 1 };

mkdirSync(SOURCE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

function readSvg(name) {
  return readFileSync(join(SOURCE_DIR, name));
}

/**
 * Supersample SVG rasterization then downscale for pixel-crisp small icons.
 */
async function renderSvgToPng(svgName, size, { transparent = false } = {}) {
  const svg = readSvg(svgName);
  const supersample = size <= 32 ? 4 : size <= 64 ? 3 : size <= 180 ? 2 : 1;
  const renderSize = size * supersample;

  const background = transparent
    ? { r: 0, g: 0, b: 0, alpha: 0 }
    : BRAND_ORANGE;

  let pipeline = sharp(svg, { density: 384 })
    .resize(renderSize, renderSize, {
      fit: "contain",
      background,
    });

  if (supersample > 1) {
    pipeline = pipeline.resize(size, size, {
      kernel: size <= 24 ? sharp.kernel.mitchell : sharp.kernel.lanczos3,
    });
  }

  return pipeline
    .png({
      compressionLevel: 9,
      palette: size <= 48,
      effort: 10,
    })
    .toBuffer();
}

async function writeIcon(filename, svgName, size, options) {
  const buffer = await renderSvgToPng(svgName, size, options);
  writeFileSync(join(OUT_DIR, filename), buffer);
  console.log(`  ✓ ${filename} (${size}px) ← ${svgName}`);
  return buffer;
}

/** Multi-size ICO with embedded PNG frames (Vista+). */
function buildIco(frames) {
  const count = frames.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = [];
  const images = [];
  let offset = 6 + count * 16;

  for (const { size, buffer } of frames) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    images.push(buffer);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...images]);
}

console.log("\nJimvio icon ecosystem\n");

// ── Favicon sizes (optimized from faviconSmall.svg) ─────────────────────────
const favicon16 = await writeIcon("icon-16.png", "faviconSmall.svg", 16);
const favicon24 = await writeIcon("icon-24.png", "faviconSmall.svg", 24);
const favicon32 = await writeIcon("icon-32.png", "faviconSmall.svg", 32);
const favicon48 = await writeIcon("icon-48.png", "faviconSmall.svg", 48);

// ── Standard app icons (any.svg) ────────────────────────────────────────────
await writeIcon("icon-64.png", "any.svg", 64);
await writeIcon("icon-96.png", "any.svg", 96);
await writeIcon("icon-180.png", "any.svg", 180);
await writeIcon("apple-touch-icon.png", "any.svg", 180);
await writeIcon("icon-192.png", "any.svg", 192);
await writeIcon("icon-256.png", "any.svg", 256);
await writeIcon("icon-384.png", "any.svg", 384);
await writeIcon("icon-512.png", "any.svg", 512);
await writeIcon("icon-1024.png", "any.svg", 1024);
await writeIcon("mstile-150x150.png", "any.svg", 150);

// ── Maskable PWA icons ──────────────────────────────────────────────────────
await writeIcon("maskable-192.png", "maskable.svg", 192);
await writeIcon("maskable-512.png", "maskable.svg", 512);

// ── Monochrome (Android 13+ themed icons) ───────────────────────────────────
await writeIcon("monochrome-192.png", "monochrome.svg", 192, { transparent: true });
await writeIcon("monochrome-512.png", "monochrome.svg", 512, { transparent: true });

// ── Android adaptive icon layers (432 = 108dp × 4) ───────────────────────────
await writeIcon("android-background-432.png", "background.svg", 432);
await writeIcon("android-foreground-432.png", "foreground.svg", 432, {
  transparent: true,
});
await writeIcon("android-monochrome-432.png", "monochrome.svg", 432, {
  transparent: true,
});

// ── Combined adaptive preview (for QA) ────────────────────────────────────────
const bg432 = await renderSvgToPng("background.svg", 432);
const fg432 = await renderSvgToPng("foreground.svg", 432, { transparent: true });
await sharp(bg432)
  .composite([{ input: fg432, top: 0, left: 0 }])
  .png()
  .toFile(join(OUT_DIR, "android-adaptive-preview-432.png"));
console.log("  ✓ android-adaptive-preview-432.png (432px) ← composite");

// ── favicon.ico (multi-size) ─────────────────────────────────────────────────
const ico = buildIco([
  { size: 16, buffer: favicon16 },
  { size: 24, buffer: favicon24 },
  { size: 32, buffer: favicon32 },
  { size: 48, buffer: favicon48 },
]);
writeFileSync(join(ROOT, "public", "favicon.ico"), ico);
writeFileSync(join(ROOT, "app", "favicon.ico"), ico);
console.log("  ✓ favicon.ico (16/24/32/48)");

// ── Sync SVG sources to browser-facing paths ────────────────────────────────
copyFileSync(join(SOURCE_DIR, "any.svg"), join(ROOT, "public", "favicon.svg"));
copyFileSync(join(SOURCE_DIR, "any.svg"), join(ROOT, "app", "icon.svg"));
copyFileSync(join(SOURCE_DIR, "safariPinned.svg"), join(ROOT, "public", "icons", "safari-pinned-tab.svg"));
copyFileSync(join(OUT_DIR, "apple-touch-icon.png"), join(ROOT, "app", "apple-icon.png"));
console.log("  ✓ favicon.svg, app/icon.svg, safari-pinned-tab.svg, app/apple-icon.png");

console.log("\nDone — icon ecosystem regenerated.\n");
