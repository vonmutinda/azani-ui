// Asset preparation only: exact-grid extraction, resize, and alpha-preserving encoding.
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const names = [
  "shop",
  "dress",
  "shirt",
  "age",
  "new",
  "sale",
  "trousers",
  "outfit",
  "jacket",
  "sleepwear",
  "socks",
];
async function main() {
  const source = process.argv[2] || path.join(__dirname, "source-atlas.png");
  const metadata = await sharp(source).metadata();
  if (!metadata.hasAlpha || metadata.width % 4 || metadata.height % 3) {
    throw new Error("Expected transparent 4-column, 3-row atlas with exact grid dimensions");
  }
  const width = metadata.width / 4;
  const height = metadata.height / 3;
  const output = path.join(__dirname, "icons");
  for (const [index, name] of names.entries()) {
    const cell = await sharp(source)
      .extract({ left: (index % 4) * width, top: Math.floor(index / 4) * height, width, height })
      .ensureAlpha()
      .raw()
      .toBuffer();
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;
    // Ignore nearly invisible alpha for bounds only; preserve original alpha pixels.
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (cell[(y * width + x) * 4 + 3] > 8) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    }
    if (right < left) throw new Error(`Empty icon cell: ${name}`);
    left = Math.max(0, left - 2);
    top = Math.max(0, top - 2);
    right = Math.min(width - 1, right + 2);
    bottom = Math.min(height - 1, bottom + 2);
    await sharp(cell, { raw: { width, height, channels: 4 } })
      .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
      .resize(228, 228, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 14,
        bottom: 14,
        left: 14,
        right: 14,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 90, alphaQuality: 100 })
      .toFile(path.join(output, `${name}.webp`));
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
