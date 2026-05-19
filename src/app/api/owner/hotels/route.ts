import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { savePublicImageFile } from "@/lib/uploads/savePublicImage";
import { ImageUploadError } from "@/lib/uploads/imageUploadError";
import { agentLog } from "@/lib/debug/agentLog";

const PROPERTY_TYPES = new Set(["HOTEL", "HOSTEL", "GUESTHOUSE", "APARTMENT", "ECO"]);
const DEFAULT_LAT = 38.5598;
const DEFAULT_LNG = 68.787;

function parseCoord(input: FormDataEntryValue | null): number | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function redirectBack(req: NextRequest, error?: string) {
  const u = publicUrl(req, "/dashboard/owner");
  u.searchParams.set("section", "properties");
  if (error) u.searchParams.set("error", error);
  return NextResponse.redirect(u);
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

/** Создание объекта владельцем после одобрения заявки — без повторной модерации админом. */
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
    const propertyType = String(form.get("propertyType") ?? "HOTEL");
    const coverFile = form.get("coverFile");

    if (!name || !city || !address || !description) {
      return redirectBack(req, "hotel");
    }
    if (!PROPERTY_TYPES.has(propertyType)) {
      return redirectBack(req, "hotel");
    }

    let coverImageUrl: string | null = null;
    if (coverFile instanceof File && coverFile.size > 0) {
      try {
        coverImageUrl = await savePublicImageFile(coverFile, "hotel-covers");
      } catch (err) {
        console.error("[api/owner/hotels] cover upload", err);
        if (err instanceof ImageUploadError) {
          return redirectBack(req, uploadErrorCode(err));
        }
        return redirectBack(req, "hotel_cover_upload");
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
        propertyType,
        coverImageUrl,
        status: "APPROVED"
      }
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
    console.error("[api/owner/hotels] POST failed", err);
    // #region agent log
    agentLog(
      "owner/hotels/route.ts:POST",
      "hotel create failed",
      {
        errName: err instanceof Error ? err.name : "unknown",
        prismaCode: err instanceof Prisma.PrismaClientKnownRequestError ? err.code : null
      },
      "H5"
    );
    // #endregion
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return redirectBack(req, "hotel_unique");
      if (err.code === "P2003") return redirectBack(req, "hotel_owner");
    }
    return redirectBack(req, "hotel_server");
  }
}
