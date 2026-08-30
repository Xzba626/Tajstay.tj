/**
 * Ensures DIRECT_URL for Prisma migrate on Vercel/Neon.
 * If unset, derives it from DATABASE_URL by stripping Neon `-pooler` host segment.
 * Usage: node scripts/ensure-direct-url.mjs <command> [args...]
 */
import { spawnSync } from "node:child_process";

function deriveDirectUrl(databaseUrl) {
  try {
    const u = new URL(databaseUrl);
    // ep-xxx-pooler.region.aws.neon.tech → ep-xxx.region.aws.neon.tech
    u.hostname = u.hostname.replace("-pooler.", ".");
    return u.toString();
  } catch {
    return databaseUrl;
  }
}

if (!process.env.DIRECT_URL?.trim()) {
  const db = process.env.DATABASE_URL?.trim();
  if (!db) {
    console.error("ensure-direct-url: DATABASE_URL is missing; cannot derive DIRECT_URL.");
    process.exit(1);
  }
  process.env.DIRECT_URL = deriveDirectUrl(db);
  if (process.env.DIRECT_URL !== db) {
    console.log("ensure-direct-url: DIRECT_URL derived from DATABASE_URL (Neon pooler → direct).");
  } else {
    console.log("ensure-direct-url: DIRECT_URL fallback = DATABASE_URL.");
  }
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/ensure-direct-url.mjs <command> [args...]");
  process.exit(1);
}

const [cmd, ...rest] = args;
const result = spawnSync(cmd, rest, {
  stdio: "inherit",
  env: process.env,
  shell: true
});

process.exit(result.status ?? 1);
