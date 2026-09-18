import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { getCurrentSessionRow } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/security/rateLimit";

export async function GET() {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "MANAGER"]);
  if (!user) return forbiddenJson();

  const current = await getCurrentSessionRow();
  const now = new Date();
  const sessions = await prisma.session.findMany({
    where: {
      userId: user.id,
      OR: [{ expiresAt: { gt: now } }, { expires: { gt: now } }]
    },
    select: { id: true, createdAt: true, expiresAt: true, expires: true },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return NextResponse.json({
    ok: true,
    currentSessionId: current?.id ?? null,
    sessions: sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      expiresAt: (s.expiresAt ?? s.expires)?.toISOString() ?? null,
      current: current?.id === s.id
    }))
  });
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "MANAGER"]);
  if (!user) return forbiddenJson();

  const rl = rateLimit(`delete:profile-sessions:${user.id}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "revoke_others");
  const current = await getCurrentSessionRow();
  if (!current || current.userId !== user.id) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  if (action === "revoke_one") {
    const id = Number(body.sessionId);
    if (!id || id === current.id) {
      return NextResponse.json({ error: "invalid_session" }, { status: 400 });
    }
    const result = await prisma.session.deleteMany({ where: { id, userId: user.id } });
    return NextResponse.json({ ok: true, revoked: result.count });
  }

  const result = await prisma.session.deleteMany({
    where: { userId: user.id, NOT: { id: current.id } }
  });
  return NextResponse.json({ ok: true, revoked: result.count });
}
