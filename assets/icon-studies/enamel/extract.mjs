// Run from the azani-ui root: node assets/icon-studies/enamel/extract.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import sharp from "sharp";

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
const atlas = path.join(__dirname, "enamel-atlas.png");
const destination = path.resolve(__dirname, "../../../public/images/icons/enamel");

(async () => {
  const metadata = await sharp(atlas).metadata();
  const cellSize = metadata.width / 4;
  if (!Number.isInteger(cellSize) || metadata.height !== cellSize * 3 || !metadata.hasAlpha) {
    throw new Error("Expected a transparent four-column, three-row atlas of square cells.");
  }
  const audit = [];
  for (const [index, name] of names.entries()) {
    // The atlas is split using an exact regular grid. Alpha is never modified.
    const cell = await sharp(atlas)
      .extract({
        left: (index % 4) * cellSize,
        top: Math.floor(index / 4) * cellSize,
        width: cellSize,
        height: cellSize,
      })
      .png()
      .toBuffer();
    const { data, info } = await sharp(cell)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let left = info.width,
      top = info.height,
      right = 0,
      bottom = 0;
    // Locate the visual bounds to normalize surrounding padding. This only
    // determines a rectangular crop; it does not erase or change any pixels.
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] < 32) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
    left = Math.max(0, left - 3);
    top = Math.max(0, top - 3);
    right = Math.min(info.width - 1, right + 3);
    bottom = Math.min(info.height - 1, bottom + 3);
    const bounds = { left, top, width: right - left + 1, height: bottom - top + 1 };
    const output = path.join(destination, `${name}.webp`);
    await sharp(cell)
      .extract(bounds)
      .resize(232, 232, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 12,
        bottom: 12,
        left: 12,
        right: 12,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 90, alphaQuality: 100, effort: 6 })
      .toFile(output);
    audit.push({ name, bounds, bytes: (await fs.stat(output)).size });
  }
  console.log(JSON.stringify({ source: metadata, crops: audit }, null, 2));
})();
