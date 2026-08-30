import { execSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env });
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    [
      "",
      "Vercel build: DATABASE_URL is not set.",
      "Add DATABASE_URL in Project Settings → Environment Variables.",
      ""
    ].join("\n")
  );
  process.exit(1);
}

if (!process.env.DIRECT_URL?.trim()) {
  console.warn(
    "[vercel-build] DIRECT_URL is not set; using DATABASE_URL for prisma migrate deploy. " +
      "On Neon, set DIRECT_URL to the non-pooler host to avoid P1002 advisory lock timeouts."
  );
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

run("npx prisma migrate deploy");
run("npx prisma generate");
run("npx next build");
