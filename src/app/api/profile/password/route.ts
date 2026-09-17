import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { changeAccountPassword } from "@/lib/auth/changePassword";
import { getCurrentSessionRow } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rateLimit";

export async function POST(req: NextRequest) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "MANAGER"]);
  if (!user) return forbiddenJson();

  const rl = rateLimit(`post:profile-password:${user.id}`, 8, 15 * 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "mismatch" }, { status: 400 });
  }

  const current = await getCurrentSessionRow();
  const result = await changeAccountPassword({
    userId: user.id,
    currentPassword,
    newPassword,
    keepSessionId: current?.userId === user.id ? current.id : null
  });

  if (!result.ok) {
    const status =
      result.error === "bad_password" ? 401 : result.error === "rate_limited" ? 429 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
