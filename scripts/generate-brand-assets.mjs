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

const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : fallbackSource;

if (!fs.existsSync(sourcePath)) {
  console.error("Source logo not found:", sourcePath);
  process.exit(1);
}

if (!fs.existsSync(brandDir)) fs.mkdirSync(brandDir, { recursive: true });

const base = sharp(sourcePath).rotate();
const meta = await base.metadata();
const imgW = meta.width ?? 1024;
const imgH = meta.height ?? 1024;

const fullLogo = await sharp(sourcePath).rotate().png({ quality: 95, compressionLevel: 9 }).toBuffer();

/** Icon mark: top ~62% of full logo (above TAJSTAY wordmark) */
const markHeight = Math.min(Math.round(imgH * 0.62), imgH - 1);
const markBuffer = await sharp(sourcePath)
  .rotate()
  .extract({ left: 0, top: 0, width: imgW, height: markHeight })
  .png({ quality: 95, compressionLevel: 9 })
  .toBuffer();

const markMeta = await sharp(markBuffer).metadata();
const markMax = Math.max(markMeta.width ?? 512, markMeta.height ?? 512);

const squareMark = await sharp(markBuffer)
  .resize(markMax, markMax, {
    fit: "contain",
    background: { r: 255, g: 255, b: 255, alpha: 0 }
  })
  .png({ quality: 95, compressionLevel: 9 })
  .toBuffer();

fs.writeFileSync(path.join(brandDir, "tajstay-logo.png"), fullLogo);
fs.writeFileSync(path.join(brandDir, "tajstay-mark.png"), squareMark);

const favicon512 = await sharp(squareMark)
  .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .png()
  .toBuffer();

fs.writeFileSync(path.join(brandDir, "tajstay-favicon.png"), favicon512);

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

fs.writeFileSync(path.join(brandDir, "tajstay-og.png"), og);

console.log("Wrote public/brand/tajstay-logo.png");
console.log("Wrote public/brand/tajstay-mark.png");
console.log("Wrote public/brand/tajstay-favicon.png");
console.log("Wrote public/brand/tajstay-og.png");
