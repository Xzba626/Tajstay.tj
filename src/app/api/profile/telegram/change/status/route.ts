import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { profileError, profileOk, requireProfileUser } from "@/lib/profile/profileApi";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/security/rateLimit";
import { expireStaleTelegramChangeRequests } from "@/lib/profile/telegramChange";

export const dynamic = "force-dynamic";

/** GET /api/profile/telegram/change/status?sessionToken=… — poll whether bot linked Telegram. */
export async function GET(req: Request) {
  const user = await requireProfileUser();
  if (!user) return profileError(m(getLocale(), "profile.errAuthRequired"), 401);

  const rl = rateLimit(`profile-tg-change-status:user:${user.id}`, 1, 3_000);
  if (!rl.ok) {
    return profileError(m(getLocale(), "auth.errTooManyAttempts"), 429);
  }

  const sessionToken = new URL(req.url).searchParams.get("sessionToken")?.trim() ?? "";
  if (!sessionToken) return profileError(m(getLocale(), "profile.errTelegramLink"));

  await expireStaleTelegramChangeRequests(user.id);

  const row = await prisma.telegramChangeRequest.findFirst({
    where: { sessionToken, userId: user.id },
    orderBy: { createdAt: "desc" }
  });

  if (!row) {
    return profileOk({ ready: false, status: "not_found" as const });
  }

  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.telegramChangeRequest.update({
      where: { id: row.id },
      data: { usedAt: new Date() }
    });
    return profileOk({ ready: false, status: "expired" as const });
  }

  if (row.usedAt) {
    const fresh = await prisma.user.findUnique({
      where: { id: user.id },
      select: { telegramId: true, telegramUsername: true }
    });
    const confirmed =
      row.telegramId != null && fresh?.telegramId != null && fresh.telegramId === row.telegramId;
    return profileOk({
      ready: false,
      status: confirmed ? ("confirmed" as const) : ("used" as const),
      telegramId: fresh?.telegramId ?? null,
      telegramUsername: fresh?.telegramUsername ?? null
    });
  }

  return profileOk({
    ready: Boolean(row.telegramId && row.codeHash),
    status: row.telegramId && row.codeHash ? ("code_sent" as const) : ("awaiting_bot" as const)
  });
}
