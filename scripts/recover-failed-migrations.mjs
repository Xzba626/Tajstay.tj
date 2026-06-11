/**
 * Mark known recoverable failed Prisma migrations as rolled back so deploy can retry
 * with idempotent SQL (e.g. PropertyType already exists from an earlier migration).
 */
import { execSync } from "node:child_process";

const RECOVERABLE = ["20260610120000_part3_property_types_booking_fields"];

function runQuiet(cmd) {
  try {
    execSync(cmd, { env: process.env, encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] });
    return true;
  } catch {
    return false;
  }
}

export function recoverFailedMigrations() {
  for (const name of RECOVERABLE) {
    if (runQuiet(`npx prisma migrate resolve --rolled-back ${name}`)) {
      console.log(`[recover-migrations] marked rolled back: ${name}`);
    }
  }
}
