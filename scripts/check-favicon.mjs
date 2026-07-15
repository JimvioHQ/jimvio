import sharp from "sharp";
import fs from "fs";

async function inspectIcons() {
  for (const name of ["icon-192", "icon-32", "monochrome-192", "android-foreground-432", "maskable-192", "icon-16"]) {
    const buf = fs.readFileSync(`public/icons/${name}.png`);
    const { data, info } = await sharp(buf)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height } = info;

    // Count pixel types
    let orange = 0, white = 0, transparent = 0, blackish = 0, other = 0;
    let minX = width, maxX = 0, minY = height, maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const px = (y * width + x) * 4;
        const r = data[px], g = data[px+1], b = data[px+2], a = data[px+3];

        if (a === 0) {
          transparent++;
          continue;
        }

        // Check for orange (gradient bg)
        const isOrange = r > 200 && g < 100 && b < 80 && a > 200;
        // Check for white (J)
        const isWhite = r > 230 && g > 230 && b > 230 && a > 200;
        // Check for blackish
        const isBlack = r < 50 && g < 50 && b < 50 && a > 200;

        if (isOrange) {
          orange++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        } else if (isWhite) {
          white++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        } else if (isBlack) {
          blackish++;
        } else {
          other++;
        }
      }
    }

    const total = width * height;
    const opaque = total - transparent;
    console.log(`\n${name}.png (${width}x${height}):`);
    console.log(`  orange: ${orange} (${(orange/total*100).toFixed(1)}%)`);
    console.log(`  white: ${white} (${(white/total*100).toFixed(1)}%)`);
    console.log(`  blackish: ${blackish}`);
    console.log(`  transparent: ${transparent} (${(transparent/total*100).toFixed(1)}%)`);
    console.log(`  other: ${other}`);
    console.log(`  opaque bounds: (${minX},${minY})-(${maxX},${maxY})`);
    console.log(`  center: (${(minX+maxX)/2}, ${(minY+maxY)/2})`);
  }
}

await inspectIcons();
