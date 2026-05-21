import crypto from "crypto";
import type { User } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/validation/phone";

export type VerifiedFirebasePhone = {
  firebaseUid: string;
  phone: string;
};

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebasePhone> {
  const { getFirebaseAdminAuth } = await import("@/lib/firebase/admin");
  const decoded = await (await getFirebaseAdminAuth()).verifyIdToken(idToken);
  const firebaseUid = decoded.uid?.trim();
  const phone = normalizePhone(decoded.phone_number ?? "");
  if (!firebaseUid || !phone) {
    throw new Error("Invalid Firebase token");
  }
  return { firebaseUid, phone };
}

export async function findUserByFirebaseOrPhone(firebaseUid: string, phone: string): Promise<User | null> {
  return (
    (await prisma.user.findUnique({ where: { firebaseUid } })) ??
    (await prisma.user.findUnique({ where: { phone } }))
  );
}

/** Создаёт нового пользователя после Firebase Phone Auth (всегда GUEST). */
export async function createUserFromFirebasePhone(params: {
  firebaseUid: string;
  phone: string;
  name: string;
  email?: string | null;
}): Promise<User> {
  const normalizedName = params.name.trim();
  const normalizedEmail = params.email?.trim().toLowerCase() || null;
  const passwordHash = await hashPassword(`firebase-${crypto.randomBytes(8).toString("hex")}`);

  return prisma.user.create({
    data: {
      name: normalizedName,
      phone: params.phone,
      firebaseUid: params.firebaseUid,
      phoneVerified: true,
      verified: true,
      email: normalizedEmail,
      password: passwordHash,
      role: "GUEST"
    }
  });
}

/** Вход существующего пользователя: обновляет firebaseUid / phoneVerified. */
export async function loginUserFromFirebasePhone(params: {
  firebaseUid: string;
  phone: string;
}): Promise<User> {
  const existing = await findUserByFirebaseOrPhone(params.firebaseUid, params.phone);
  if (!existing) throw new Error("Account not found");

  if (existing.firebaseUid && existing.firebaseUid !== params.firebaseUid) {
    throw new Error("Phone already linked to another account");
  }

  return prisma.user.update({
    where: { id: existing.id },
    data: {
      firebaseUid: params.firebaseUid,
      phone: params.phone,
      phoneVerified: true,
      verified: true
    }
  });
}

/** @deprecated Используйте createUserFromFirebasePhone / loginUserFromFirebasePhone */
export async function upsertUserFromFirebasePhone(params: {
  firebaseUid: string;
  phone: string;
  name?: string;
  email?: string | null;
  password?: string;
}): Promise<User> {
  const { firebaseUid, phone } = params;
  const normalizedName = params.name?.trim() || "Пользователь";
  const normalizedEmail = params.email?.trim().toLowerCase() || null;

  const existing = await findUserByFirebaseOrPhone(firebaseUid, phone);

  if (existing) {
    if (existing.firebaseUid && existing.firebaseUid !== firebaseUid) {
      throw new Error("Phone already linked to another account");
    }
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        firebaseUid,
        phone,
        phoneVerified: true,
        verified: true,
        name: params.name?.trim() ? normalizedName : existing.name,
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        ...(params.password ? { password: await hashPassword(params.password) } : {})
      }
    });
  }

  const passwordHash = params.password
    ? await hashPassword(params.password)
    : await hashPassword(`firebase-${crypto.randomBytes(8).toString("hex")}`);

  return prisma.user.create({
    data: {
      name: normalizedName,
      phone,
      firebaseUid,
      phoneVerified: true,
      verified: true,
      email: normalizedEmail,
      password: passwordHash,
      role: "GUEST"
    }
  });
}
