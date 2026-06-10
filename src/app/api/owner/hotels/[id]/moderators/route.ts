import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isGuardResponse, requireHotelApiPermission, PERMISSION, requireOwnerApiUser } from "@/lib/auth/apiGuard";
import { USER_ROLE } from "@/lib/auth/permissions";

const assignSchema = z.object({
  userId: z.number().int().positive().optional(),
  phone: z.string().min(6).optional()
});

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const hotelId = Number(params.id);
  if (!hotelId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const user = await requireHotelApiPermission(hotelId, PERMISSION.MANAGE_STAFF);
  if (isGuardResponse(user)) return user;

  const moderators = await prisma.hotelModerator.findMany({
    where: { hotelId },
    include: {
      user: { select: { id: true, name: true, phone: true, email: true, role: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ ok: true, moderators });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const hotelId = Number(params.id);
  if (!hotelId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const owner = await requireOwnerApiUser();
  if (isGuardResponse(owner)) return owner;

  const access = await requireHotelApiPermission(hotelId, PERMISSION.MANAGE_STAFF);
  if (isGuardResponse(access)) return access;

  const json = (await req.json().catch(() => ({}))) as unknown;
  const parsed = assignSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  let targetUserId = parsed.data.userId;
  if (!targetUserId && parsed.data.phone) {
    const found = await prisma.user.findUnique({ where: { phone: parsed.data.phone.trim() } });
    if (!found) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    targetUserId = found.id;
  }
  if (!targetUserId) return NextResponse.json({ error: "user_required" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  if (target.role !== USER_ROLE.HOTEL_MODERATOR && target.role !== USER_ROLE.GUEST) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  if (target.role === USER_ROLE.GUEST) {
    await prisma.user.update({ where: { id: target.id }, data: { role: USER_ROLE.HOTEL_MODERATOR } });
  }

  const row = await prisma.hotelModerator.upsert({
    where: { hotelId_userId: { hotelId, userId: target.id } },
    create: { hotelId, userId: target.id, assignedByUserId: owner.id },
    update: { assignedByUserId: owner.id },
    include: { user: { select: { id: true, name: true, phone: true, email: true, role: true } } }
  });

  return NextResponse.json({ ok: true, moderator: row });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const hotelId = Number(params.id);
  if (!hotelId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const owner = await requireOwnerApiUser();
  if (isGuardResponse(owner)) return owner;

  const access = await requireHotelApiPermission(hotelId, PERMISSION.MANAGE_STAFF);
  if (isGuardResponse(access)) return access;

  const userId = Number(req.nextUrl.searchParams.get("userId") || "");
  if (!userId) return NextResponse.json({ error: "user_required" }, { status: 400 });

  await prisma.hotelModerator.deleteMany({ where: { hotelId, userId } });

  const remaining = await prisma.hotelModerator.count({ where: { userId } });
  if (remaining === 0) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === USER_ROLE.HOTEL_MODERATOR) {
      await prisma.user.update({ where: { id: userId }, data: { role: USER_ROLE.GUEST } });
    }
  }

  return NextResponse.json({ ok: true });
}
