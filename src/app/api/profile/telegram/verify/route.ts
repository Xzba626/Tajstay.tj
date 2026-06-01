import { z } from "zod";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { profileError, profileOk, requireProfileUser } from "@/lib/profile/profileApi";
import { verifyTelegramLoginCode, notifyTelegramLoginSuccess } from "@/lib/telegram/loginChallenge";
import { isTelegramLoginConfigured } from "@/lib/telegram/config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(8),
  code: z.string().regex(/^\d{6}$/)
});

export async function POST(req: Request) {
  if (!isTelegramLoginConfigured()) {
    return profileError("Telegram login is not configured", 503);
  }

  const user = await requireProfileUser();
  if (!user) return profileError(m(getLocale(), "profile.errAuthRequired"), 401);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return profileError(m(getLocale(), "auth.errInvalidOtp"));

  const locale = getLocale();
  const challenge = await prisma.telegramLoginChallenge.findUnique({ where: { token: parsed.data.token } });
  if (!challenge || challenge.linkUserId !== user.id) {
    return profileError(m(locale, "profile.errTelegramLink"), 400);
  }

  const result = await verifyTelegramLoginCode(parsed.data.token, parsed.data.code);
  if (!result.ok) {
    const msg =
      result.reason === "too_many_attempts"
        ? m(locale, "auth.telegramTooManyAttempts")
        : result.reason === "expired"
          ? m(locale, "auth.telegramExpired")
          : m(locale, "auth.errInvalidOtp");
    const status = result.reason === "too_many_attempts" ? 429 : 401;
    return profileError(msg, status);
  }

  if (result.userId !== user.id) {
    return profileError(m(locale, "profile.errTelegramTaken"), 409);
  }

  void notifyTelegramLoginSuccess(result.telegramId).catch(() => undefined);
  return profileOk();
}
