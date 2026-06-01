import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { isPlaceholderAccountPhone, buildUniquePlaceholderPhone } from "@/lib/auth/accountPhone";
import { normalizePhone } from "@/lib/validation/phone";

export async function updateProfileName(userId: number, name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2) throw new Error("NAME_TOO_SHORT");
  return prisma.user.update({ where: { id: userId }, data: { name: trimmed } });
}

export async function updateProfileEmail(userId: number, emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("EMAIL_INVALID");
  return prisma.user.update({
    where: { id: userId },
    data: { email, emailVerified: new Date(), verified: true }
  });
}

export async function clearProfileEmail(userId: number) {
  return prisma.user.update({
    where: { id: userId },
    data: { email: null, emailVerified: null }
  });
}

export async function updateProfilePhone(userId: number, rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new Error("PHONE_INVALID");
  return prisma.user.update({
    where: { id: userId },
    data: { phone, phoneVerified: true, verified: true }
  });
}

export async function updateProfilePassword(userId: number, password: string) {
  if (password.length < 8) throw new Error("PASSWORD_TOO_SHORT");
  const passwordHash = await hashPassword(password);
  return prisma.user.update({ where: { id: userId }, data: { password: passwordHash } });
}

export async function disconnectProfileTelegram(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("NOT_FOUND");

  const data: {
    telegramId: null;
    telegramUsername: null;
    telegramPhotoUrl: null;
    image?: string | null;
    phone?: string;
  } = {
    telegramId: null,
    telegramUsername: null,
    telegramPhotoUrl: null
  };

  if (user.image && user.image === user.telegramPhotoUrl) {
    data.image = null;
  }

  if (isPlaceholderAccountPhone(user.phone) || user.phone.startsWith("telegram_")) {
    data.phone = await buildUniquePlaceholderPhone("telegram");
  }

  return prisma.user.update({ where: { id: userId }, data });
}
