import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function run(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      cwd: projectRoot,
      env: { ...process.env, ...(opts.env || {}) }
    });
    child.on("exit", (code, signal) => {
      if (signal) return reject(new Error(`${command} terminated by ${signal}`));
      if (code !== 0) return reject(new Error(`${command} exited with ${code}`));
      resolve();
    });
  });
}

async function main() {
  const nextDir = path.join(projectRoot, ".next");
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log("[dev:recover] Cleared .next");
  }

  await run(process.execPath, [path.join(projectRoot, "node_modules", "prisma", "build", "index.js"), "generate"]);
  console.log("[dev:recover] Prisma client regenerated");

  await run(
    process.execPath,
    [path.join(projectRoot, "node_modules", "next", "dist", "bin", "next"), "dev"],
    {
      env: {
        DATABASE_URL:
          process.env.DATABASE_URL ||
          "postgresql://postgres:postgres@localhost:5432/tajstay?schema=public",
        PRISMA_CLIENT_ENGINE_TYPE: "library"
      }
    }
  );
}

main().catch((err) => {
  console.error("[dev:recover] Failed:", err.message);
  process.exit(1);
});
