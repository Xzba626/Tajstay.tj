import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { savePublicImageFile } from "@/lib/uploads/savePublicImage";
import { normalizePropertyType } from "@/lib/domain/propertyTypes";

function parseCoord(input: FormDataEntryValue | null): number | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const hotel = await prisma.hotel.findFirst({ where: { id, ownerId: owner.id } });
  if (!hotel) return forbiddenJson();

  const errUrl = publicUrl(req, "/dashboard/owner");
  errUrl.searchParams.set("section", "properties");
  errUrl.searchParams.set("error", "hotel");

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const city = String(form.get("city") ?? "").trim();
  const address = String(form.get("address") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const latitude = parseCoord(form.get("latitude"));
  const longitude = parseCoord(form.get("longitude"));
  const propertyType = normalizePropertyType(form.get("propertyType")) ?? hotel.propertyType;
  const coverFile = form.get("coverFile");
  let coverImageUrl: string | null = hotel.coverImageUrl;
  if (coverFile instanceof File && coverFile.size > 0) {
    try {
      const saved = await savePublicImageFile(coverFile, "hotel-covers");
      if (saved) coverImageUrl = saved;
    } catch (error) {
      console.error("[owner.hotel.cover]", error);
    }
  }

  if (!name || !city || !address || !description) {
    return NextResponse.redirect(errUrl);
  }

  try {
    await prisma.hotel.update({
      where: { id },
      data: {
        name,
        city,
        address,
        description,
        latitude: latitude ?? hotel.latitude,
        longitude: longitude ?? hotel.longitude,
        propertyType,
        coverImageUrl,
        status: hotel.status
      }
    });
  } catch (error) {
    console.error("[owner.hotel.update]", error);
    errUrl.searchParams.set("error", "hotel_db");
    return NextResponse.redirect(errUrl);
  }

  return NextResponse.redirect(publicUrl(req, "/dashboard/owner?section=properties"));
}
