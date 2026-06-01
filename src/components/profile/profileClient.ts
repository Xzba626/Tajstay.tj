"use client";

import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

async function parseProfileResponse(res: Response, locale: Locale) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : m(locale, "profile.errSave"));
  }
  return data;
}

export async function patchProfileJson(url: string, body: Record<string, unknown>, locale: Locale) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body)
  });
  return parseProfileResponse(res, locale);
}

export async function postProfileJson(url: string, body: Record<string, unknown>, locale: Locale) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body)
  });
  return parseProfileResponse(res, locale);
}
