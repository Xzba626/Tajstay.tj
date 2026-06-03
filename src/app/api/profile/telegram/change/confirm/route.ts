import { revalidatePath } from "next/cache";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { profileError, profileOk, requireProfileUser } from "@/lib/profile/profileApi";
import { confirmTelegramChange } from "@/lib/profile/telegramChange";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const user = await requireProfileUser();
  if (!user) return profileError(m(getLocale(), "profile.errAuthRequired"), 401);

  const body = await req.json().catch(() => ({}));
  const sessionToken = String(body.sessionToken ?? "").trim();
  const code = String(body.code ?? "");
  const locale = getLocale();

  if ("telegramId" in body || "newTelegramId" in body) {
    console.warn("[telegram/change/confirm] rejected body with telegramId — must come from pending row only", {
      userId: user.id
    });
  }

  console.info("[telegram/change/confirm] request", {
    userId: user.id,
    sessionTokenPrefix: sessionToken ? `${sessionToken.slice(0, 6)}…` : null,
    sessionTelegramBefore: user.telegramId,
    sessionUsernameBefore: user.telegramUsername
  });

  const result = await confirmTelegramChange(user.id, sessionToken, code);

  if (!result.ok) {
    console.warn("[telegram/change/confirm] failed", { userId: user.id, reason: result.reason });
    if (result.reason === "expired") return profileError(m(locale, "auth.telegramExpired"));
    if (result.reason === "taken") return profileError(m(locale, "profile.errTelegramTaken"));
    if (result.reason === "no_code") return profileError(m(locale, "profile.errTelegramLink"));
    if (result.reason === "invalid") return profileError(m(locale, "profile.errTelegramCode"));
    return profileError(m(locale, "profile.errTelegramCode"));
  }

  revalidatePath("/profile");
  revalidatePath("/profile/account");
  revalidatePath("/profile/account/telegram");

  return profileOk({
    telegramId: result.telegramId,
    telegramUsername: result.telegramUsername
  });
}
