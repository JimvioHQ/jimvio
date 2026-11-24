/**
 * Jimvio icon ecosystem generator.
 * Uses official logo artwork with optical 80% fill sizing.
 *
 * Run: npm run icons:generate
 */
import sharp from "sharp";
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE_DIR = join(ROOT, "public", "icons", "source");
const OUT_DIR = join(ROOT, "public", "icons");
const OFFICIAL_PNG = join(SOURCE_DIR, "official-logo.png");
const BRAND_ORANGE = { r: 249, g: 84, b: 5, alpha: 1 };
const BRAND_ORANGE_HEX = "#F95405";

/** Crop ~13.5% per edge — zooms artwork to ~80% optical fill */
const OPTICAL_CROP_RATIO = 0.135;

mkdirSync(SOURCE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

function readSvg(name) {
  return readFileSync(join(SOURCE_DIR, name));
}

let officialMaster = null;

async function getOfficialMaster() {
  if (officialMaster) return officialMaster;
  if (!existsSync(OFFICIAL_PNG)) {
    throw new Error(`Missing official logo: ${OFFICIAL_PNG}`);
  }
  const meta = await sharp(OFFICIAL_PNG).metadata();
  const inset = Math.round(meta.width * OPTICAL_CROP_RATIO);
  officialMaster = sharp(OFFICIAL_PNG).extract({
    left: inset,
    top: inset,
    width: meta.width - inset * 2,
    height: meta.height - inset * 2,
  });
  return officialMaster;
}

function roundedRectMask(size) {
  const radius = Math.round(size * 0.205);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/></svg>`,
  );
}

/**
 * Render from official PNG — preserves colors, optical zoom, no distortion.
 */
async function renderOfficialPng(size, { rounded = true } = {}) {
  const supersample = size <= 32 ? 4 : size <= 64 ? 3 : size <= 180 ? 2 : 1;
  const renderSize = size * supersample;

  let pipeline = (await getOfficialMaster())
    .clone()
    .resize(renderSize, renderSize, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    });

  if (supersample > 1) {
    pipeline = pipeline.resize(size, size, {
      kernel: size <= 24 ? sharp.kernel.mitchell : sharp.kernel.lanczos3,
    });
  }

  if (rounded && size >= 48) {
    pipeline = pipeline
      .ensureAlpha()
      .composite([{ input: roundedRectMask(size), blend: "dest-in" }]);
  }

  return pipeline
    .png({ compressionLevel: 9, effort: 10, palette: size <= 48 })
    .toBuffer();
}

/**
 * Supersample SVG rasterization for vector layers (foreground, monochrome).
 */
async function renderSvgToPng(svgName, size, { transparent = false } = {}) {
  const svg = readSvg(svgName);
  const supersample = size <= 32 ? 4 : size <= 64 ? 3 : size <= 180 ? 2 : 1;
  const renderSize = size * supersample;

  const background = transparent
    ? { r: 0, g: 0, b: 0, alpha: 0 }
    : BRAND_ORANGE;

  let pipeline = sharp(svg, { density: 384 }).resize(renderSize, renderSize, {
    fit: "contain",
    background,
  });

  if (supersample > 1) {
    pipeline = pipeline.resize(size, size, {
      kernel: size <= 24 ? sharp.kernel.mitchell : sharp.kernel.lanczos3,
    });
  }

  return pipeline
    .png({ compressionLevel: 9, palette: size <= 48, effort: 10 })
    .toBuffer();
}

async function writeOfficialIcon(filename, size, options) {
  const buffer = await renderOfficialPng(size, options);
  writeFileSync(join(OUT_DIR, filename), buffer);
  console.log(`  ✓ ${filename} (${size}px) ← official-logo.png`);
  return buffer;
}

async function writeSvgIcon(filename, svgName, size, options) {
  const buffer = await renderSvgToPng(svgName, size, options);
  writeFileSync(join(OUT_DIR, filename), buffer);
  console.log(`  ✓ ${filename} (${size}px) ← ${svgName}`);
  return buffer;
}

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

console.log("\nJimvio icon ecosystem — official logo, optical 80% fill\n");

// ── All standard sizes from official PNG ────────────────────────────────────
const STANDARD_SIZES = [
  16, 24, 32, 48, 64, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512, 1024,
];

const faviconFrames = [];

for (const size of STANDARD_SIZES) {
  const filename = `icon-${size}.png`;
  const rounded = size >= 48;
  const buffer = await writeOfficialIcon(filename, size, { rounded });

  if ([16, 24, 32, 48].includes(size)) {
    faviconFrames.push({ size, buffer });
  }
}

// ── Apple touch (180px, no extra rounding beyond source) ─────────────────────
await writeOfficialIcon("apple-touch-icon.png", 180, { rounded: true });

// ── Windows tile ────────────────────────────────────────────────────────────
await writeOfficialIcon("mstile-150x150.png", 150, { rounded: true });

// ── Maskable PWA (full bleed, no rounded corners) ───────────────────────────
await writeSvgIcon("maskable-192.png", "maskable.svg", 192);
await writeSvgIcon("maskable-512.png", "maskable.svg", 512);

// ── Monochrome (Android 13+ themed icons) ───────────────────────────────────
await writeSvgIcon("monochrome-192.png", "monochrome.svg", 192, { transparent: true });
await writeSvgIcon("monochrome-512.png", "monochrome.svg", 512, { transparent: true });

// ── Android adaptive icon layers (432 = 108dp × 4) ───────────────────────────
await writeSvgIcon("android-background-432.png", "background.svg", 432);
await writeSvgIcon("android-foreground-432.png", "foreground.svg", 432, {
  transparent: true,
});
await writeSvgIcon("android-monochrome-432.png", "monochrome.svg", 432, {
  transparent: true,
});

// ── Combined adaptive preview ───────────────────────────────────────────────
const bg432 = await renderSvgToPng("background.svg", 432);
const fg432 = await renderSvgToPng("foreground.svg", 432, { transparent: true });
await sharp(bg432)
  .composite([{ input: fg432, top: 0, left: 0 }])
  .png()
  .toFile(join(OUT_DIR, "android-adaptive-preview-432.png"));
console.log("  ✓ android-adaptive-preview-432.png (432px) ← composite");

// ── favicon.ico (multi-size) ────────────────────────────────────────────────
const ico = buildIco(faviconFrames);
writeFileSync(join(ROOT, "public", "favicon.ico"), ico);
writeFileSync(join(ROOT, "app", "favicon.ico"), ico);
console.log("  ✓ favicon.ico (16/24/32/48)");

// ── Sync brand assets ───────────────────────────────────────────────────────
copyFileSync(join(SOURCE_DIR, "any.svg"), join(ROOT, "public", "favicon.svg"));
copyFileSync(join(SOURCE_DIR, "any.svg"), join(ROOT, "app", "icon.svg"));
copyFileSync(join(SOURCE_DIR, "safariPinned.svg"), join(ROOT, "public", "icons", "safari-pinned-tab.svg"));
copyFileSync(join(OUT_DIR, "apple-touch-icon.png"), join(ROOT, "app", "apple-icon.png"));
copyFileSync(join(OUT_DIR, "icon-512.png"), join(ROOT, "public", "jimvio-logo.png"));
copyFileSync(join(OUT_DIR, "icon-512.png"), join(ROOT, "public", "jimvio-logo-mark.png"));
console.log("  ✓ favicon.svg, app/icon.svg, safari-pinned-tab.svg, app/apple-icon.png");
console.log("  ✓ jimvio-logo.png, jimvio-logo-mark.png (512px sync)");

console.log("\nDone — icon ecosystem regenerated.\n");
