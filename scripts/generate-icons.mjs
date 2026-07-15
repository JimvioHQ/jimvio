import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SVG_PATH = path.join(__dirname, "..", "public", "jimvio-logo.svg");
const OUT_DIR = path.join(__dirname, "..", "public", "icons");

const sizes = [
  // Standard PWA icons
  16, 24, 32, 48, 64, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512, 1024,
  // Maskable
  { name: "maskable-192", size: 192, padding: 0.1 },
  { name: "maskable-512", size: 512, padding: 0.1 },
  // Monochrome — same shape, single color
  { name: "monochrome-192", size: 192, monochrome: true },
  { name: "monochrome-512", size: 512, monochrome: true },
  // Microsoft tile
  { name: "mstile-150x150", size: 150 },
  // Apple touch
  { name: "apple-touch-icon", size: 180 },
  // Android adaptive pieces
  { name: "android-foreground-432", size: 432, padding: 0.15, foreground: true },
  { name: "android-background-432", size: 432, bgColor: "#FD5000" },
  { name: "android-monochrome-432", size: 432, monochrome: true },
  { name: "android-adaptive-preview-432", size: 432 },
];

async function main() {
  const svgBuffer = fs.readFileSync(SVG_PATH);

  for (const entry of sizes) {
    let name, size, padding, monochrome, bgColor, foreground;
    if (typeof entry === "object") {
      name = entry.name;
      size = entry.size;
      padding = entry.padding || 0;
      monochrome = entry.monochrome || false;
      bgColor = entry.bgColor || null;
      foreground = entry.foreground || false;
    } else {
      name = `icon-${entry}`;
      size = entry;
      padding = 0;
      monochrome = false;
      bgColor = null;
    }

    // Read SVG and modify if needed
    let svgContent = fs.readFileSync(SVG_PATH, "utf-8");

    // Sharp's SVG renderer (librsvg) can't resolve linearGradient — use solid color
    svgContent = svgContent
      .replace('fill="url(#g)"', 'fill="#FD5000"')
      .replace(/<defs>[\s\S]*?<\/defs>/, "");

    // For monochrome: J silhouette on transparent bg (no rounded rect)
    if (monochrome) {
      svgContent = svgContent
        .replace(/<defs>[\s\S]*?<\/defs>/, "")
        .replace(
          /<rect[^>]*\/>\s*/,
          "",
        );
    }

    // For Android foreground: J only (no background rect)
    if (foreground) {
      svgContent = svgContent
        .replace(/<defs>[\s\S]*?<\/defs>/, "")
        .replace(
          /<rect[^>]*\/>\s*/,
          "",
        );
    }

    // For background-only variant (Android background layer)
    if (bgColor) {
      svgContent = svgContent
        .replace(
          '<rect width="1000" height="1000" rx="220" fill="#FD5000"/>',
          `<rect width="1000" height="1000" rx="220" fill="${bgColor}"/>`,
        )
        .replace(
          '<g transform="translate(266 84) scale(26)">',
          '<g transform="translate(266 84) scale(26)" style="display:none">',
        );
    }

    const outPath = path.join(OUT_DIR, `${name}.png`);

    try {
      // Apply padding via resize options
      const img = sharp(Buffer.from(svgContent)).resize(
        Math.round(size * (1 - padding * 2)),
        Math.round(size * (1 - padding * 2)),
        {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      );

      // If padding, extend canvas
      if (padding > 0) {
        const extend = Math.round(size * padding);
        const extended = await img
          .extend({
            top: extend,
            bottom: extend,
            left: extend,
            right: extend,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer();
        // Then resize to exact size
        await sharp(extended)
          .resize(size, size)
          .png()
          .toFile(outPath);
      } else {
        await img.resize(size, size).png().toFile(outPath);
      }

      console.log(`OK  ${name}.png  ${size}x${size}`);
    } catch (err) {
      console.error(`ERR ${name}.png: ${err.message}`);
    }
  }
}

main().catch(console.error);
