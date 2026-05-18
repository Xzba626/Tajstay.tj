import { NextResponse } from "next/server";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n/locale";

export async function POST(req: Request) {
  let body: { locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const localeRaw = body.locale?.trim();
  if (!localeRaw) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }
  const locale = normalizeLocale(localeRaw);
  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax"
  });
  return res;
}
