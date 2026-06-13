import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { OWNER_APPLICATION_STATUS } from "@/lib/domain/booking";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { normalizePhone } from "@/lib/validation/phone";
import { ImageUploadError } from "@/lib/uploads/imageUploadError";
import type { OwnerApplicationFileSlot, OwnerApplicationMeta } from "@/lib/owner/applicationMeta";
import { savePrivateOwnerDoc } from "@/lib/uploads/savePrivateFile";
import {
  OWNER_DOCUMENT_MAX_BYTES,
  OWNER_PHOTO_MAX_BYTES,
  validateOwnerDocumentFile,
  validateOwnerPhotoFile
} from "@/lib/owner/applicationUpload";
import { notifyOwnerRequestAdmins } from "@/lib/owner/notifyOwnerRequestAdmins";
import { encryptOwnerApplicationInput, decryptOwnerApplicationField } from "@/lib/owner/ownerApplicationPii";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const jsonSchema = z
  .object({
    fullName: z.string().min(2).max(200),
    phone: z.string().min(5).max(32),
    email: z.string().email().max(200),
    businessName: z.string().min(2).max(200),
    documentUrl: z.union([z.literal(""), z.string().url().max(2000)]).optional(),
    applicantType: z.string().min(1).max(64),
    city: z.string().min(2).max(120),
    propertyType: z.string().min(1).max(64),
    address: z.string().min(3).max(300),
    roomCount: z.string().max(20).optional(),
    guestCapacity: z.string().max(20).optional(),
    propertyDescription: z.string().max(2000).optional(),
    experience: z.string().max(2000).optional(),
    houseRules: z.string().max(2000).optional(),
    adminComment: z.string().max(2000).optional(),
    consent: z.literal(true)
  })
  .superRefine((data, ctx) => {
    const d = data.documentUrl;
    if (d && d !== "" && !d.startsWith("https://")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "HTTPS required",
        path: ["documentUrl"]
      });
    }
  });

async function saveOptionalPhoto(form: FormData, key: string, userId: number): Promise<string | undefined> {
  const f = form.get(key);
  if (!(f instanceof File) || f.size <= 0) return undefined;
  const err = validateOwnerPhotoFile(f);
  if (err === "type") throw new ImageUploadError("unsupported_type", "Only JPG, PNG, and WebP photos are allowed.");
  if (err === "size") throw new ImageUploadError("too_large", "Photo exceeds 10MB limit.");
  return savePrivateOwnerDoc(f, userId, key, OWNER_PHOTO_MAX_BYTES);
}

async function saveDualSlot(
  form: FormData,
  base: string,
  userId: number
): Promise<OwnerApplicationFileSlot | undefined> {
  const photo = form.get(`${base}Photo`);
  if (photo instanceof File && photo.size > 0) {
    const err = validateOwnerPhotoFile(photo);
    if (err === "type") throw new ImageUploadError("unsupported_type", "Only JPG, PNG, and WebP photos are allowed.");
    if (err === "size") throw new ImageUploadError("too_large", "Photo exceeds 10MB limit.");
    const photo_url = await savePrivateOwnerDoc(photo, userId, base, OWNER_PHOTO_MAX_BYTES);
    return { photo_url, file_type: "photo" };
  }

  const document = form.get(`${base}Document`);
  if (document instanceof File && document.size > 0) {
    const err = validateOwnerDocumentFile(document);
    if (err === "type") throw new ImageUploadError("unsupported_type", "Only PDF, DOC, and DOCX documents are allowed.");
    if (err === "size") throw new ImageUploadError("too_large", "Document exceeds 20MB limit.");
    const document_url = await savePrivateOwnerDoc(document, userId, base, OWNER_DOCUMENT_MAX_BYTES);
    return { document_url, file_type: "document" };
  }

  return undefined;
}

function storageRefFromSlot(slot: OwnerApplicationFileSlot | undefined): string | null {
  if (!slot) return null;
  return slot.photo_url ?? slot.document_url ?? null;
}

async function ensureNoPending(userId: number) {
  const pending = await prisma.ownerApplication.findFirst({
    where: { userId, status: OWNER_APPLICATION_STATUS.PENDING }
  });
  if (pending) {
    return NextResponse.json({ error: "У вас уже есть заявка на рассмотрении" }, { status: 409 });
  }
  return null;
}

