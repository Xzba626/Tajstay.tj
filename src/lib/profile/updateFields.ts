import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { isPlaceholderAccountPhone, buildUniquePlaceholderPhone } from "@/lib/auth/accountPhone";
import { normalizePhone } from "@/lib/validation/phone";
import { buildFullName, resolveUserNames } from "@/lib/profile/userName";

export async function updateProfileFirstName(userId: number, firstName: string) {
  const trimmed = firstName.trim();
  if (trimmed.length < 1) throw new Error("NAME_TOO_SHORT");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("NOT_FOUND");
  const { lastName } = resolveUserNames(user);
  const name = buildFullName(trimmed, lastName);
  return prisma.user.update({
    where: { id: userId },
    data: { firstName: trimmed, lastName, name }
  });
}

export async function updateProfileLastName(userId: number, lastName: string) {
  const trimmed = lastName.trim();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("NOT_FOUND");
  const { firstName } = resolveUserNames(user);
  const name = buildFullName(firstName, trimmed) || firstName;
  return prisma.user.update({
    where: { id: userId },
    data: { firstName, lastName: trimmed, name }
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

export async function updateProfileSettings(
  userId: number,
  input: { preferredCurrency?: string; preferredTheme?: string }
) {
  const data: { preferredCurrency?: string; preferredTheme?: string } = {};
  if (input.preferredCurrency) data.preferredCurrency = input.preferredCurrency;
  if (input.preferredTheme) data.preferredTheme = input.preferredTheme;
  if (!Object.keys(data).length) return prisma.user.findUnique({ where: { id: userId } });
  return prisma.user.update({ where: { id: userId }, data });
}
