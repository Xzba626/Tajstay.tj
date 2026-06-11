import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { readOwnerRequestFile } from "@/lib/uploads/readPrivateFile";
import { getOwnerRequestFileRef, OWNER_REQUEST_FILE_TYPES, type OwnerRequestFileType } from "@/lib/owner/ownerRequestFiles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FILE_RATE_LIMIT = 30;
const FILE_RATE_WINDOW_MS = 60_000;

function isFileType(v: string): v is OwnerRequestFileType {
  return (OWNER_REQUEST_FILE_TYPES as readonly string[]).includes(v);
}

/** Просмотр конфиденциального документа заявки (ADMIN only). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const type = req.nextUrl.searchParams.get("type")?.trim() ?? "";
  if (!isFileType(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const ip = clientIp(req);
  const rl = rateLimit(`get:owner-request-file:admin:${admin.id}`, FILE_RATE_LIMIT, FILE_RATE_WINDOW_MS);
  if (!rl.ok) {
    const res = NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
    if (rl.retryAfterSec) res.headers.set("Retry-After", String(rl.retryAfterSec));
    res.headers.set("Cache-Control", "no-store, no-cache");
    return res;
  }

  const application = await prisma.ownerApplication.findUnique({ where: { id } });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const storageRef = getOwnerRequestFileRef(application, type);
  if (!storageRef) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const file = await readOwnerRequestFile(storageRef);
  if (!file) return NextResponse.json({ error: "File unavailable" }, { status: 404 });

  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
  await prisma.ownerApplicationDocumentViewLog.create({
    data: {
      applicationId: id,
      adminId: admin.id,
      fileType: type,
      ip,
      userAgent
    }
  });

  const inline = file.contentType.startsWith("image/") || file.contentType === "application/pdf";
  const headers = new Headers({
    "Content-Type": file.contentType,
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${file.filename}"`,
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache"
  });

  return new NextResponse(new Uint8Array(file.buffer), { status: 200, headers });
}
