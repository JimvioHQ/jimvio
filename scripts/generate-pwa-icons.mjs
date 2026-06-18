import sharp from "sharp";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const SVG_PATH = join(ROOT, "public", "jimvio-logo.svg");
const OUT_DIR = join(ROOT, "public", "icons");

const BRAND_ORANGE = "#fd5000";

const svg = readFileSync(SVG_PATH);

async function writeIcon(filename, size, { maskable = false } = {}) {
  const outPath = join(OUT_DIR, filename);
  const scale = maskable ? 0.72 : 0.88;
  const logoSize = Math.round(size * scale);
  const pad = Math.round((size - logoSize) / 2);
  const logo = await sharp(svg).resize(logoSize, logoSize).png().toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND_ORANGE,
    },
  })
    .composite([{ input: logo, top: pad, left: pad }])
    .flatten({ background: BRAND_ORANGE })
    .png()
    .toFile(outPath);

  console.log(`Wrote ${outPath}`);
}

await writeIcon("icon-192.png", 192);
await writeIcon("icon-512.png", 512);
await writeIcon("maskable-192.png", 192, { maskable: true });
await writeIcon("maskable-512.png", 512, { maskable: true });
await writeIcon("apple-touch-icon.png", 180);

console.log("PWA icons generated.");
