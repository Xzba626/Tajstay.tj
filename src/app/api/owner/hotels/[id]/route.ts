import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { savePublicImageFile } from "@/lib/uploads/savePublicImage";
import { ImageUploadError } from "@/lib/uploads/imageUploadError";
import { notifyAdminsHotelPending } from "@/lib/notifications/notifyAdminsHotelPending";

const PROPERTY_TYPES = new Set(["HOTEL", "HOSTEL", "GUESTHOUSE", "APARTMENT", "ECO"]);

function parseCoord(input: FormDataEntryValue | null): number | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function redirectProperties(req: NextRequest, error?: string) {
  const u = publicUrl(req, "/dashboard/owner");
  u.searchParams.set("section", "properties");
  if (error) u.searchParams.set("error", error);
  return NextResponse.redirect(u);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const owner = await getOwnerUser();
    if (!owner) return forbiddenJson();

    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const hotel = await prisma.hotel.findFirst({ where: { id, ownerId: owner.id } });
    if (!hotel) return forbiddenJson();

    const form = await req.formData();
    const name = String(form.get("name") ?? "").trim();
    const city = String(form.get("city") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const latitude = parseCoord(form.get("latitude"));
    const longitude = parseCoord(form.get("longitude"));
    const propertyType = String(form.get("propertyType") ?? "HOTEL");
    const coverFile = form.get("coverFile");
    let coverImageUrl: string | null = hotel.coverImageUrl;

    if (coverFile instanceof File && coverFile.size > 0) {
      try {
        coverImageUrl = await savePublicImageFile(coverFile, "hotel-covers");
      } catch (err) {
        console.error("[api/owner/hotels/:id] cover upload", err);
        if (err instanceof ImageUploadError) {
          return redirectProperties(req, "hotel_cover_upload");
        }
        return redirectProperties(req, "hotel_cover_upload");
      }
    }

    if (!name || !city || !address || !description) {
      return redirectProperties(req, "hotel");
    }
    if (!PROPERTY_TYPES.has(propertyType)) {
      return redirectProperties(req, "hotel");
    }

    // Editing never lets the owner set status directly (no `status` form field is ever read
    // here). A REJECTED hotel keeps its rejected status when merely saving edits - resubmitting
    // is a separate, explicit action (`intent=resubmit`), not an automatic side effect of Save.
    // That matters because an owner may want to fix several things across multiple saves before
    // asking for another review, and because auto-resubmitting on every keystroke-adjacent save
    // would spam Admin with re-review notifications for edits that aren't actually ready yet.
    const intent = String(form.get("intent") ?? "");
    const isResubmit = intent === "resubmit" && hotel.status === "REJECTED";
    const nextStatus = isResubmit ? "PENDING" : hotel.status;

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
        status: nextStatus,
        // Cleared only on an actual resubmit - otherwise the owner keeps seeing why it was
        // rejected while they're still working on the fix across possibly several saves.
        currentRejectionReason: isResubmit ? null : hotel.currentRejectionReason
      }
    });

    if (isResubmit) {
      await notifyAdminsHotelPending(id, name);
    }

    return NextResponse.redirect(publicUrl(req, "/dashboard/owner?section=properties"));
  } catch (err) {
    console.error("[api/owner/hotels/:id] POST failed", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return redirectProperties(req, "hotel_unique");
    }
    return redirectProperties(req, "hotel_server");
  }
}
