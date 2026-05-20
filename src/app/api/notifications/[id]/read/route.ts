import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const note = await prisma.notification.findFirst({
    where: { id, userId: user.id },
    select: { id: true }
  });
  if (!note) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const res = await PATCH(req, ctx);
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("text/html") && res.status === 200) {
    return NextResponse.redirect(new URL("/notifications", req.url), 303);
  }
  return res;
}
