/**
 * Generate TajStay PWA icons from public/logo-mark.svg
 *
 * logo-mark.svg already includes the full app icon (green tile + gold mark).
 * Do NOT composite it onto a second dark background — that caused a black
 * square with a tiny logo on Android home screen.
 *
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

/** Brand emerald from logo-mark.svg gradient start */
const BRAND_BG = { r: 11, g: 109, b: 94, alpha: 1 };

const svg = fs.readFileSync(svgPath);

/** Standard icon — full bleed, logo fills the canvas */
async function renderIcon(size) {
  return sharp(svg)
    .resize(size, size, { fit: "fill" })
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}

/** Maskable — safe zone ~80%; background matches logo tile, not black */
async function renderMaskable(size) {
  const inner = Math.round(size * 0.82);
  const logo = await sharp(svg).resize(inner, inner, { fit: "fill" }).png().toBuffer();
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

const apple = await renderIcon(180);
fs.writeFileSync(path.join(root, "public", "apple-touch-icon.png"), apple);
console.log("Wrote public/apple-touch-icon.png");

const fav32 = await renderIcon(32);
fs.writeFileSync(path.join(root, "public", "favicon.png"), fav32);
console.log("Wrote public/favicon.png");

console.log("Done.");
