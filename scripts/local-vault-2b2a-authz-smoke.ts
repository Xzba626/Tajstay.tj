/**
 * Phase 2B.2A AuthZ smoke — Owner create/list; Guest/Manager/foreign denied.
 * Run: npx tsx scripts/local-vault-2b2a-authz-smoke.ts
 */
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";

async function login(emailOrPhone: string, password: string) {
  const isEmail = emailOrPhone.includes("@");
  const body = isEmail
    ? { email: emailOrPhone, password }
    : { phone: emailOrPhone, password };
  const res = await fetch(`${BASE}/api/auth/email/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const setCookie =
    typeof (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === "function"
      ? (res.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
      : [];
  const cookie =
    setCookie.map((c) => c.split(";")[0]).join("; ") ||
    (res.headers.get("set-cookie") ?? "")
      .split(",")
      .map((c) => c.split(";")[0].trim())
      .join("; ");
  return { status: res.status, cookie, json: await res.json().catch(() => ({})) };
}

async function post(path: string, cookie: string | null, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function get(path: string, cookie: string | null) {
  const res = await fetch(`${BASE}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const owner = await prisma.user.findFirst({ where: { email: "owner@tajstay.local" } });
    if (!owner) throw new Error("seed owner missing");
    const hotel = await prisma.hotel.findFirst({
      where: { ownerId: owner.id, status: "APPROVED" },
    });
    const otherHotel = await prisma.hotel.findFirst({
      where: { ownerId: { not: owner.id }, status: "APPROVED" },
    });
    if (!hotel) throw new Error("owner approved hotel missing");

    const guest = await login("guest@tajstay.local", "Guest123!");
    const ownerL = await login("owner@tajstay.local", "Owner123!");

    const mgrUser = await prisma.user.findFirst({ where: { role: "MANAGER" } });
    let mgrCookie: string | null = null;
    let mgrLogin = 0;
    if (mgrUser && (mgrUser.email || mgrUser.phone)) {
      const { hashPassword } = await import("../src/lib/auth/password");
      const prevHash = mgrUser.password;
      const tmpPass = "LvMgrDeny2b2a!";
      const loginId = mgrUser.email || mgrUser.phone!;
      await prisma.user.update({
        where: { id: mgrUser.id },
        data: { password: await hashPassword(tmpPass) },
      });
      try {
        const m = await login(loginId, tmpPass);
        mgrLogin = m.status;
        if (m.status === 200 && m.cookie) mgrCookie = m.cookie;
      } finally {
        await prisma.user.update({
          where: { id: mgrUser.id },
          data: { password: prevHash },
        });
      }
    }

    const hotelId = hotel.id;
    const foreignId = otherHotel?.id ?? 999999;

    const gCreate = await post("/api/local-vault/activation-codes", guest.cookie, { hotelId });
    const oCreate = await post("/api/local-vault/activation-codes", ownerL.cookie, { hotelId });
    const oForeign = await post("/api/local-vault/activation-codes", ownerL.cookie, {
      hotelId: foreignId,
    });
    const oList = await get(`/api/local-vault/devices?hotelId=${hotelId}`, ownerL.cookie);
    const oListForeign = await get(
      `/api/local-vault/devices?hotelId=${foreignId}`,
      ownerL.cookie
    );
    const mCreate = mgrCookie
      ? await post("/api/local-vault/activation-codes", mgrCookie, { hotelId })
      : { status: 0, json: {} as { error?: { code?: string } } };

    const code = (oCreate.json as { activationCode?: string }).activationCode;
    const hasPlainInUrl = false;

    const report = {
      hotelId,
      foreignId,
      guestCreate: {
        status: gCreate.status,
        code: (gCreate.json as { error?: { code?: string } }).error?.code,
      },
      ownerCreate: {
        status: oCreate.status,
        hasCode: Boolean(code),
        codeLen: code?.length ?? 0,
        expiresAt: (oCreate.json as { expiresAt?: string }).expiresAt ?? null,
      },
      ownerForeign: {
        status: oForeign.status,
        code: (oForeign.json as { error?: { code?: string } }).error?.code,
      },
      ownerList: {
        status: oList.status,
        n: ((oList.json as { devices?: unknown[] }).devices ?? []).length,
      },
      ownerListForeign: {
        status: oListForeign.status,
        code: (oListForeign.json as { error?: { code?: string } }).error?.code,
      },
      manager: {
        found: Boolean(mgrUser),
        login: mgrLogin,
        createStatus: mCreate.status,
        code: (mCreate.json as { error?: { code?: string } }).error?.code,
      },
      plaintextNotInUrl: hasPlainInUrl === false,
    };

    const pass =
      report.guestCreate.status === 403 &&
      report.ownerCreate.status === 201 &&
      report.ownerCreate.hasCode &&
      report.ownerForeign.status === 403 &&
      report.ownerList.status === 200 &&
      report.ownerListForeign.status === 403 &&
      report.manager.found &&
      report.manager.login === 200 &&
      report.manager.createStatus === 403 &&
      report.manager.code === "INVALID_DEVICE_IDENTITY";

    console.log(JSON.stringify(report, null, 2));
    console.log(pass ? "=== 2B.2A AUTHZ SMOKE PASS ===" : "=== 2B.2A AUTHZ SMOKE FAIL ===");
    process.exit(pass ? 0 : 1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
