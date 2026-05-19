import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { savePublicImageFile } from "@/lib/uploads/savePublicImage";
import { normalizePropertyType } from "@/lib/domain/propertyTypes";

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

/** Создание объекта владельцем после одобрения заявки — без повторной модерации админом. */
export async function POST(req: NextRequest) {
  const owner = await getOwnerUser();
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
  const propertyType = normalizePropertyType(form.get("propertyType")) ?? "HOTEL";
  const coverFile = form.get("coverFile");
  let coverImageUrl: string | null = null;
  if (coverFile instanceof File && coverFile.size > 0) {
    try {
      coverImageUrl = await savePublicImageFile(coverFile, "hotel-covers");
    } catch (error) {
      console.error("[owner.hotel.cover]", error);
    }
  }

  if (!name || !city || !address || !description) {
    return redirectBack(req, "hotel");
  }

  try {
    await prisma.hotel.create({
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
  } catch (error) {
    console.error("[owner.hotel.create]", error);
    return redirectBack(req, "hotel_db");
  }

  return redirectBack(req);
}
