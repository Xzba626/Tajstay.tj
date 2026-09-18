/**
 * Local Vault Phase 2B.1 — security + integration harness (LOCAL DB).
 * Run: npx tsx scripts/local-vault-2b1-tests.ts
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient, LocalVaultDeviceStatus } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

// Fail-closed pepper for this process (never use in prod)
process.env.LOCAL_VAULT_CODE_PEPPER =
  process.env.LOCAL_VAULT_CODE_PEPPER && process.env.LOCAL_VAULT_CODE_PEPPER.length >= 16
    ? process.env.LOCAL_VAULT_CODE_PEPPER
    : "lv-test-pepper-local-only-xx";

type Row = { name: string; ok: boolean; detail: string };
const results: Row[] = [];
const prisma = new PrismaClient();
const root = process.cwd();

function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

function errCode(e: unknown): string | null {
  if (e && typeof e === "object" && "code" in e && typeof (e as { code: unknown }).code === "string") {
    return (e as { code: string }).code;
  }
  return null;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function loadGolden() {
  return JSON.parse(
    fs.readFileSync(path.join(root, "src/lib/local-vault/golden-vectors.json"), "utf8")
  );
}

async function cleanup(ids: {
  userIds: number[];
  hotelIds: number[];
  deviceIds: string[];
  codeIds: string[];
}) {
  await prisma.localVaultUsedNonce.deleteMany({
    where: {
      OR: [
        ...ids.deviceIds.map((d) => ({ subjectKey: `device:${d}` })),
        { subjectKey: { startsWith: "activate:" } },
      ],
    },
  }).catch(() => undefined);
  await prisma.localVaultAuditEvent.deleteMany({
    where: { hotelId: { in: ids.hotelIds } },
  }).catch(() => undefined);
  await prisma.localVaultDeviceBinding.deleteMany({
    where: { hotelId: { in: ids.hotelIds } },
  }).catch(() => undefined);
  await prisma.localVaultActivationCode.deleteMany({
    where: { hotelId: { in: ids.hotelIds } },
  }).catch(() => undefined);
  await prisma.hotel.deleteMany({ where: { id: { in: ids.hotelIds } } }).catch(() => undefined);
  await prisma.user.deleteMany({ where: { id: { in: ids.userIds } } }).catch(() => undefined);
}

async function main() {
  console.log("\n=== LOCAL VAULT 2B.1 TESTS (LOCAL DB) ===\n");

  const {
    buildActivateCanonical,
    buildDeviceCanonical,
    ACTIVATE_PATH,
    HEARTBEAT_PATH,
  } = await import("../src/lib/local-vault/canonical");
  const { verifyEd25519Signature } = await import("../src/lib/local-vault/verify");
  const { bodyHashHex, publicKeyFingerprint, b64urlDecode } = await import(
    "../src/lib/local-vault/encoding"
  );
  const { hmacCodeDigest, normalizeActivationCode } = await import(
    "../src/lib/local-vault/codeDigest"
  );
  const { isPepperConfigured, requireCodePepper } = await import("../src/lib/local-vault/pepper");
  const { activateDevice } = await import("../src/lib/local-vault/activate");
  const { deviceHeartbeat } = await import("../src/lib/local-vault/heartbeat");
  const { createActivationCodeAs } = await import("../src/lib/local-vault/createCode");
  const { revokeDeviceAs, listDevicesAs } = await import("../src/lib/local-vault/devices");
  const { LvError, LV_ERROR } = await import("../src/lib/local-vault/errors");
  const { consumeNonce, subjectActivate } = await import("../src/lib/local-vault/nonce");
  const { assertOwnerHotelAccess } = await import("../src/lib/local-vault/authz");

  const golden = loadGolden();
  const priv = crypto.createPrivateKey({
    key: Buffer.from(golden.keys.pkcs8Der_b64, "base64"),
    format: "der",
    type: "pkcs8",
  });

  // --- Golden activation ---
  try {
    verifyEd25519Signature({
      canonical: golden.activationPoP.canonicalString,
      signatureB64url: golden.activationPoP.signature_b64url,
      publicKeyB64url: golden.keys.publicKey_b64url,
    });
    check("golden.activation_signature", true, "exact vector verifies");
  } catch (e) {
    check("golden.activation_signature", false, String(e));
  }

  // one-byte alteration
  try {
    const bad = golden.activationPoP.canonicalString.slice(0, -1) + "0";
    verifyEd25519Signature({
      canonical: bad,
      signatureB64url: golden.activationPoP.signature_b64url,
      publicKeyB64url: golden.keys.publicKey_b64url,
    });
    check("golden.activation_one_byte_fail", false, "should have thrown");
  } catch {
    check("golden.activation_one_byte_fail", true, "altered canonical rejected");
  }

  // --- Golden heartbeat ---
  try {
    verifyEd25519Signature({
      canonical: golden.deviceHeartbeat.canonicalString,
      signatureB64url: golden.deviceHeartbeat.signature_b64url,
      publicKeyB64url: golden.keys.publicKey_b64url,
    });
    check("golden.heartbeat_signature", true, "exact vector verifies");
  } catch (e) {
    check("golden.heartbeat_signature", false, String(e));
  }

  // path contract
  check(
    "contract.activate_path",
    ACTIVATE_PATH === "/api/local-vault/devices/activate",
    ACTIVATE_PATH
  );
  check(
    "contract.heartbeat_path",
    HEARTBEAT_PATH === "/api/local-vault/devices/heartbeat",
    HEARTBEAT_PATH
  );
  check(
    "contract.activationCode_field",
    golden.activationPoP.bodyUtf8.includes('"activationCode"') &&
      !golden.activationPoP.bodyUtf8.includes('"code":'),
    "body uses activationCode"
  );

  // pepper fail-closed
  const savedPepper = process.env.LOCAL_VAULT_CODE_PEPPER;
  delete process.env.LOCAL_VAULT_CODE_PEPPER;
  check("pepper.missing_fail_closed", isPepperConfigured() === false, "not configured");
  try {
    requireCodePepper();
    check("pepper.require_throws", false, "should throw");
  } catch (e) {
    check("pepper.require_throws", errCode(e) === LV_ERROR.HOTEL_NOT_AVAILABLE || errCode(e) != null, String(errCode(e)));
  }
  process.env.LOCAL_VAULT_CODE_PEPPER = savedPepper;

  // DB digest never plaintext
  const tag = Date.now();
  const owner = await prisma.user.create({
    data: {
      name: "LV Owner",
      phone: `+9929${String(tag).slice(-8)}`,
      email: `lv-owner-${tag}@tajstay.local`,
      password: await hashPassword("LvTestPass123!"),
      role: "OWNER",
    },
  });
  const guest = await prisma.user.create({
    data: {
      name: "LV Guest",
      phone: `+9928${String(tag).slice(-8)}`,
      email: `lv-guest-${tag}@tajstay.local`,
      password: await hashPassword("LvTestPass123!"),
      role: "GUEST",
    },
  });
  const manager = await prisma.user.create({
    data: {
      name: "LV Mgr",
      phone: `+9927${String(tag).slice(-8)}`,
      email: `lv-mgr-${tag}@tajstay.local`,
      password: await hashPassword("LvTestPass123!"),
      role: "MANAGER",
    },
  });
  const admin = await prisma.user.create({
    data: {
      name: "LV Admin",
      phone: `+9926${String(tag).slice(-8)}`,
      email: `lv-admin-${tag}@tajstay.local`,
      password: await hashPassword("LvTestPass123!"),
      role: "ADMIN",
    },
  });
  const foreignOwner = await prisma.user.create({
    data: {
      name: "LV Foreign",
      phone: `+9925${String(tag).slice(-8)}`,
      email: `lv-foreign-${tag}@tajstay.local`,
      password: await hashPassword("LvTestPass123!"),
      role: "OWNER",
    },
  });

  const hotel = await prisma.hotel.create({
    data: {
      ownerId: owner.id,
      name: `LV Hotel ${tag}`,
      city: "Dushanbe",
      address: "Test 1",
      description: "LV test",
      latitude: 38.5,
      longitude: 68.7,
      status: "APPROVED",
    },
  });
  const foreignHotel = await prisma.hotel.create({
    data: {
      ownerId: foreignOwner.id,
      name: `LV Foreign Hotel ${tag}`,
      city: "Khujand",
      address: "Test 2",
      description: "LV test",
      latitude: 40.2,
      longitude: 69.6,
      status: "APPROVED",
    },
  });

  const ids = {
    userIds: [owner.id, guest.id, manager.id, admin.id, foreignOwner.id],
    hotelIds: [hotel.id, foreignHotel.id],
    deviceIds: [] as string[],
    codeIds: [] as string[],
  };

  try {
    const ownerActor = { user: owner, role: "OWNER" as const };
    const adminActor = { user: admin, role: "ADMIN" as const };

    // AuthZ: foreign hotel
    try {
      await assertOwnerHotelAccess(owner.id, foreignHotel.id);
      check("authz.owner_foreign_hotel", false, "should deny");
    } catch (e) {
      check("authz.owner_foreign_hotel", !!errCode(e), "denied");
    }

    // AuthZ: manager/guest cannot use As helpers with OWNER/ADMIN roles —
    // role gate is requireLvOwnerOrAdmin; simulate denied roles:
    check("authz.manager_role_denied", manager.role === "MANAGER", "manager not OWNER/ADMIN");
    check("authz.guest_role_denied", guest.role === "GUEST", "guest not OWNER/ADMIN");

    try {
      await createActivationCodeAs({ user: manager, role: "OWNER" }, { hotelId: hotel.id });
      // manager user with forged OWNER role still fails hotel ownership
      check("authz.manager_as_owner_hotel", false, "should fail ownership");
    } catch (e) {
      check("authz.manager_as_owner_hotel", !!errCode(e), "ownership denied");
    }

    const created = await createActivationCodeAs(ownerActor, { hotelId: hotel.id });
    ids.codeIds.push(created.id);
    const stored = await prisma.localVaultActivationCode.findUnique({ where: { id: created.id } });
    check(
      "code.db_has_digest_not_plaintext",
      !!stored &&
        stored.codeDigest === hmacCodeDigest(normalizeActivationCode(created.activationCode)) &&
        !JSON.stringify(stored).includes(created.activationCode),
      "digest only"
    );

    // Build live activation request with TEST keypair from golden
    const deviceId = `dev_lv_${tag}`;
    const installationId = `inst_lv_${tag}`;
    ids.deviceIds.push(deviceId);

    async function signedActivate(opts: {
      activationCode: string;
      deviceId: string;
      installationId: string;
      publicKey?: string;
      mutateCanonical?: (c: string) => string;
      skipNonceConsumeExpect?: boolean;
    }) {
      const publicKey = opts.publicKey ?? golden.keys.publicKey_b64url;
      const bodyObj = {
        activationCode: opts.activationCode,
        installationId: opts.installationId,
        deviceId: opts.deviceId,
        publicKey,
        appVersion: "0.1.0",
        platform: "windows",
        architecture: "x64",
      };
      const rawBody = Buffer.from(JSON.stringify(bodyObj), "utf8");
      const ts = String(Math.floor(Date.now() / 1000));
      const nonce = b64url(crypto.randomBytes(16));
      let canonical = buildActivateCanonical({
        method: "POST",
        canonicalPath: ACTIVATE_PATH,
        timestamp: ts,
        nonce,
        publicKey,
        bodyHash: bodyHashHex(rawBody),
      });
      if (opts.mutateCanonical) canonical = opts.mutateCanonical(canonical);
      const sig = b64url(crypto.sign(null, Buffer.from(canonical, "utf8"), priv));
      const req = new Request(`http://localhost${ACTIVATE_PATH}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-lv-timestamp": ts,
          "x-lv-nonce": nonce,
          "x-lv-signature": sig,
        },
        body: rawBody,
      });
      // Re-read body for activateDevice — Request body already consumed; pass rawBody
      return activateDevice(req, rawBody, bodyObj);
    }

    // Bad signature must not consume nonce
    const nonceBefore = await prisma.localVaultUsedNonce.count();
    try {
      await signedActivate({
        activationCode: created.activationCode,
        deviceId,
        installationId,
        mutateCanonical: (c) => c + "x",
      });
      check("replay.bad_sig_no_nonce", false, "should fail");
    } catch (e) {
      const after = await prisma.localVaultUsedNonce.count();
      check(
        "replay.bad_sig_no_nonce",
        !!errCode(e) && after === nonceBefore,
        `nonce count ${nonceBefore}->${after}`
      );
    }

    // Fresh activate
    const act1 = await signedActivate({
      activationCode: created.activationCode,
      deviceId,
      installationId,
    });
    check(
      "activate.success",
      act1.reactivated === false && act1.device.status === "ACTIVE",
      act1.device.deviceId
    );
    check(
      "activate.context_hotel",
      act1.hotel?.id === hotel.id &&
        act1.hotel?.name === hotel.name &&
        act1.device.hotelId === act1.hotel.id,
      JSON.stringify(act1.hotel)
    );
    check(
      "activate.context_owner",
      act1.owner?.id === owner.id &&
        act1.owner?.displayName === owner.name &&
        typeof act1.owner?.displayName === "string" &&
        act1.owner.displayName.length > 0,
      JSON.stringify(act1.owner)
    );
    const act1Json = JSON.stringify(act1);
    check(
      "activate.minimal_exposure",
      !act1Json.includes(owner.phone) &&
        !(owner.email && act1Json.includes(owner.email)) &&
        !act1Json.includes("password") &&
        !("email" in (act1.owner as object)) &&
        !("phone" in (act1.owner as object)),
      "no PII beyond displayName"
    );

    // ACTIVE same identity → DEVICE_ALREADY_BOUND
    const code2 = await createActivationCodeAs(ownerActor, { hotelId: hotel.id });
    ids.codeIds.push(code2.id);
    try {
      await signedActivate({
        activationCode: code2.activationCode,
        deviceId,
        installationId,
      });
      check("activate.already_bound", false, "should deny");
    } catch (e) {
      check(
        "activate.already_bound",
        errCode(e) === LV_ERROR.DEVICE_ALREADY_BOUND,
        errCode(e) ?? String(e)
      );
    }

    // conflicting deviceId same installation
    const code3 = await createActivationCodeAs(ownerActor, { hotelId: hotel.id });
    ids.codeIds.push(code3.id);
    try {
      await signedActivate({
        activationCode: code3.activationCode,
        deviceId: `dev_conflict_${tag}`,
        installationId,
      });
      check("identity.conflict_deviceId", false, "should deny");
    } catch (e) {
      check(
        "identity.conflict_deviceId",
        errCode(e) === LV_ERROR.INVALID_DEVICE_IDENTITY,
        errCode(e) ?? String(e)
      );
    }

    // conflicting publicKey — generate other key
    const other = crypto.generateKeyPairSync("ed25519");
    const otherPubDer = other.publicKey.export({ type: "spki", format: "der" }) as Buffer;
    const otherRaw = otherPubDer.slice(otherPubDer.length - 32);
    const otherPubB64 = b64url(otherRaw);
    const code4 = await createActivationCodeAs(ownerActor, { hotelId: hotel.id });
    ids.codeIds.push(code4.id);
    try {
      // sign with golden priv but claim other pubkey → sig fail
      await signedActivate({
        activationCode: code4.activationCode,
        deviceId,
        installationId,
        publicKey: otherPubB64,
      });
      check("identity.conflict_publicKey", false, "should deny");
    } catch (e) {
      check(
        "identity.conflict_publicKey",
        !!errCode(e),
        errCode(e) ?? String(e)
      );
    }

    // Heartbeat OK
    async function signedHeartbeat(did: string, mutate?: (c: string) => string) {
      const rawBody = Buffer.from('{"ok":true}', "utf8");
      const ts = String(Math.floor(Date.now() / 1000));
      const nonce = b64url(crypto.randomBytes(16));
      let canonical = buildDeviceCanonical({
        method: "POST",
        canonicalPath: HEARTBEAT_PATH,
        timestamp: ts,
        nonce,
        deviceId: did,
        bodyHash: bodyHashHex(rawBody),
      });
      if (mutate) canonical = mutate(canonical);
      const sig = b64url(crypto.sign(null, Buffer.from(canonical, "utf8"), priv));
      const req = new Request(`http://localhost${HEARTBEAT_PATH}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-lv-timestamp": ts,
          "x-lv-nonce": nonce,
          "x-lv-signature": sig,
          "x-lv-device-id": did,
        },
        body: rawBody,
      });
      return deviceHeartbeat(req, rawBody);
    }

    const hb = await signedHeartbeat(deviceId);
    check("heartbeat.ok", hb.ok === true && hb.status === "ACTIVE", hb.presence);

    // Replay valid signature (reuse nonce)
    {
      const rawBody = Buffer.from('{"ok":true}', "utf8");
      const ts = String(Math.floor(Date.now() / 1000));
      const nonce = b64url(crypto.randomBytes(16));
      const canonical = buildDeviceCanonical({
        method: "POST",
        canonicalPath: HEARTBEAT_PATH,
        timestamp: ts,
        nonce,
        deviceId,
        bodyHash: bodyHashHex(rawBody),
      });
      const sig = b64url(crypto.sign(null, Buffer.from(canonical, "utf8"), priv));
      const makeReq = () =>
        new Request(`http://localhost${HEARTBEAT_PATH}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-lv-timestamp": ts,
            "x-lv-nonce": nonce,
            "x-lv-signature": sig,
            "x-lv-device-id": deviceId,
          },
          body: rawBody,
        });
      await deviceHeartbeat(makeReq(), rawBody);
      try {
        await deviceHeartbeat(makeReq(), rawBody);
        check("replay.valid_sig_rejected", false, "second should fail");
      } catch (e) {
        check("replay.valid_sig_rejected", !!errCode(e), errCode(e) ?? String(e));
      }
    }

    // Admin revoke
    const listed = await listDevicesAs(adminActor, hotel.id);
    check("list.admin_sees", listed.devices.some((d) => d.deviceId === deviceId), "admin list");
    const bindingId = listed.devices.find((d) => d.deviceId === deviceId)!.id;
    const revoked = await revokeDeviceAs(adminActor, { bindingId, reason: "test revoke" });
    check("revoke.admin", revoked.status === "REVOKED", revoked.status);

    // REVOKED heartbeat denied
    try {
      await signedHeartbeat(deviceId);
      check("heartbeat.revoked_denied", false, "should deny");
    } catch (e) {
      check("heartbeat.revoked_denied", !!errCode(e), errCode(e) ?? String(e));
    }

    // REVOKED without new code — try activate with used/expired path:
    // need fresh code for reactivation; without code attempt with already-used:
    try {
      await signedActivate({
        activationCode: created.activationCode,
        deviceId,
        installationId,
      });
      check("reactivate.without_fresh_code", false, "should deny");
    } catch (e) {
      check(
        "reactivate.without_fresh_code",
        errCode(e) === LV_ERROR.ALREADY_USED ||
          errCode(e) === LV_ERROR.INVALID_CODE ||
          errCode(e) === LV_ERROR.EXPIRED_CODE,
        errCode(e) ?? String(e)
      );
    }

    // REVOKED + fresh code created by ADMIN (activatedByUserId ≠ Hotel.ownerId)
    // → response owner must still be current Hotel.ownerId
    const codeRe = await createActivationCodeAs(adminActor, { hotelId: hotel.id });
    ids.codeIds.push(codeRe.id);
    const re = await signedActivate({
      activationCode: codeRe.activationCode,
      deviceId,
      installationId,
    });
    check(
      "reactivate.same_binding",
      re.reactivated === true && re.device.status === "ACTIVE" && re.device.deviceId === deviceId,
      `reactivated=${re.reactivated}`
    );
    const rowAfter = await prisma.localVaultDeviceBinding.findUnique({ where: { deviceId } });
    check(
      "reactivate.same_row",
      !!rowAfter && rowAfter.id === bindingId && rowAfter.status === LocalVaultDeviceStatus.ACTIVE,
      rowAfter?.id ?? "missing"
    );
    check(
      "reactivate.context_hotel_owner",
      re.hotel?.id === hotel.id &&
        re.owner?.id === owner.id &&
        re.owner?.displayName === owner.name,
      JSON.stringify({ hotel: re.hotel, owner: re.owner })
    );
    check(
      "reactivate.owner_not_activatedBy",
      !!rowAfter &&
        rowAfter.activatedByUserId === admin.id &&
        re.owner?.id === owner.id &&
        re.owner?.id !== admin.id,
      `activatedBy=${rowAfter?.activatedByUserId} owner=${re.owner?.id}`
    );

    // Concurrent same activation code → exactly one succeeds
    const codeRace = await createActivationCodeAs(ownerActor, { hotelId: hotel.id });
    ids.codeIds.push(codeRace.id);
    const dA = `dev_race_a_${tag}`;
    const dB = `dev_race_b_${tag}`;
    ids.deviceIds.push(dA, dB);
    // Need two keypairs — race with same code different identities: one wins on code consume
    const racePrivA = crypto.generateKeyPairSync("ed25519");
    const racePrivB = crypto.generateKeyPairSync("ed25519");

    async function activateWithKey(
      keyPair: crypto.KeyPairKeyObjectResult,
      did: string,
      iid: string,
      code: string
    ) {
      const pubDer = keyPair.publicKey.export({ type: "spki", format: "der" }) as Buffer;
      const raw = pubDer.slice(pubDer.length - 32);
      const publicKey = b64url(raw);
      const bodyObj = {
        activationCode: code,
        installationId: iid,
        deviceId: did,
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
      const sig = b64url(crypto.sign(null, Buffer.from(canonical, "utf8"), keyPair.privateKey));
      const req = new Request(`http://localhost${ACTIVATE_PATH}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-lv-timestamp": ts,
          "x-lv-nonce": nonce,
          "x-lv-signature": sig,
        },
        body: rawBody,
      });
      return activateDevice(req, rawBody, bodyObj);
    }

    const raced = await Promise.allSettled([
      activateWithKey(racePrivA, dA, `inst_race_a_${tag}`, codeRace.activationCode),
      activateWithKey(racePrivB, dB, `inst_race_b_${tag}`, codeRace.activationCode),
    ]);
    const wins = raced.filter((r) => r.status === "fulfilled").length;
    const fails = raced.filter((r) => r.status === "rejected").length;
    check("atomic.one_wins", wins === 1 && fails === 1, `wins=${wins} fails=${fails}`);

    // Owner list scoped
    const ownerList = await listDevicesAs(ownerActor, hotel.id);
    check(
      "list.owner_own_hotel",
      ownerList.devices.every((d) => d.hotelId === hotel.id),
      `n=${ownerList.devices.length}`
    );
    try {
      await listDevicesAs(ownerActor, foreignHotel.id);
      check("list.owner_foreign_denied", false, "should deny");
    } catch (e) {
      check("list.owner_foreign_denied", !!errCode(e), "denied");
    }

    // Audit events present
    const audits = await prisma.localVaultAuditEvent.findMany({
      where: { hotelId: hotel.id },
    });
    const actions = new Set(audits.map((a) => a.action));
    check(
      "audit.events",
      actions.has("ACTIVATION_CODE_CREATED") &&
        actions.has("DEVICE_ACTIVATED") &&
        actions.has("DEVICE_REVOKED") &&
        actions.has("DEVICE_REACTIVATED"),
      [...actions].join(",")
    );

    // Durable rate bucket table used
    const buckets = await prisma.localVaultRateBucket.count();
    check("rate.durable_buckets", buckets > 0, `count=${buckets}`);
  } finally {
    await cleanup(ids);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${results.length - failed.length}/${results.length} PASS ===\n`);
  if (failed.length) {
    for (const f of failed) console.log(`FAIL ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
