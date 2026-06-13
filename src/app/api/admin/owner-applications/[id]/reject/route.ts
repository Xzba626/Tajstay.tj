import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { rejectOwnerRequest } from "@/lib/owner/ownerRequestReview";

const bodySchema = z.object({
  comment: z.string().min(1).max(2000)
});

function wantsJson(req: NextRequest): boolean {
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("application/json") || req.headers.get("x-requested-with") === "XMLHttpRequest";
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const form = await req.formData().catch(() => null);
  let comment = "";
  if (form) {
    comment = String(form.get("comment") ?? "");
  } else {
    const json = await req.json().catch(() => ({}));
    const p = bodySchema.safeParse(json);
    if (!p.success) return NextResponse.json({ error: "Нужен комментарий" }, { status: 400 });
    comment = p.data.comment;
  }

  if (!comment.trim()) return NextResponse.json({ error: "Нужен комментарий" }, { status: 400 });

  const application = await prisma.ownerApplication.findUnique({ where: { id } });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await rejectOwnerRequest(id, admin, comment.trim());
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (wantsJson(req)) {
    return NextResponse.json({ ok: true, redirect: "/dashboard/admin?section=applications" });
  }
  return NextResponse.redirect(publicUrl(req, "/dashboard/admin?section=applications"));
}
