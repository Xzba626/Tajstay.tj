import { NextRequest, NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const hotelId = Number(req.nextUrl.searchParams.get("hotelId") ?? "");
  if (!hotelId) return NextResponse.json({ error: "invalid_hotel" }, { status: 400 });

  const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, ownerId: owner.id }, select: { id: true } });
  if (!hotel) return forbiddenJson();

  const take = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("take") ?? 30) || 30));
  const cursor = Number(req.nextUrl.searchParams.get("cursor") ?? 0) || undefined;

  const rows = await prisma.ownerHotelAuditLog.findMany({
    where: { hotelId },
    orderBy: { id: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  return NextResponse.json({
    ok: true,
    events: page.map((e) => ({
      id: e.id,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      actorRole: e.actorRole,
      beforeState: e.beforeState,
      afterState: e.afterState,
      createdAt: e.createdAt.toISOString()
    })),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null
  });
}
