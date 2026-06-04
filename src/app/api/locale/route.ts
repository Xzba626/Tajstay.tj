import { NextResponse } from "next/server";
import { LOCALE_COOKIE, LOCALE_MANUAL_COOKIE, LOCALE_PROMPT_DONE_COOKIE, normalizeLocale } from "@/lib/i18n/locale";

const ONE_YEAR = 60 * 60 * 24 * 400;

export async function POST(req: Request) {
  let body: { locale?: string; manual?: boolean; promptDone?: boolean };
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
    maxAge: ONE_YEAR,
    sameSite: "lax"
  });
  if (body.manual !== false) {
    res.cookies.set(LOCALE_MANUAL_COOKIE, "1", { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
  }
  if (body.promptDone) {
    res.cookies.set(LOCALE_PROMPT_DONE_COOKIE, "1", { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
  }
  return res;
}
