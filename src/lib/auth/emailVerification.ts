import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { safeSend } from "@/lib/email/safeSend";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function buildEmailVerificationUrl(token: string): string {
  const base = (process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}

export async function createEmailVerificationToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.emailVerificationToken.upsert({
    where: { userId },
    create: { userId, token, expiresAt },
    update: { token, expiresAt }
  });

  return token;
}

export async function sendEmailVerificationEmail(input: { to: string; token: string }): Promise<{ ok: boolean; skipped?: boolean }> {
  const verifyUrl = buildEmailVerificationUrl(input.token);
  const result = await safeSend({
    to: input.to,
    subject: "TajStay: Подтвердите ваш email",
    html: `
      <h2>Подтвердите ваш email</h2>
      <p>Нажмите на кнопку ниже чтобы подтвердить аккаунт:</p>
      <a href="${verifyUrl}" style="
        display:inline-block;background:#1a6b3c;color:white;
        padding:12px 24px;border-radius:8px;text-decoration:none;
      ">Подтвердить email</a>
      <p style="color:#666;font-size:12px;">
        Ссылка действительна 24 часа.
        Если вы не регистрировались — проигнорируйте это письмо.
      </p>
    `
  });
  return { ok: result.ok, skipped: "skipped" in result ? result.skipped : undefined };
}

export async function issueEmailVerification(userId: number, email: string): Promise<{ ok: boolean; skipped?: boolean }> {
  const token = await createEmailVerificationToken(userId);
  return sendEmailVerificationEmail({ to: email, token });
}

export async function verifyEmailByToken(token: string): Promise<"ok" | "invalid" | "expired"> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token: token.trim() }
  });
  if (!record) return "invalid";
  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } }).catch(() => undefined);
    return "expired";
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() }
    }),
    prisma.emailVerificationToken.delete({ where: { id: record.id } })
  ]);

  return "ok";
}
