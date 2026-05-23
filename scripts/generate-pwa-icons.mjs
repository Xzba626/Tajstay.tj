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

const BRAND_BG = { r: 16, g: 73, b: 59, alpha: 1 };

const FOREGROUND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
  <defs>
    <linearGradient id="mfMount" x1="14" y1="50" x2="82" y2="50" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0F6B5C"/>
      <stop offset="0.45" stop-color="#1F906F"/>
      <stop offset="1" stop-color="#D7A24A"/>
    </linearGradient>
    <linearGradient id="mfHouse" x1="0" y1="0" x2="0" y2="96" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FBF6E5"/>
      <stop offset="1" stop-color="#E5DBBC"/>
    </linearGradient>
    <linearGradient id="mfStar" x1="18" y1="18" x2="78" y2="78" gradientUnits="userSpaceOnUse">
      <stop stop-color="#E8C481"/>
      <stop offset="1" stop-color="#A07534"/>
    </linearGradient>
  </defs>
  <g transform="translate(48 49)" opacity="0.45" stroke="url(#mfStar)" stroke-width="1.4" fill="none" stroke-linejoin="round">
    <rect x="-29" y="-29" width="58" height="58" rx="1.5"/>
    <rect x="-29" y="-29" width="58" height="58" rx="1.5" transform="rotate(45)"/>
  </g>
  <path d="M14 72 L30 50 L42 60 L52 28 L64 46 L74 36 L84 72 Z" fill="url(#mfMount)"/>
  <path d="M46.5 38 L52 28 L57.5 38 L54 40 L51 41 Z" fill="#F8F2DC"/>
  <path d="M72 41 L74 36 L77 41 Z" fill="#F8F2DC"/>
  <path d="M22 56 L34 47 L46 56 L46 72 L22 72 Z" fill="url(#mfHouse)"/>
  <rect x="31" y="61" width="6" height="11" rx="0.6" fill="#10493B"/>
  <circle cx="35.4" cy="66.5" r="0.55" fill="#D7A24A"/>
  <rect x="50" y="42" width="24" height="30" rx="1.6" fill="url(#mfHouse)"/>
  <g fill="#10493B">
    <rect x="52.5" y="44.5" width="3" height="3" rx="0.3"/>
    <rect x="57.5" y="44.5" width="3" height="3" rx="0.3"/>
    <rect x="62.5" y="44.5" width="3" height="3" rx="0.3"/>
    <rect x="67.5" y="44.5" width="3" height="3" rx="0.3"/>
    <rect x="52.5" y="49.5" width="3" height="3" rx="0.3"/>
    <rect x="57.5" y="49.5" width="3" height="3" rx="0.3"/>
    <rect x="62.5" y="49.5" width="3" height="3" rx="0.3"/>
    <rect x="67.5" y="49.5" width="3" height="3" rx="0.3"/>
    <rect x="52.5" y="54.5" width="3" height="3" rx="0.3"/>
    <rect x="57.5" y="54.5" width="3" height="3" rx="0.3"/>
    <rect x="62.5" y="54.5" width="3" height="3" rx="0.3"/>
    <rect x="67.5" y="54.5" width="3" height="3" rx="0.3"/>
    <rect x="52.5" y="59.5" width="3" height="3" rx="0.3"/>
    <rect x="57.5" y="59.5" width="3" height="3" rx="0.3"/>
    <rect x="62.5" y="59.5" width="3" height="3" rx="0.3"/>
    <rect x="67.5" y="59.5" width="3" height="3" rx="0.3"/>
    <rect x="58.5" y="65" width="7" height="7" rx="0.5"/>
  </g>
</svg>`;

async function renderFullBleed(size) {
  return sharp(svg, { density: 480 })
    .resize(size, size, { fit: "cover" })
    .flatten({ background: BRAND_BG })
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}

async function renderMaskable(size, innerRatio = 0.62) {
  const inner = Math.round(size * innerRatio);
  const fg = await sharp(Buffer.from(FOREGROUND_SVG), { density: 480 })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND_BG
    }
  })
    .composite([{ input: fg, gravity: "centre" }])
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

const outputs = [
  ["icon-192.png", await renderFullBleed(192)],
  ["icon-512.png", await renderFullBleed(512)],
  ["icon-maskable-192.png", await renderMaskable(192)],
  ["icon-maskable-512.png", await renderMaskable(512)]
];

for (const [name, buf] of outputs) {
  const out = path.join(iconsDir, name);
  fs.writeFileSync(out, buf);
  console.log("Wrote", out, buf.length, "bytes");
}

const apple = await renderFullBleed(180);
fs.writeFileSync(path.join(root, "public", "apple-touch-icon.png"), apple);
console.log("Wrote public/apple-touch-icon.png");

const fav32 = await renderFullBleed(64);
fs.writeFileSync(path.join(root, "public", "favicon.png"), fav32);
console.log("Wrote public/favicon.png");

console.log("Done.");
