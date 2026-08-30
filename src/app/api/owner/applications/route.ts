import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { OWNER_APPLICATION_STATUS } from "@/lib/domain/booking";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { normalizePhone } from "@/lib/validation/phone";
import { saveUploadFile } from "@/lib/uploads/saveUpload";
import { ImageUploadError } from "@/lib/uploads/imageUploadError";
import { normalizeTajikCity } from "@/lib/geo/tajikCities";
import type { OwnerApplicationMeta } from "@/lib/owner/applicationMeta";

const MAX_FILE = 5 * 1024 * 1024;
const UPLOAD_DIR = "owner-applications";

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

async function saveOptionalFile(form: FormData, key: string): Promise<string | undefined> {
  const f = form.get(key);
  if (!(f instanceof File) || f.size <= 0) return undefined;
  try {
    return await saveUploadFile(f, UPLOAD_DIR, MAX_FILE);
  } catch (err) {
    if (err instanceof ImageUploadError) throw err;
    throw new ImageUploadError("store_failed", "Upload failed");
  }
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
    const rawCity = String(form.get("city") ?? "").trim();
    const normalizedCity = normalizeTajikCity(rawCity);
    if (!normalizedCity) {
      return NextResponse.json({ error: "Выберите город из списка" }, { status: 400 });
    }

    const payload = {
      fullName: String(form.get("fullName") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      businessName: String(form.get("businessName") ?? "").trim(),
      documentUrl: String(form.get("documentUrl") ?? "").trim(),
      applicantType: String(form.get("applicantType") ?? "").trim(),
      city: normalizedCity,
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
      const identity = await saveOptionalFile(form, "identity");
      if (!identity) {
        return NextResponse.json({ error: "Загрузите фото паспорта / ID" }, { status: 400 });
      }
      const facade = await saveOptionalFile(form, "facade");
      const room = await saveOptionalFile(form, "room");
      const bathroom = await saveOptionalFile(form, "bathroom");
      if (!facade || !room || !bathroom) {
        return NextResponse.json({ error: "Загрузите фото объекта (фасад, комната, санузел)" }, { status: 400 });
      }

      const uploads = {
        identity,
        identityBack: await saveOptionalFile(form, "identityBack"),
        selfie: await saveOptionalFile(form, "selfie"),
        facade,
        room,
        bathroom,
        propertyDoc: await saveOptionalFile(form, "propertyDoc")
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
        data: {
          userId: user.id,
          fullName: parsed.data.fullName.trim(),
          phone: normalizedPhone,
          email: normalizedEmail,
          businessName: parsed.data.businessName.trim(),
          documentUrl: parsed.data.documentUrl || null,
          comment: parsed.data.adminComment || null,
          applicationMeta: meta,
          status: OWNER_APPLICATION_STATUS.PENDING
        }
      });

      await notifyAdmins();
      return NextResponse.json({ ok: true, id: app.id });
    } catch (err) {
      if (err instanceof ImageUploadError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
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
    data: {
      userId: user.id,
      fullName: parsed.data.fullName.trim(),
      phone: normalizedPhone,
      email: normalizedEmail,
      businessName: parsed.data.businessName.trim(),
      documentUrl: parsed.data.documentUrl || null,
      comment: parsed.data.adminComment || null,
      applicationMeta: meta,
      status: OWNER_APPLICATION_STATUS.PENDING
    }
  });

  await notifyAdmins();
  return NextResponse.json({ ok: true, id: app.id });
}

async function notifyAdmins() {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  if (!admins.length) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      bookingId: null,
      type: "OWNER_APPLICATION_NEW",
      isRead: false
    }))
  });
}
