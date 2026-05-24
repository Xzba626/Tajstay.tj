/**
 * Generate TajStay PWA icons from public/brand/tajstay-icon.png
 * Usage: node scripts/generate-pwa-icons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const iconPath = path.join(root, "public", "brand", "tajstay-icon.png");
const iconsDir = path.join(root, "public", "icons");

const BRAND_BG = { r: 6, g: 36, b: 24, alpha: 1 };

if (!fs.existsSync(iconPath)) {
  console.error("Run node scripts/generate-brand-assets.mjs first");
  process.exit(1);
}

const icon = fs.readFileSync(iconPath);

async function renderIcon(size) {
  return sharp(icon)
    .resize(size, size, { fit: "fill" })
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}

async function renderMaskable(size) {
  const inner = Math.round(size * 0.82);
  const logo = await sharp(icon).resize(inner, inner, { fit: "contain", background: BRAND_BG }).png().toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND_BG
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

fs.writeFileSync(path.join(root, "public", "apple-touch-icon.png"), await renderIcon(180));
console.log("Wrote public/apple-touch-icon.png");

fs.writeFileSync(path.join(root, "public", "favicon.png"), await renderIcon(32));
console.log("Wrote public/favicon.png");

console.log("Done.");
