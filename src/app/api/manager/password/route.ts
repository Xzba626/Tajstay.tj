import { NextRequest, NextResponse } from "next/server";
import { getManagerUser } from "@/lib/staff/hotelAccess";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { changeManagerPassword } from "@/lib/staff/staffService";

export async function POST(req: NextRequest) {
  const user = await getManagerUser();
  if (!user) return forbiddenJson();

  const body = await req.json().catch(() => ({}));
  const oldPassword = String(body.oldPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  if (!oldPassword || !newPassword) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    await changeManagerPassword({ userId: user.id, oldPassword, newPassword });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const code = e instanceof Error ? e.message : "failed";
    if (code === "FORBIDDEN") return forbiddenJson();
    const status = code === "BAD_PASSWORD" ? 401 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
