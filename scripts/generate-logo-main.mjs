/**
 * Generate public/logo-main.png and the legacy tajstay-* PNG copies.
 * Usage: node scripts/generate-logo-main.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");

const VERTICAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" fill="none">
  <defs>
    <linearGradient id="lmBg" x1="0" y1="0" x2="240" y2="240" gradientUnits="userSpaceOnUse">
      <stop stop-color="#10493B"/>
      <stop offset="1" stop-color="#03201A"/>
    </linearGradient>
    <linearGradient id="lmMount" x1="35" y1="150" x2="265" y2="150" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0F6B5C"/>
      <stop offset="0.45" stop-color="#1F906F"/>
      <stop offset="1" stop-color="#D7A24A"/>
    </linearGradient>
    <linearGradient id="lmHouse" x1="0" y1="0" x2="0" y2="300" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FBF6E5"/>
      <stop offset="1" stop-color="#E5DBBC"/>
    </linearGradient>
    <linearGradient id="lmStar" x1="40" y1="40" x2="260" y2="260" gradientUnits="userSpaceOnUse">
      <stop stop-color="#E8C481"/>
      <stop offset="1" stop-color="#A07534"/>
    </linearGradient>
    <linearGradient id="lmTaj" x1="100" y1="430" x2="500" y2="540" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0E5C4D"/>
      <stop offset="0.5" stop-color="#13816A"/>
      <stop offset="0.5" stop-color="#D7A24A"/>
      <stop offset="1" stop-color="#A07534"/>
    </linearGradient>
  </defs>

  <g transform="translate(150 40)">
    <rect x="0" y="0" width="300" height="300" rx="60" fill="url(#lmBg)"/>
    <g transform="translate(150 153)" opacity="0.28" stroke="url(#lmStar)" stroke-width="2.7" fill="none" stroke-linejoin="round">
      <rect x="-92" y="-92" width="184" height="184" rx="4"/>
      <rect x="-92" y="-92" width="184" height="184" rx="4" transform="rotate(45)"/>
    </g>
    <path d="M40 224 L92 156 L130 188 L162 86 L200 144 L232 112 L262 224 Z" fill="url(#lmMount)"/>
    <path d="M144 120 L162 86 L180 120 L168 126 L158 128 Z" fill="#F8F2DC"/>
    <path d="M225 128 L232 112 L242 128 Z" fill="#F8F2DC"/>
    <path d="M68 175 L107 146 L144 175 L144 224 L68 224 Z" fill="url(#lmHouse)"/>
    <rect x="97" y="190" width="19" height="34" rx="2" fill="#10493B"/>
    <circle cx="110" cy="208" r="2" fill="#D7A24A"/>
    <rect x="156" y="131" width="76" height="93" rx="5" fill="url(#lmHouse)"/>
    <g fill="#10493B">
      <rect x="164" y="139" width="9.5" height="9.5" rx="1"/>
      <rect x="180" y="139" width="9.5" height="9.5" rx="1"/>
      <rect x="196" y="139" width="9.5" height="9.5" rx="1"/>
      <rect x="212" y="139" width="9.5" height="9.5" rx="1"/>
      <rect x="164" y="155" width="9.5" height="9.5" rx="1"/>
      <rect x="180" y="155" width="9.5" height="9.5" rx="1"/>
      <rect x="196" y="155" width="9.5" height="9.5" rx="1"/>
      <rect x="212" y="155" width="9.5" height="9.5" rx="1"/>
      <rect x="164" y="171" width="9.5" height="9.5" rx="1"/>
      <rect x="180" y="171" width="9.5" height="9.5" rx="1"/>
      <rect x="196" y="171" width="9.5" height="9.5" rx="1"/>
      <rect x="212" y="171" width="9.5" height="9.5" rx="1"/>
      <rect x="164" y="187" width="9.5" height="9.5" rx="1"/>
      <rect x="180" y="187" width="9.5" height="9.5" rx="1"/>
      <rect x="196" y="187" width="9.5" height="9.5" rx="1"/>
      <rect x="212" y="187" width="9.5" height="9.5" rx="1"/>
      <rect x="183" y="203" width="22" height="21" rx="1.6"/>
    </g>
  </g>

  <text x="300" y="455" font-family="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" font-weight="800" font-size="98" letter-spacing="-2" text-anchor="middle" fill="url(#lmTaj)">TAJSTAY</text>
  <text x="300" y="500" font-family="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" font-weight="500" font-size="20" letter-spacing="6" text-anchor="middle" fill="#86d3c2" opacity="0.9">TAJIKISTAN STAYS</text>
</svg>`;

async function rasterize(svg, width) {
  return sharp(Buffer.from(svg), { density: 450 })
    .resize(width)
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}

const main = await rasterize(VERTICAL_SVG, 600);
fs.writeFileSync(path.join(publicDir, "logo-main.png"), main);
console.log("Wrote public/logo-main.png", main.length, "bytes");

const navbarSvg = fs.readFileSync(path.join(publicDir, "logo.svg"), "utf8");
const navbar = await sharp(Buffer.from(navbarSvg), { density: 380 })
  .resize(840)
  .png({ quality: 95, compressionLevel: 9 })
  .toBuffer();
fs.writeFileSync(path.join(publicDir, "tajstay-logo-navbar.png"), navbar);
console.log("Wrote public/tajstay-logo-navbar.png", navbar.length, "bytes");

fs.writeFileSync(path.join(publicDir, "tajstay-logo-main.png"), main);
fs.writeFileSync(path.join(publicDir, "tajstay-logo-source.png"), main);
fs.writeFileSync(path.join(publicDir, "tajstay-favicon.png"), main);
console.log("Wrote public/tajstay-logo-main.png (alias of logo-main)");
console.log("Wrote public/tajstay-logo-source.png (alias of logo-main)");
console.log("Wrote public/tajstay-favicon.png (alias of logo-main)");

console.log("Done.");
