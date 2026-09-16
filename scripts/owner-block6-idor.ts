/**
 * Manager must not manage Owner Requisites / Analytics / Expenses APIs.
 * Run: npx tsx scripts/owner-block6-idor.ts
 */
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const BASE = process.env.TAJSTAY_BASE_URL ?? "http://127.0.0.1:3000";
const prisma = new PrismaClient();

async function loginCookie(phone: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/email/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password })
  });
  if (!res.ok) throw new Error(`login failed ${phone} ${res.status}`);
  const setCookie = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const joined = setCookie.length ? setCookie.join(";") : res.headers.get("set-cookie") ?? "";
  const m = /tajstay_session=([^;]+)/.exec(joined);
  if (!m?.[1]) throw new Error("no session cookie");
  return m[1];
}

async function main() {
  const manager = await prisma.user.findFirst({
    where: { role: "MANAGER", phone: "+992917001122" }
  });
  if (!manager) throw new Error("manager fixture missing");

  const pass = "Block6IdorPass9!";
  await prisma.user.update({
    where: { id: manager.id },
    data: { password: await hashPassword(pass) }
  });

  const cookie = await loginCookie("+992917001122", pass);
  const hotelId = 1;

  const getRes = await fetch(`${BASE}/api/owner/hotels/${hotelId}/payment-methods`, {
    headers: { Cookie: `tajstay_session=${cookie}` }
  });
  assert.ok([401, 403].includes(getRes.status), `GET expected 401/403 got ${getRes.status}`);
  console.log(`PASS manager.requisites.get_denied status=${getRes.status}`);

  const postRes = await fetch(`${BASE}/api/owner/hotels/${hotelId}/payment-methods`, {
    method: "POST",
    headers: { Cookie: `tajstay_session=${cookie}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "CARD",
      displayLabel: "Hack",
      recipientName: "X",
      paymentIdentifier: "0000"
    })
  });
  assert.ok([401, 403, 405].includes(postRes.status), `POST expected deny got ${postRes.status}`);
  console.log(`PASS manager.requisites.post_denied status=${postRes.status}`);

  const analytics = await fetch(`${BASE}/api/owner/analytics?hotelId=${hotelId}&period=today`, {
    headers: { Cookie: `tajstay_session=${cookie}` }
  });
  assert.ok([401, 403].includes(analytics.status), `analytics expected deny got ${analytics.status}`);
  console.log(`PASS manager.analytics.denied status=${analytics.status}`);

  const expenses = await fetch(`${BASE}/api/owner/expenses?hotelId=${hotelId}`, {
    headers: { Cookie: `tajstay_session=${cookie}` }
  });
  assert.ok([401, 403].includes(expenses.status), `expenses expected deny got ${expenses.status}`);
  console.log(`PASS manager.expenses.denied status=${expenses.status}`);

  console.log("BLOCK6 IDOR PASS");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
