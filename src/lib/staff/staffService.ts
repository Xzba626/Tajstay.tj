import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { normalizePhone } from "@/lib/validation/phone";
import { writeOwnerHotelAudit } from "@/lib/owner/analytics/audit";
import {
  STAFF_ROLE,
  STAFF_STATUS,
  generateInviteToken,
  generateTempPassword,
  hashInviteToken
} from "@/lib/staff/types";

async function assertOwnerHotel(ownerId: number, hotelId: number) {
  const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, ownerId }, select: { id: true } });
  if (!hotel) throw new Error("FORBIDDEN");
  return hotel;
}

export async function listHotelStaff(ownerId: number, hotelId: number) {
  await assertOwnerHotel(ownerId, hotelId);
  return prisma.hotelStaff.findMany({
    where: { hotelId, status: { not: STAFF_STATUS.REMOVED } },
    include: {
      user: { select: { id: true, name: true, phone: true, email: true, role: true, updatedAt: true } }
    },
    orderBy: { createdAt: "desc" }
  });
}

/**
 * Create Manager for a hotel. Returns one-time plaintext tempPassword + inviteToken for Owner to share.
 * Never persists plaintext.
 */
export async function createHotelManager(input: {
  ownerId: number;
  hotelId: number;
  firstName: string;
  lastName: string;
  phone: string;
}) {
  await assertOwnerHotel(input.ownerId, input.hotelId);
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error("INVALID_PHONE");
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) throw new Error("INVALID_NAME");
  const name = `${firstName} ${lastName}`.trim();

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const inviteToken = generateInviteToken();
  const inviteTokenHash = hashInviteToken(inviteToken);
  const inviteExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48); // 48h

  const result = await prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { phone } });
    if (user) {
      if (user.role === "OWNER" || user.role === "ADMIN") throw new Error("PHONE_HAS_PRIVILEGED_ROLE");
      const existing = await tx.hotelStaff.findUnique({
        where: { hotelId_userId: { hotelId: input.hotelId, userId: user.id } }
      });
      if (existing && existing.status !== STAFF_STATUS.REMOVED) throw new Error("ALREADY_STAFF");
      // Re-invite: reset credentials hash only when converting guest→manager or reactivating removed.
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          name,
          role: "MANAGER",
          password: passwordHash
        }
      });
      if (existing) {
        await tx.hotelStaff.update({
          where: { id: existing.id },
          data: {
            status: STAFF_STATUS.INVITED,
            staffRole: STAFF_ROLE.MANAGER,
            inviteTokenHash,
            inviteExpiresAt,
            mustChangePassword: true,
            createdByUserId: input.ownerId
          }
        });
      } else {
        await tx.hotelStaff.create({
          data: {
            hotelId: input.hotelId,
            userId: user.id,
            staffRole: STAFF_ROLE.MANAGER,
            status: STAFF_STATUS.INVITED,
            inviteTokenHash,
            inviteExpiresAt,
            mustChangePassword: true,
            createdByUserId: input.ownerId
          }
        });
      }
    } else {
      user = await tx.user.create({
        data: {
          name,
          phone,
          password: passwordHash,
          role: "MANAGER",
          verified: false
        }
      });
      await tx.hotelStaff.create({
        data: {
          hotelId: input.hotelId,
          userId: user.id,
          staffRole: STAFF_ROLE.MANAGER,
          status: STAFF_STATUS.INVITED,
          inviteTokenHash,
          inviteExpiresAt,
          mustChangePassword: true,
          createdByUserId: input.ownerId
        }
      });
    }

    const staff = await tx.hotelStaff.findUniqueOrThrow({
      where: { hotelId_userId: { hotelId: input.hotelId, userId: user.id } }
    });
    return { user, staff };
  });

  await writeOwnerHotelAudit({
    hotelId: input.hotelId,
    actorUserId: input.ownerId,
    actorRole: "OWNER",
    action: "staff.invited",
    entityType: "HotelStaff",
    entityId: result.staff.id,
    afterState: { userId: result.user.id, staffRole: STAFF_ROLE.MANAGER, phone }
  });

  return {
    staffId: result.staff.id,
    userId: result.user.id,
    name: result.user.name,
    phone,
    /** One-time — never stored. */
    tempPassword,
    inviteToken,
    inviteExpiresAt: inviteExpiresAt.toISOString()
  };
}

export async function suspendHotelStaff(input: { ownerId: number; hotelId: number; staffId: number }) {
  await assertOwnerHotel(input.ownerId, input.hotelId);
  const staff = await prisma.hotelStaff.findFirst({
    where: { id: input.staffId, hotelId: input.hotelId }
  });
  if (!staff) throw new Error("NOT_FOUND");

  await prisma.$transaction(async (tx) => {
    await tx.hotelStaff.update({
      where: { id: staff.id },
      data: { status: STAFF_STATUS.SUSPENDED, inviteTokenHash: null, inviteExpiresAt: null }
    });
    await tx.session.deleteMany({ where: { userId: staff.userId } });
  });

  await writeOwnerHotelAudit({
    hotelId: input.hotelId,
    actorUserId: input.ownerId,
    actorRole: "OWNER",
    action: "staff.suspended",
    entityType: "HotelStaff",
    entityId: staff.id,
    afterState: { userId: staff.userId }
  });
}

