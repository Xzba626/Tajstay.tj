import { NextRequest, NextResponse } from "next/server";
import { activateStaffInvite } from "@/lib/staff/staffService";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`post:staff-invite:${ip}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "").trim();
  const newPassword = String(body.newPassword ?? "");
  if (!token || !newPassword) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    const result = await activateStaffInvite({ token, newPassword });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const code = e instanceof Error ? e.message : "failed";
    const status =
      code === "INVALID_INVITE" || code === "INVITE_EXPIRED" ? 410 : code === "WEAK_PASSWORD" ? 400 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
