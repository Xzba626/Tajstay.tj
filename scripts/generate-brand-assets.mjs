/**
 * Generate TajStay brand assets from the official logo PNG.
 * Usage: node scripts/generate-brand-assets.mjs [source.png]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const brandDir = path.join(root, "public", "brand");

const fallbackSource = path.join(
  process.env.USERPROFILE ?? "",
  ".cursor",
  "projects",
  "c-Users-Layoqat-Desktop-Tajstay-tj-3-0-upgrade",
  "assets",
  "c__Users_Layoqat_AppData_Roaming_Cursor_User_workspaceStorage_b02d28b758e7fd344f3d8fc17a410b6d_images_Tajstay-4fb511ab-3550-4cb3-95d7-bdeaf4356746.png"
);

const sourceCandidates = [
  process.argv[2] ? path.resolve(process.argv[2]) : null,
  fallbackSource,
  path.join(brandDir, "tajstay-logo-full.png"),
  path.join(brandDir, "tajstay-logo.png")
].filter(Boolean);

const sourcePath = sourceCandidates.find((p) => fs.existsSync(p));

if (!sourcePath) {
  console.error("Source logo not found. Pass path or place tajstay-logo-full.png in public/brand/");
  process.exit(1);
}

if (!fs.existsSync(brandDir)) fs.mkdirSync(brandDir, { recursive: true });

const EMERALD_BG = { r: 6, g: 36, b: 24, alpha: 1 }; // #062418

async function removeNearWhite(inputBuffer, tolerance = 232) {
  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= tolerance && g >= tolerance && b >= tolerance) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
    .png()
    .toBuffer();
}

const meta = await sharp(sourcePath).rotate().metadata();
const imgW = meta.width ?? 1024;
const imgH = meta.height ?? 1024;

const fullLogo = await sharp(sourcePath).rotate().png({ quality: 95, compressionLevel: 9 }).toBuffer();

/** Icon only — top portion above TAJSTAY wordmark */
const markHeight = Math.min(Math.round(imgH * 0.58), imgH - 1);
const markRaw = await sharp(sourcePath)
  .rotate()
  .extract({ left: 0, top: 0, width: imgW, height: markHeight })
  .png()
  .toBuffer();

const markTransparent = await removeNearWhite(markRaw);
const markTrimmed = await sharp(markTransparent).trim().png().toBuffer();

const markMeta = await sharp(markTrimmed).metadata();
const markSquareSize = Math.max(markMeta.width ?? 512, markMeta.height ?? 512);

const squareMark = await sharp(markTrimmed)
  .resize(markSquareSize, markSquareSize, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png({ quality: 95, compressionLevel: 9 })
  .toBuffer();

/** Square app/favicon icon — mark on dark emerald (readable on tabs + PWA) */
async function renderAppIcon(size) {
  const inner = Math.round(size * 0.78);
  const logo = await sharp(squareMark)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: EMERALD_BG
    }
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}

const icon512 = await renderAppIcon(512);

const ogLogo = await sharp(fullLogo)
  .resize(1000, 520, { fit: "inside", withoutEnlargement: true })
  .png()
  .toBuffer();

const og = await sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 }
  }
})
  .composite([{ input: ogLogo, gravity: "centre" }])
  .png({ quality: 92 })
  .toBuffer();

fs.writeFileSync(path.join(brandDir, "tajstay-logo-full.png"), fullLogo);
fs.writeFileSync(path.join(brandDir, "tajstay-mark.png"), squareMark);
fs.writeFileSync(path.join(brandDir, "tajstay-icon.png"), icon512);
fs.writeFileSync(path.join(brandDir, "tajstay-og.png"), og);

/** Legacy aliases — point consumers to canonical names */
fs.writeFileSync(path.join(brandDir, "tajstay-logo.png"), fullLogo);
fs.writeFileSync(path.join(brandDir, "tajstay-favicon.png"), icon512);

console.log("Source:", sourcePath);
console.log("Wrote public/brand/tajstay-logo-full.png");
console.log("Wrote public/brand/tajstay-mark.png (transparent)");
console.log("Wrote public/brand/tajstay-icon.png (512, dark emerald)");
console.log("Wrote public/brand/tajstay-og.png");
