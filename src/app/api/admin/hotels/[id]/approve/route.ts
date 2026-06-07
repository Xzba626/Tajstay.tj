import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { approveHotel } from "@/lib/services/hotelModeration";
import { publicUrl } from "@/lib/http/publicOrigin";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const result = await approveHotel(id, admin.id);
  if (!result.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("application/json")) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.redirect(publicUrl(req, "/dashboard/admin?section=moderation"));
}
