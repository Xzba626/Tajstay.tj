/**
 * Запуск next dev с cwd = канонический путь ОС (Windows: единый регистр букв в пути).
 * Уменьшает предупреждения Webpack "multiple modules with names that only differ in casing"
 * для папок с кириллицей, когда разные инструменты передают "Новая" vs "новая".
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

let cwd = projectRoot;
try {
  cwd = fs.realpathSync.native(projectRoot);
} catch {
  try {
    cwd = fs.realpathSync(projectRoot);
  } catch {
    // оставляем projectRoot
  }
}

process.chdir(cwd);

/** На Windows иногда ломается исходящий fetch к Google OAuth (undici) при предпочтении IPv6 — см. NODE_OPTIONS ниже. */
function mergeNodeOptionsForDev() {
  const cur = (process.env.NODE_OPTIONS ?? "").trim();
  if (/\bdns-result-order=/i.test(cur)) return cur;
  return cur ? `${cur} --dns-result-order=ipv4first` : "--dns-result-order=ipv4first";
}

const nextCli = path.join(cwd, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextCli, "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd,
  env: { ...process.env, NODE_OPTIONS: mergeNodeOptionsForDev() }
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
