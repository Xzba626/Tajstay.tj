/**
 * BLOCK 5.1 — migrates pre-fix payment-proof / guest-document / chat-attachment files (stored
 * publicly, before this block) into private storage, and updates the referencing DB rows to the
 * new bare pathname.
 *
 * NOT run automatically. Per tajstay-database-safety, any production data mutation needs its own
 * explicit go-ahead - run a read-only count first (see --dry-run below) against production before
 * ever running this for real there. Safe to run repeatedly (idempotent: already-migrated rows are
 * skipped, matched by pathname shape - see isAlreadyPrivate/isOurOwnPublicUpload below).
 *
 * Usage:
 *   npx tsx scripts/migrate-sensitive-uploads-to-private.ts --dry-run   (counts only, no writes)
 *   npx tsx scripts/migrate-sensitive-uploads-to-private.ts             (performs the migration)
 */
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { saveUploadFile } from "../src/lib/uploads/saveUpload";
import { hasPrivateBlobStorage } from "../src/lib/uploads/saveUpload";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

/** A guest-pasted external receipt link (payment proof only) - never ours to migrate/delete. */
function isExternalPastedUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) && !value.includes(".public.blob.vercel-storage.com");
}

/** Already migrated by this script (or created post-fix): a bare pathname, no leading slash/host. */
function isAlreadyPrivate(value: string): boolean {
  return !value.startsWith("/") && !/^https?:\/\//i.test(value);
}

async function readOriginalBytes(value: string): Promise<{ buffer: Buffer; mime: string } | null> {
  if (value.startsWith("/uploads/")) {
    const abs = path.join(process.cwd(), "public", value.replace(/^\/+/, ""));
    try {
      const buffer = await readFile(abs);
      const ext = value.split(".").pop()?.toLowerCase() ?? "";
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      return { buffer, mime };
    } catch {
      return null;
    }
  }
  if (/^https?:\/\//i.test(value)) {
    const res = await fetch(value);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    return { buffer, mime };
  }
  return null;
}

async function deleteOriginal(value: string): Promise<void> {
  if (value.startsWith("/uploads/")) {
    const abs = path.join(process.cwd(), "public", value.replace(/^\/+/, ""));
    await unlink(abs).catch(() => undefined);
    return;
  }
  if (value.includes(".public.blob.vercel-storage.com")) {
    const { del } = await import("@vercel/blob");
    await del(value).catch(() => undefined);
  }
}

/** Re-uploads the given File-like buffer under `storagePath` as a private upload, using the same
 * saveUploadFile() the live write paths use, so migrated files land exactly where the app expects. */
async function migrateOne(value: string, storagePath: string): Promise<string | null> {
  const original = await readOriginalBytes(value);
  if (!original) return null;
  const ext = original.mime === "image/png" ? "png" : original.mime === "image/webp" ? "webp" : "jpg";
  const file = new File([new Uint8Array(original.buffer)], `migrated.${ext}`, { type: original.mime });
  const newPathname = await saveUploadFile(file, storagePath, original.buffer.length + 1, "private");
  return newPathname;
}

async function run() {
  console.log(`[migrate] mode: ${DRY_RUN ? "DRY RUN (counts only)" : "LIVE (will write + delete originals)"}`);
  console.log(`[migrate] private Blob configured: ${hasPrivateBlobStorage()}`);

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [{ paymentProofUrl: { not: null } }, { guestDocumentUrl: { not: null } }]
    },
    select: { id: true, paymentProofUrl: true, guestDocumentUrl: true }
  });

  let proofMigrated = 0;
  let proofSkippedExternal = 0;
  let proofAlreadyPrivate = 0;
  let proofFailed = 0;
  let docMigrated = 0;
  let docAlreadyPrivate = 0;
  let docFailed = 0;

  for (const b of bookings) {
    if (b.paymentProofUrl) {
      if (isAlreadyPrivate(b.paymentProofUrl)) {
        proofAlreadyPrivate += 1;
      } else if (isExternalPastedUrl(b.paymentProofUrl)) {
        proofSkippedExternal += 1;
      } else if (!DRY_RUN) {
        const newPathname = await migrateOne(b.paymentProofUrl, "payment-proofs");
        if (newPathname) {
          await prisma.booking.update({ where: { id: b.id }, data: { paymentProofUrl: newPathname } });
          await deleteOriginal(b.paymentProofUrl);
          proofMigrated += 1;
        } else {
          proofFailed += 1;
          console.error(`[migrate] FAILED proof for booking ${b.id}: ${b.paymentProofUrl}`);
        }
      } else {
        proofMigrated += 1; // dry-run: would migrate
      }
    }

    if (b.guestDocumentUrl) {
      if (isAlreadyPrivate(b.guestDocumentUrl)) {
        docAlreadyPrivate += 1;
      } else if (!DRY_RUN) {
        const newPathname = await migrateOne(b.guestDocumentUrl, "guest-docs");
        if (newPathname) {
          await prisma.booking.update({ where: { id: b.id }, data: { guestDocumentUrl: newPathname } });
          await deleteOriginal(b.guestDocumentUrl);
          docMigrated += 1;
        } else {
          docFailed += 1;
          console.error(`[migrate] FAILED document for booking ${b.id}: ${b.guestDocumentUrl}`);
        }
      } else {
        docMigrated += 1;
      }
    }
  }

  const chatMessages = await prisma.chatMessage.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, bookingId: true, imageUrl: true }
  });
  let chatMigrated = 0;
  let chatAlreadyPrivate = 0;
  let chatFailed = 0;
  for (const msg of chatMessages) {
    if (!msg.imageUrl) continue;
    if (isAlreadyPrivate(msg.imageUrl)) {
      chatAlreadyPrivate += 1;
      continue;
    }
    if (DRY_RUN) {
      chatMigrated += 1;
      continue;
    }
    const newPathname = await migrateOne(msg.imageUrl, `chat-attachments/${msg.bookingId}`);
    if (newPathname) {
      await prisma.chatMessage.update({ where: { id: msg.id }, data: { imageUrl: newPathname } });
      await deleteOriginal(msg.imageUrl);
      chatMigrated += 1;
    } else {
      chatFailed += 1;
      console.error(`[migrate] FAILED chat attachment message ${msg.id} (booking ${msg.bookingId}): ${msg.imageUrl}`);
    }
  }

  console.log("[migrate] --- payment proofs ---");
  console.log(`  migrated: ${proofMigrated}, already private: ${proofAlreadyPrivate}, skipped (external guest link): ${proofSkippedExternal}, failed: ${proofFailed}`);
  console.log("[migrate] --- guest documents ---");
  console.log(`  migrated: ${docMigrated}, already private: ${docAlreadyPrivate}, failed: ${docFailed}`);
  console.log("[migrate] --- chat attachments ---");
  console.log(`  migrated: ${chatMigrated}, already private: ${chatAlreadyPrivate}, failed: ${chatFailed}`);

  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error("[migrate] fatal error", err);
  await prisma.$disconnect();
  process.exit(1);
});
