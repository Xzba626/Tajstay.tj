/**
 * Generate TajStay PWA + favicon assets from public/brand/tajstay-icon.png
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
const appDir = path.join(root, "src", "app");

const BRAND_BG = { r: 0, g: 71, b: 36, alpha: 1 }; /* #004724 */

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

const favicon48 = await renderIcon(48);
const favicon32 = await renderIcon(32);
const favicon16 = await renderIcon(16);
const apple180 = await renderIcon(180);

fs.writeFileSync(path.join(root, "public", "apple-touch-icon.png"), apple180);
console.log("Wrote public/apple-touch-icon.png");

fs.writeFileSync(path.join(root, "public", "favicon.png"), favicon32);
fs.writeFileSync(path.join(root, "public", "favicon-16.png"), favicon16);
console.log("Wrote public/favicon.png + favicon-16.png");

/** Next.js App Router — auto-serves /favicon.ico and link rel=icon for Google */
if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });
fs.writeFileSync(path.join(appDir, "icon.png"), favicon48);
fs.writeFileSync(path.join(appDir, "apple-icon.png"), apple180);
console.log("Wrote src/app/icon.png (48px)");
console.log("Wrote src/app/apple-icon.png");

/** PNG embedded in ICO (supported by modern browsers + Google) */
function pngToIco(pngBuffer, size = 32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size;
  entry[1] = size >= 256 ? 0 : size;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

/** Google Search prefers 48×48 in favicon.ico when possible */
const faviconIco = pngToIco(favicon48, 48);
fs.writeFileSync(path.join(root, "public", "favicon.ico"), faviconIco);
fs.writeFileSync(path.join(appDir, "favicon.ico"), faviconIco);
console.log("Wrote public/favicon.ico + src/app/favicon.ico");

console.log("Done.");
