import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { profileError, profileOk, requireProfileUser } from "@/lib/profile/profileApi";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/profile/telegram/change/status?sessionToken=… — poll whether bot linked Telegram. */
export async function GET(req: Request) {
  const user = await requireProfileUser();
  if (!user) return profileError(m(getLocale(), "profile.errAuthRequired"), 401);

  const sessionToken = new URL(req.url).searchParams.get("sessionToken")?.trim() ?? "";
  if (!sessionToken) return profileError(m(getLocale(), "profile.errTelegramLink"));

  const row = await prisma.telegramChangeRequest.findUnique({ where: { sessionToken } });
  if (!row || row.userId !== user.id) {
    return profileOk({ ready: false, status: "not_found" as const });
  }
  if (row.usedAt) return profileOk({ ready: false, status: "used" as const });
  if (row.expiresAt.getTime() < Date.now()) {
    return profileOk({ ready: false, status: "expired" as const });
  }

  return profileOk({
    ready: Boolean(row.telegramId && row.codeHash),
    status: row.telegramId && row.codeHash ? ("code_sent" as const) : ("awaiting_bot" as const)
  });
}
