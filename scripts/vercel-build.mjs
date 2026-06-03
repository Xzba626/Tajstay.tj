/**
 * Vercel production build: migrate (direct Neon connection), generate client, Next build.
 *
 * Neon pooler URLs cannot hold Prisma advisory locks — migrations need a direct host.
 * If DIRECT_URL is unset but DATABASE_URL uses "-pooler", we derive the direct URL.
 */
import { execSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { ensureDirectUrl } from "./ensure-direct-database-url.mjs";

function run(cmd) {
  try {
    execSync(cmd, { stdio: "inherit", env: process.env });
  } catch (err) {
    const e = err;
    if (e?.stdout) process.stderr.write(e.stdout);
    if (e?.stderr) process.stderr.write(e.stderr);
    throw err;
  }
}

async function migrateDeployWithRetry(maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      run("npx prisma migrate deploy");
      return;
    } catch {
      if (attempt >= maxAttempts) {
        throw new Error("prisma migrate deploy failed after retries");
      }
      const waitMs = 10_000 * attempt;
      console.warn(
        `[vercel-build] migrate deploy attempt ${attempt}/${maxAttempts} failed (advisory lock / DB timeout). Retrying in ${waitMs / 1000}s…`
      );
      await sleep(waitMs);
    }
  }
}

ensureDirectUrl();
if (process.env.DIRECT_URL?.includes("-pooler")) {
  console.warn(
    "[vercel-build] DIRECT_URL still points at pooler — set Neon direct URL in Vercel env"
  );
}
await migrateDeployWithRetry();
run("npx prisma generate");
run("npx next build");