/** Подача заявки на роль владельца (только GUEST). */
export async function POST(req: NextRequest) {
  const user = await requireUser(["GUEST"]);
  if (!user) {
    return NextResponse.json({ error: "Только для пользователей без роли владельца" }, { status: 403 });
  }

  const ip = clientIp(req);
  const ipRl = rateLimit(`post:owner-application:ip:${ip}`, 10, 60 * 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }

  const userRl = rateLimit(`post:owner-application:user:${user.id}`, 3, 60 * 60_000);
  if (!userRl.ok) {
    const res = NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
    if (userRl.retryAfterSec) res.headers.set("Retry-After", String(userRl.retryAfterSec));
    return res;
  }

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const pendingBlock = await ensureNoPending(user.id);
    if (pendingBlock) return pendingBlock;

    const form = await req.formData();
    const payload = {
      fullName: String(form.get("fullName") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      businessName: String(form.get("businessName") ?? "").trim(),
      documentUrl: String(form.get("documentUrl") ?? "").trim(),
      applicantType: String(form.get("applicantType") ?? "").trim(),
      city: String(form.get("city") ?? "").trim(),
      propertyType: String(form.get("propertyType") ?? "").trim(),
      address: String(form.get("address") ?? "").trim(),
      roomCount: String(form.get("roomCount") ?? "").trim() || undefined,
      guestCapacity: String(form.get("guestCapacity") ?? "").trim() || undefined,
      propertyDescription: String(form.get("propertyDescription") ?? "").trim() || undefined,
      experience: String(form.get("experience") ?? "").trim() || undefined,
      houseRules: String(form.get("houseRules") ?? "").trim() || undefined,
      adminComment: String(form.get("adminComment") ?? "").trim() || undefined,
      consent: form.get("consent") === "true" || form.get("consent") === "on"
    };

    const parsed = jsonSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректные данные", details: parsed.error.flatten() }, { status: 400 });
    }

    try {
      const [identity, identityBack, propertyDoc, facade, room, bathroom, selfie] = await Promise.all([
        saveDualSlot(form, "identity", user.id),
        saveDualSlot(form, "identityBack", user.id),
        saveDualSlot(form, "propertyDoc", user.id),
        saveOptionalPhoto(form, "facade", user.id),
        saveOptionalPhoto(form, "room", user.id),
        saveOptionalPhoto(form, "bathroom", user.id),
        saveOptionalPhoto(form, "selfie", user.id)
      ]);

      if (!identity) {
        return NextResponse.json({ error: "Загрузите фото или документ паспорта (лицевая сторона)" }, { status: 400 });
      }
      if (!identityBack) {
        return NextResponse.json({ error: "Загрузите фото или документ паспорта (задняя сторона)" }, { status: 400 });
      }
      if (!propertyDoc) {
        return NextResponse.json({ error: "Загрузите фото или документ на объект" }, { status: 400 });
      }
      if (!facade || !room || !bathroom) {
        return NextResponse.json({ error: "Загрузите фото объекта (фасад, комната, санузел)" }, { status: 400 });
      }

      const uploads = {
        identity,
        identityBack,
        selfie,
        facade,
        room,
        bathroom,
        propertyDoc
      };

      const meta: OwnerApplicationMeta = {
        applicantType: parsed.data.applicantType,
        city: parsed.data.city,
        propertyType: parsed.data.propertyType,
        address: parsed.data.address,
        roomCount: parsed.data.roomCount,
        guestCapacity: parsed.data.guestCapacity,
        propertyDescription: parsed.data.propertyDescription,
        experience: parsed.data.experience,
        houseRules: parsed.data.houseRules,
        uploads,
        consentAt: new Date().toISOString()
      };

      const normalizedPhone = normalizePhone(parsed.data.phone);
      const normalizedEmail = parsed.data.email.trim().toLowerCase();
      if (!normalizedPhone) {
        return NextResponse.json({ error: "Некорректный телефон" }, { status: 400 });
      }

      const app = await prisma.ownerApplication.create({
        data: encryptOwnerApplicationInput({
          userId: user.id,
          fullName: parsed.data.fullName.trim(),
          phone: normalizedPhone,
          email: normalizedEmail,
          businessName: parsed.data.businessName.trim(),
          address: parsed.data.address.trim(),
          documentUrl: parsed.data.documentUrl || null,
          comment: parsed.data.adminComment || null,
          passportFront: storageRefFromSlot(identity),
          passportBack: storageRefFromSlot(identityBack),
          selfieWithDoc: selfie ?? null,
          propertyDoc: storageRefFromSlot(propertyDoc),
          applicationMeta: meta,
          status: OWNER_APPLICATION_STATUS.PENDING
        })
      });

      await notifyOwnerRequestAdmins({
        applicationId: app.id,
        fullName: decryptOwnerApplicationField(app.fullName) ?? parsed.data.fullName.trim()
      });
      return NextResponse.json({ ok: true, id: app.id });
    } catch (err) {
      if (err instanceof ImageUploadError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      console.error("[owner/applications] multipart submit failed", err);
      return NextResponse.json({ error: "Не удалось сохранить заявку. Попробуйте позже." }, { status: 500 });
    }
  }

  const pendingBlock = await ensureNoPending(user.id);
  if (pendingBlock) return pendingBlock;

  const json = await req.json().catch(() => ({}));
  const parsed = jsonSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные", details: parsed.error.flatten() }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(parsed.data.phone);
  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const meta: OwnerApplicationMeta = {
    applicantType: parsed.data.applicantType,
    city: parsed.data.city,
    propertyType: parsed.data.propertyType,
    address: parsed.data.address,
    roomCount: parsed.data.roomCount,
    guestCapacity: parsed.data.guestCapacity,
    propertyDescription: parsed.data.propertyDescription,
    experience: parsed.data.experience,
    houseRules: parsed.data.houseRules,
    consentAt: new Date().toISOString()
  };

  const app = await prisma.ownerApplication.create({
    data: encryptOwnerApplicationInput({
      userId: user.id,
      fullName: parsed.data.fullName.trim(),
      phone: normalizedPhone,
      email: normalizedEmail,
      businessName: parsed.data.businessName.trim(),
      documentUrl: parsed.data.documentUrl || null,
      comment: parsed.data.adminComment || null,
      applicationMeta: meta,
      status: OWNER_APPLICATION_STATUS.PENDING
    })
  });

  await notifyOwnerRequestAdmins({
    applicationId: app.id,
    fullName: decryptOwnerApplicationField(app.fullName) ?? parsed.data.fullName.trim()
  });
  return NextResponse.json({ ok: true, id: app.id });
}
