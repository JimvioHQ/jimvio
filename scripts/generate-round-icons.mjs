/**
 * Regenerates PWA icons from jimvio-logo.svg (orange squircle + mascot).
 * Run: npm run icons:generate
 */
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const logoPath = join(root, "public", "jimvio-logo.svg");
const outDir = join(root, "public", "icons");

const sizes = [
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "apple-touch-icon.png", size: 180, maskable: false },
  { name: "maskable-192.png", size: 192, maskable: true },
  { name: "maskable-512.png", size: 512, maskable: true },
];

async function renderIcon({ name, size, maskable }) {
  const inset = maskable ? Math.round(size * 0.1) : 0;
  const inner = size - inset * 2;

  const logo = await sharp(logoPath)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const outPath = join(outDir, name);

  if (inset === 0) {
    await sharp(logo).resize(size, size).png().toFile(outPath);
  } else {
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: logo, left: inset, top: inset }])
      .png()
      .toFile(outPath);
  }

  console.log("wrote", outPath);
}

for (const spec of sizes) {
  await renderIcon(spec);
}

// Do not recreate app/apple-icon.png: platform icon metadata is served through
// the admin-managed /api/site-icons endpoints and dynamic manifest route.
