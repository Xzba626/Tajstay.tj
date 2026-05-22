/**
 * Generate TajStay PWA icons from public/logo-mark.svg
 * Usage: node scripts/generate-pwa-icons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const svgPath = path.join(root, "public", "logo-mark.svg");
const iconsDir = path.join(root, "public", "icons");

const svg = fs.readFileSync(svgPath);

async function renderIcon(size, paddingRatio = 0.12) {
  const inner = Math.round(size * (1 - paddingRatio * 2));
  const logo = await sharp(svg).resize(inner, inner).png().toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 4, g: 26, b: 18, alpha: 1 }
    }
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}

async function renderMaskable(size) {
  const inner = Math.round(size * 0.52);
  const logo = await sharp(svg).resize(inner, inner).png().toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 4, g: 26, b: 18, alpha: 1 }
    }
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

const outputs = [
  ["icon-192.png", await renderIcon(192)],
  ["icon-512.png", await renderIcon(512)],
  ["icon-maskable-512.png", await renderMaskable(512)],
  ["icon-maskable-192.png", await renderMaskable(192)]
];

for (const [name, buf] of outputs) {
  const out = path.join(iconsDir, name);
  fs.writeFileSync(out, buf);
  console.log("Wrote", out, buf.length, "bytes");
}

const apple = await renderIcon(180, 0.14);
fs.writeFileSync(path.join(root, "public", "apple-touch-icon.png"), apple);
console.log("Wrote public/apple-touch-icon.png");

const fav32 = await renderIcon(32, 0.08);
fs.writeFileSync(path.join(root, "public", "favicon.png"), fav32);
console.log("Wrote public/favicon.png");

console.log("Done.");
