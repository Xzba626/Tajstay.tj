import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { savePublicImageFile } from "@/lib/uploads/savePublicImage";
import { ImageUploadError } from "@/lib/uploads/imageUploadError";
import { agentLog } from "@/lib/debug/agentLog";
import { getPublicOriginFromRequest } from "@/lib/http/publicOrigin";
import { createNotification } from "@/lib/notifications/create";
import { sendHotelPendingAdminEmail } from "@/lib/email/hotelModerationEmails";
import { resolvePropertyTypeId } from "@/lib/property-types/seed";

export const runtime = "nodejs";
const DEFAULT_LAT = 38.5598;
const DEFAULT_LNG = 68.787;

function parseCoord(input: FormDataEntryValue | null): number | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function redirectBack(req: NextRequest, error?: string): NextResponse {
  let u: URL;
  try {
    u = publicUrl(req, "/dashboard/owner");
  } catch {
    const fallback =
      process.env.AUTH_URL?.trim() ||
      process.env.NEXTAUTH_URL?.trim() ||
      getPublicOriginFromRequest(req);
    u = new URL("/dashboard/owner", fallback.endsWith("/") ? fallback : `${fallback}/`);
  }
  u.searchParams.set("section", "properties");
  if (error) u.searchParams.set("error", error);
  return NextResponse.redirect(u, 303);
}

function vercelLog(event: string, data: Record<string, unknown>) {
  console.error(JSON.stringify({ tag: "owner-hotels", event, ...data }));
}

function uploadErrorCode(err: ImageUploadError): string {
  switch (err.code) {
    case "blob_not_configured":
    case "store_readonly":
      return "hotel_cover_storage";
    case "too_large":
      return "hotel_cover_size";
    case "unsupported_type":
      return "hotel_cover_type";
    case "empty":
      return "hotel_cover";
    default:
      return "hotel_cover_upload";
  }
}

/** Создание объекта владельцем — отправляется на модерацию (PENDING). */
export async function POST(req: NextRequest) {
  try {
    const owner = await getOwnerUser();
    // #region agent log
    agentLog(
      "owner/hotels/route.ts:POST",
      "owner hotels POST",
      { hasOwner: !!owner, ownerRole: owner?.role ?? null },
      "H4"
    );
    // #endregion
    if (!owner) return forbiddenJson();

    const existingCount = await prisma.hotel.count({ where: { ownerId: owner.id } });
    if (existingCount >= 1) {
      return redirectBack(req, "hotel_limit");
    }

    const form = await req.formData();
    const name = String(form.get("name") ?? "").trim();
    const city = String(form.get("city") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const latitude = parseCoord(form.get("latitude")) ?? DEFAULT_LAT;
    const longitude = parseCoord(form.get("longitude")) ?? DEFAULT_LNG;
    const propertyTypeRaw = String(form.get("propertyTypeId") ?? form.get("propertyType") ?? "HOTEL");
    const propertyTypeId = await resolvePropertyTypeId(propertyTypeRaw);
    const coverFile = form.get("coverFile");

    if (!name || !city || !address || !description) {
      return redirectBack(req, "hotel");
    }
    if (!propertyTypeId) {
      return redirectBack(req, "hotel");
    }

    let coverImageUrl: string | null = null;
    if (coverFile instanceof File && coverFile.size > 0) {
      try {
        coverImageUrl = await savePublicImageFile(coverFile, "hotel-covers");
      } catch (err) {
        const code = err instanceof ImageUploadError ? uploadErrorCode(err) : "hotel_cover_upload";
        vercelLog("cover_upload_failed", {
          code,
          errName: err instanceof Error ? err.name : "unknown",
          msg: err instanceof Error ? err.message.slice(0, 120) : ""
        });
        return redirectBack(req, code);
      }
    }

    if (!coverImageUrl) {
      return redirectBack(req, "hotel_cover");
    }

    const hotel = await prisma.hotel.create({
      data: {
        ownerId: owner.id,
        name,
        city,
        address,
        description,
        latitude,
        longitude,
        propertyTypeId,
        coverImageUrl,
        status: "PENDING"
      }
    });

    await createNotification({
      userId: owner.id,
      type: "HOTEL_PENDING_REVIEW",
      message: "Ваш объект принят на проверку. Обычно это занимает до 24 часов.",
      link: "/dashboard/owner?section=properties"
    });

    await sendHotelPendingAdminEmail({
      ownerName: owner.name,
      ownerEmail: owner.email,
      hotelName: hotel.name,
      hotelAddress: hotel.address,
      hotelId: hotel.id
    });

    // #region agent log
    agentLog(
      "owner/hotels/route.ts:POST",
      "hotel created",
      { hotelId: hotel.id, coverHost: coverImageUrl?.startsWith("http") ? "blob" : "local" },
      "H5"
    );
    // #endregion

    return redirectBack(req);
  } catch (err) {
    const prismaCode = err instanceof Prisma.PrismaClientKnownRequestError ? err.code : null;
    vercelLog("fatal", {
      errName: err instanceof Error ? err.name : "unknown",
      msg: err instanceof Error ? err.message.slice(0, 200) : "",
      prismaCode
    });
    // #region agent log
    agentLog(
      "owner/hotels/route.ts:POST",
      "hotel create failed",
      { errName: err instanceof Error ? err.name : "unknown", prismaCode },
      "H5"
    );
    // #endregion
    try {
      if (prismaCode === "P2002") return redirectBack(req, "hotel_unique");
      if (prismaCode === "P2003") return redirectBack(req, "hotel_owner");
      return redirectBack(req, "hotel_server");
    } catch {
      return NextResponse.json({ error: "hotel_server", prismaCode }, { status: 500 });
    }
  }
}
