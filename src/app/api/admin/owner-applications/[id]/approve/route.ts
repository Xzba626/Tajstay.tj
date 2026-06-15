import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { approveOwnerRequest } from "@/lib/owner/ownerRequestReview";

function wantsJson(req: NextRequest): boolean {
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("application/json") || req.headers.get("x-requested-with") === "XMLHttpRequest";
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const result = await approveOwnerRequest(id, admin);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (wantsJson(req)) {
    return NextResponse.json({ ok: true, role: "OWNER", redirect: "/dashboard/owner?onboarding=1" });
  }
  return NextResponse.redirect(publicUrl(req, "/dashboard/admin?section=applications"));
}
