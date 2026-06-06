import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireAuth";
import { upsertUserDeviceSession } from "@/lib/analytics/userDeviceSession";

const schema = z.object({
  systemLanguage: z.string().max(32).optional(),
  screenWidth: z.number().int().min(0).max(10000).optional(),
  screenHeight: z.number().int().min(0).max(10000).optional()
});

export async function POST(req: NextRequest) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  await upsertUserDeviceSession(user.id, req.headers, parsed.data);

  return NextResponse.json({ ok: true });
}
