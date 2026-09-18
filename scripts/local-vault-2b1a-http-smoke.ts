/**
 * HTTP smoke: create code (service) + POST /api/local-vault/devices/activate
 * Proves response includes hotel + owner. Not Windows E2E.
 */
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { createActivationCodeAs } from "../src/lib/local-vault/createCode";
import {
  buildActivateCanonical,
  ACTIVATE_PATH,
} from "../src/lib/local-vault/canonical";
import { bodyHashHex } from "../src/lib/local-vault/encoding";

process.env.LOCAL_VAULT_CODE_PEPPER =
  process.env.LOCAL_VAULT_CODE_PEPPER && process.env.LOCAL_VAULT_CODE_PEPPER.length >= 16
    ? process.env.LOCAL_VAULT_CODE_PEPPER
    : "lv-test-pepper-local-only-xx";

const BASE = process.env.BLOCK5C_BASE || "http://127.0.0.1:3000";
const prisma = new PrismaClient();

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function main() {
  const up = await fetch(`${BASE}/api/auth/me`).catch((e) => {
    console.log(JSON.stringify({ error: "server_down", detail: String(e) }));
    process.exit(2);
  });
  console.log(JSON.stringify({ server: "up", status: up.status }));

  const tag = Date.now();
  const kp = crypto.generateKeyPairSync("ed25519");
  const pubDer = kp.publicKey.export({ type: "spki", format: "der" }) as Buffer;
  const rawPub = pubDer.slice(pubDer.length - 32);
  const publicKey = b64url(rawPub);
  const deviceId = `dev_http_${tag}`;
  const installationId = `inst_http_${tag}`;

  const owner = await prisma.user.create({
    data: {
      name: "HTTP Owner",
      phone: `+99293${String(tag).slice(-8)}`,
      email: `http-owner-${tag}@tajstay.local`,
      password: await hashPassword("HttpOwnerPass1!"),
      role: "OWNER",
    },
  });
  const hotel = await prisma.hotel.create({
    data: {
      ownerId: owner.id,
      name: `HTTP Hotel ${tag}`,
      city: "Dushanbe",
      address: "H",
      description: "http",
      latitude: 38.5,
      longitude: 68.7,
      status: "APPROVED",
    },
  });

  try {
    const created = await createActivationCodeAs(
      { user: owner, role: "OWNER" },
      { hotelId: hotel.id }
    );
    const bodyObj = {
      activationCode: created.activationCode,
      installationId,
      deviceId,
      publicKey,
      appVersion: "0.1.0",
      platform: "windows",
      architecture: "x64",
    };
    const rawBody = Buffer.from(JSON.stringify(bodyObj), "utf8");
    const ts = String(Math.floor(Date.now() / 1000));
    const nonce = b64url(crypto.randomBytes(16));
    const canonical = buildActivateCanonical({
      method: "POST",
      canonicalPath: ACTIVATE_PATH,
      timestamp: ts,
      nonce,
      publicKey,
      bodyHash: bodyHashHex(rawBody),
    });
    const sig = b64url(crypto.sign(null, Buffer.from(canonical, "utf8"), kp.privateKey));

    const res = await fetch(`${BASE}${ACTIVATE_PATH}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-lv-timestamp": ts,
        "x-lv-nonce": nonce,
        "x-lv-signature": sig,
      },
      body: rawBody,
    });
    const json = (await res.json()) as {
      device?: { hotelId: number };
      hotel?: { id: number; name: string };
      owner?: { id: number; displayName: string };
      reactivated?: boolean;
      error?: { code: string };
    };
    console.log(JSON.stringify({ httpStatus: res.status, body: json }, null, 2));

    const ok =
      res.status === 200 &&
      json.hotel?.id === hotel.id &&
      json.hotel?.name === hotel.name &&
      json.owner?.id === owner.id &&
      json.owner?.displayName === owner.name &&
      json.device?.hotelId === hotel.id &&
      json.reactivated === false;
    console.log(JSON.stringify({ runtime_activation_context: ok ? "PASS" : "FAIL" }));
    process.exit(ok ? 0 : 1);
  } finally {
    await prisma.localVaultDeviceBinding.deleteMany({ where: { hotelId: hotel.id } }).catch(() => undefined);
    await prisma.localVaultActivationCode.deleteMany({ where: { hotelId: hotel.id } }).catch(() => undefined);
    await prisma.localVaultAuditEvent.deleteMany({ where: { hotelId: hotel.id } }).catch(() => undefined);
    await prisma.hotel.delete({ where: { id: hotel.id } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: owner.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
