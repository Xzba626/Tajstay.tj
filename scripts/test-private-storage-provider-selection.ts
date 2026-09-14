/**
 * BLOCK 5.1A — targeted test for getPrivateStorageAdapter()'s provider-selection invariant:
 *   - local/dev (not Vercel), no private token -> LocalDiskPrivateAdapter
 *   - private Blob token configured -> VercelBlobPrivateAdapter (regardless of runtime)
 *   - Vercel-like runtime, no private token -> explicit configuration error, NOT LocalDiskAdapter
 *   - none of the above ever resolves to anything touching public storage
 *
 * Run: npx tsx scripts/test-private-storage-provider-selection.ts
 */
import { getPrivateStorageAdapter } from "../src/lib/uploads/private-storage";
import { LocalDiskPrivateAdapter } from "../src/lib/uploads/private-storage/localDiskAdapter";
import { VercelBlobPrivateAdapter } from "../src/lib/uploads/private-storage/vercelBlobAdapter";
import { ImageUploadError } from "../src/lib/uploads/imageUploadError";

let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  PASS: ${label}`);
  } else {
    console.error(`  FAIL: ${label}`);
    failures += 1;
  }
}

function resetEnv() {
  delete process.env.VERCEL;
  delete process.env.BLOB_PRIVATE_READ_WRITE_TOKEN;
}

console.log("[test] Case 1: local/dev, no private token -> LocalDiskPrivateAdapter");
resetEnv();
{
  const adapter = getPrivateStorageAdapter();
  check("returns LocalDiskPrivateAdapter", adapter instanceof LocalDiskPrivateAdapter);
  check("does NOT return VercelBlobPrivateAdapter", !(adapter instanceof VercelBlobPrivateAdapter));
}

console.log("[test] Case 2: private Blob token configured -> VercelBlobPrivateAdapter");
resetEnv();
process.env.BLOB_PRIVATE_READ_WRITE_TOKEN = "test-token-value";
{
  const adapter = getPrivateStorageAdapter();
  check("returns VercelBlobPrivateAdapter", adapter instanceof VercelBlobPrivateAdapter);
  check("does NOT return LocalDiskPrivateAdapter", !(adapter instanceof LocalDiskPrivateAdapter));
}

console.log("[test] Case 2b: private Blob token configured even on Vercel runtime -> VercelBlobPrivateAdapter");
resetEnv();
process.env.VERCEL = "1";
process.env.BLOB_PRIVATE_READ_WRITE_TOKEN = "test-token-value";
{
  const adapter = getPrivateStorageAdapter();
  check("returns VercelBlobPrivateAdapter", adapter instanceof VercelBlobPrivateAdapter);
}

console.log("[test] Case 3: Vercel-like runtime, NO private token -> explicit configuration error, not local disk");
resetEnv();
process.env.VERCEL = "1";
{
  let threw: unknown = null;
  let adapterIfNoThrow: unknown = null;
  try {
    adapterIfNoThrow = getPrivateStorageAdapter();
  } catch (err) {
    threw = err;
  }
  check("threw an error (did not silently return an adapter)", threw !== null && adapterIfNoThrow === null);
  check(
    "threw ImageUploadError with code private_storage_not_configured",
    threw instanceof ImageUploadError && threw.code === "private_storage_not_configured"
  );
  check(
    "did NOT fall through to LocalDiskPrivateAdapter",
    !(adapterIfNoThrow instanceof LocalDiskPrivateAdapter)
  );
}

async function checkStructural() {
  console.log("[test] Case 4: structural check - no reference to public storage anywhere in the private path");
  resetEnv();
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const files = [
    "../src/lib/uploads/private-storage/index.ts",
    "../src/lib/uploads/private-storage/localDiskAdapter.ts",
    "../src/lib/uploads/private-storage/vercelBlobAdapter.ts"
  ];
  for (const f of files) {
    const content = await fs.readFile(path.join(__dirname, f), "utf8");
    check(`${f} does not reference public/uploads or a public bucket`, !/public[/\\]uploads|access:\s*["']public["']/.test(content));
  }
}

checkStructural().then(() => {
  resetEnv();
  console.log(failures === 0 ? "\n[test] ALL PASS" : `\n[test] ${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
});
