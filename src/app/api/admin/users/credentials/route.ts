import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { writeAdminAudit } from "@/lib/admin/auditLog";
import { clientIp } from "@/lib/security/rateLimit";

/**
 * P0-S1: Direct admin phone/email mutation is fail-closed.
 * Pending-verification flow is deferred; do not silently re-enable insecure CRM edit.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const id = Number(form.get("id"));
  const ip = clientIp(req);
  const ua = req.headers.get("user-agent") ?? undefined;

  await writeAdminAudit({
    actorUserId: admin.id,
    action: "owner_credentials_blocked",
    targetType: "user",
    targetId: Number.isFinite(id) ? id : null,
    result: "blocked",
    reason: "direct_credentials_edit_disabled_p0_s1",
    ip,
    userAgent: ua
  }).catch(() => undefined);

  const redirectUrl = publicUrl(req, "/dashboard/admin");
  redirectUrl.searchParams.set("section", "owner-access");
  redirectUrl.searchParams.set("error", "credentials_disabled");
  return NextResponse.redirect(redirectUrl);
}
