import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { rejectHotel } from "@/lib/services/hotelModeration";
import { publicUrl } from "@/lib/http/publicOrigin";

const bodySchema = z.object({
  reason: z.string().min(1).max(2000)
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const form = await req.formData().catch(() => null);
  let reason = "";
  if (form) {
    reason = String(form.get("reason") ?? form.get("comment") ?? "");
  } else {
    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Нужна причина отклонения" }, { status: 400 });
    reason = parsed.data.reason;
  }

  const result = await rejectHotel(id, admin.id, reason);
  if (!result.ok) {
    if (result.error === "reason_required") {
      return NextResponse.json({ error: "Нужна причина отклонения" }, { status: 400 });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("application/json")) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.redirect(publicUrl(req, "/dashboard/admin?section=moderation"));
}