export async function reactivateHotelStaff(input: { ownerId: number; hotelId: number; staffId: number }) {
  await assertOwnerHotel(input.ownerId, input.hotelId);
  const staff = await prisma.hotelStaff.findFirst({
    where: { id: input.staffId, hotelId: input.hotelId }
  });
  if (!staff) throw new Error("NOT_FOUND");

  await prisma.hotelStaff.update({
    where: { id: staff.id },
    data: { status: STAFF_STATUS.ACTIVE }
  });
  // Sessions stay revoked — Manager must log in again.

  await writeOwnerHotelAudit({
    hotelId: input.hotelId,
    actorUserId: input.ownerId,
    actorRole: "OWNER",
    action: "staff.reactivated",
    entityType: "HotelStaff",
    entityId: staff.id,
    afterState: { userId: staff.userId }
  });
}

export async function removeHotelStaffAccess(input: { ownerId: number; hotelId: number; staffId: number }) {
  await assertOwnerHotel(input.ownerId, input.hotelId);
  const staff = await prisma.hotelStaff.findFirst({
    where: { id: input.staffId, hotelId: input.hotelId }
  });
  if (!staff) throw new Error("NOT_FOUND");

  await prisma.$transaction(async (tx) => {
    await tx.hotelStaff.update({
      where: { id: staff.id },
      data: { status: STAFF_STATUS.REMOVED, inviteTokenHash: null, inviteExpiresAt: null }
    });
    await tx.session.deleteMany({ where: { userId: staff.userId } });
    // If no other active hotel memberships, keep role MANAGER but they cannot enter workspace.
  });

  await writeOwnerHotelAudit({
    hotelId: input.hotelId,
    actorUserId: input.ownerId,
    actorRole: "OWNER",
    action: "staff.access_removed",
    entityType: "HotelStaff",
    entityId: staff.id,
    afterState: { userId: staff.userId }
  });
}

/** Owner reset: new temp password once + revoke sessions. */
export async function resetHotelStaffAccess(input: { ownerId: number; hotelId: number; staffId: number }) {
  await assertOwnerHotel(input.ownerId, input.hotelId);
  const staff = await prisma.hotelStaff.findFirst({
    where: { id: input.staffId, hotelId: input.hotelId }
  });
  if (!staff) throw new Error("NOT_FOUND");

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const inviteToken = generateInviteToken();
  const inviteTokenHash = hashInviteToken(inviteToken);
  const inviteExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: staff.userId }, data: { password: passwordHash } });
    await tx.hotelStaff.update({
      where: { id: staff.id },
      data: {
        status: staff.status === STAFF_STATUS.REMOVED ? STAFF_STATUS.INVITED : staff.status,
        mustChangePassword: true,
        inviteTokenHash,
        inviteExpiresAt
      }
    });
    await tx.session.deleteMany({ where: { userId: staff.userId } });
  });

  await writeOwnerHotelAudit({
    hotelId: input.hotelId,
    actorUserId: input.ownerId,
    actorRole: "OWNER",
    action: "staff.password_reset",
    entityType: "HotelStaff",
    entityId: staff.id,
    afterState: { userId: staff.userId }
  });

  return { tempPassword, inviteToken, inviteExpiresAt: inviteExpiresAt.toISOString() };
}

export async function activateStaffInvite(input: {
  token: string;
  newPassword: string;
}) {
  if (input.newPassword.length < 8) throw new Error("WEAK_PASSWORD");
  const hash = hashInviteToken(input.token);
  const staff = await prisma.hotelStaff.findFirst({
    where: { inviteTokenHash: hash }
  });
  if (!staff) throw new Error("INVALID_INVITE");
  if (!staff.inviteExpiresAt || staff.inviteExpiresAt.getTime() < Date.now()) {
    throw new Error("INVITE_EXPIRED");
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: staff.userId }, data: { password: passwordHash, role: "MANAGER" } });
    await tx.hotelStaff.update({
      where: { id: staff.id },
      data: {
        status: STAFF_STATUS.ACTIVE,
        mustChangePassword: false,
        inviteTokenHash: null,
        inviteExpiresAt: null
      }
    });
    await tx.session.deleteMany({ where: { userId: staff.userId } });
  });

  await writeOwnerHotelAudit({
    hotelId: staff.hotelId,
    actorUserId: staff.userId,
    actorRole: "MANAGER",
    action: "staff.activated",
    entityType: "HotelStaff",
    entityId: staff.id
  });

  return { userId: staff.userId, hotelId: staff.hotelId };
}

export async function changeManagerPassword(input: {
  userId: number;
  oldPassword: string;
  newPassword: string;
}) {
  if (input.newPassword.length < 8) throw new Error("WEAK_PASSWORD");
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user || user.role !== "MANAGER") throw new Error("FORBIDDEN");
  const { verifyPassword } = await import("@/lib/auth/password");
  const ok = await verifyPassword(input.oldPassword, user.password);
  if (!ok) throw new Error("BAD_PASSWORD");
  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { password: passwordHash } });
    await tx.hotelStaff.updateMany({
      where: { userId: user.id, status: { in: [STAFF_STATUS.ACTIVE, STAFF_STATUS.INVITED] } },
      data: { mustChangePassword: false, status: STAFF_STATUS.ACTIVE, inviteTokenHash: null, inviteExpiresAt: null }
    });
  });
}
