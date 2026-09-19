/**
 * Visual V1 repro — Category save + Staff load against local and optional BASE_URL.
 * Run: npx tsx scripts/visual-v1-repro-staff-category.ts
 */
export {};

const LOCAL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const PROD = process.env.PROD_URL ?? "https://www.tajstay.site";

async function login(base: string, email: string, password: string) {
  const res = await fetch(`${base}/api/auth/email/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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

async function probe(base: string, label: string) {
  console.log(`\n=== ${label} ${base} ===`);
  const owner = await login(base, "owner@tajstay.local", "Owner123!");
  console.log("login", owner.status, owner.cookie ? "cookie=yes" : "cookie=no", owner.json);

  if (!owner.cookie || owner.status !== 200) {
    console.log("SKIP further — login failed (expected on prod if seed creds absent)");
    // still probe unauth shape
    const staffAnon = await fetch(`${base}/api/owner/staff?hotelId=1`);
    console.log("staff anon", staffAnon.status, await staffAnon.text().then((t) => t.slice(0, 200)));
    return;
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  let hotelId = 1;
  try {
    if (base.includes("127.0.0.1") || base.includes("localhost")) {
      const o = await prisma.user.findFirst({ where: { email: "owner@tajstay.local" } });
      const h = o
        ? await prisma.hotel.findFirst({ where: { ownerId: o.id, status: "APPROVED" } })
        : null;
      if (h) hotelId = h.id;
    }
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }

  // STAFF GET
  const staffGet = await fetch(`${base}/api/owner/staff?hotelId=${hotelId}`, {
    headers: { Cookie: owner.cookie },
  });
  const staffBody = await staffGet.text();
  console.log("STAFF GET", {
    hotelId,
    status: staffGet.status,
    body: staffBody.slice(0, 500),
  });

  // STAFF POST (controlled unique phone)
  const phone = `+99290${String(Date.now()).slice(-7)}`;
  const staffPost = await fetch(`${base}/api/owner/staff`, {
    method: "POST",
    headers: { Cookie: owner.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      hotelId,
      firstName: "V1",
      lastName: "Repro",
      phone,
    }),
  });
  const staffPostBody = await staffPost.text();
  console.log("STAFF POST", {
    status: staffPost.status,
    body: staffPostBody.slice(0, 500),
    phone,
  });

  // CATEGORY create JSON (no media)
  const catJson = await fetch(`${base}/api/owner/room-types`, {
    method: "POST",
    headers: { Cookie: owner.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      hotelId,
      name: `V1 Cat ${Date.now()}`,
      basePrice: 111,
      maxGuests: 2,
      amenities: ["wifi"],
    }),
  });
  const catJsonBody = await catJson.text();
  console.log("CATEGORY JSON POST", {
    status: catJson.status,
    body: catJsonBody.slice(0, 500),
  });

  // CATEGORY create multipart FormData like UI (no files)
  const fd = new FormData();
  fd.set("hotelId", String(hotelId));
  fd.set("name", `V1 FD ${Date.now()}`);
  fd.set("basePrice", "222");
  fd.set("maxGuests", "2");
  fd.set("amenities", JSON.stringify(["wifi"]));
  const catFd = await fetch(`${base}/api/owner/room-types`, {
    method: "POST",
    headers: { Cookie: owner.cookie },
    body: fd,
  });
  const catFdBody = await catFd.text();
  console.log("CATEGORY FORMDATA POST (no files)", {
    status: catFd.status,
    body: catFdBody.slice(0, 500),
  });

  // CATEGORY with tiny fake image file to hit upload path
  const png = new Blob(
    [
      Uint8Array.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8,
        0xcf, 0xc0, 0x00, 0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe, 0xd4, 0xef, 0x00, 0x00,
        0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]),
    ],
    { type: "image/png" }
  );
  const fd2 = new FormData();
  fd2.set("hotelId", String(hotelId));
  fd2.set("name", `V1 Media ${Date.now()}`);
  fd2.set("basePrice", "333");
  fd2.set("maxGuests", "2");
  fd2.set("amenities", JSON.stringify(["wifi"]));
  fd2.append("photos", png, "probe.png");
  const catMedia = await fetch(`${base}/api/owner/room-types`, {
    method: "POST",
    headers: { Cookie: owner.cookie },
    body: fd2,
  });
  const catMediaBody = await catMedia.text();
  console.log("CATEGORY FORMDATA POST (with png)", {
    status: catMedia.status,
    body: catMediaBody.slice(0, 500),
  });
}

async function main() {
  await probe(LOCAL, "LOCAL");
  await probe(PROD, "PROD");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
