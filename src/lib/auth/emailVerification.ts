import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { safeSend } from "@/lib/email/safeSend";
import { renderEmailVerificationEmail } from "@/lib/email/templates";

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
    subject: "TajStay: подтвердите ваш email",
    html: renderEmailVerificationEmail(verifyUrl)
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
