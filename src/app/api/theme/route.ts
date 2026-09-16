import { NextResponse } from "next/server";
import { THEME_COOKIE, normalizeTheme } from "@/lib/theme";

/** Mirrors /api/locale exactly — same cookie-write pattern already proven in this codebase. */
export async function POST(req: Request) {
  let body: { theme?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const theme = normalizeTheme(body.theme);
  const res = NextResponse.json({ ok: true, theme });
  res.cookies.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax"
  });
  return res;
}
