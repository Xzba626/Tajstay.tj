import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { OWNER_APPLICATION_STATUS } from "@/lib/domain/booking";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { normalizePhone } from "@/lib/validation/phone";
import { ImageUploadError } from "@/lib/uploads/imageUploadError";
import { savePrivateOwnerDoc } from "@/lib/uploads/savePrivateFile";
import {
  OWNER_DOCUMENT_MAX_BYTES,
  OWNER_PHOTO_MAX_BYTES,
  validateOwnerDocumentFile,
  validateOwnerPhotoFile
} from "@/lib/owner/applicationUpload";
import { notifyOwnerRequestAdmins } from "@/lib/owner/notifyOwnerRequestAdmins";
import {
  decryptOwnerApplicationField,
  encryptOwnerApplicationInput
} from "@/lib/owner/ownerApplicationPii";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const formSchema = z.object({
  fullName: z.string().min(2).max(200),
  phone: z.string().min(5).max(32),
  address: z.string().max(300).optional(),
  inn: z.string().max(64).optional(),
  email: z.string().email().max(200).optional(),
  businessName: z.string().min(2).max(200).optional(),
  consent: z.literal(true)
});

async function saveSlotFile(
  form: FormData,
  key: string,
  userId: number,
  slot: string,
  kind: "photo" | "document"
): Promise<string | null> {
  const f = form.get(key);
  if (!(f instanceof File) || f.size <= 0) return null;

  if (kind === "photo") {
    const err = validateOwnerPhotoFile(f);
    if (err) throw new ImageUploadError(err === "size" ? "too_large" : "unsupported_type", "Invalid photo");
    return savePrivateOwnerDoc(f, userId, slot, OWNER_PHOTO_MAX_BYTES);
  }

  const err = validateOwnerDocumentFile(f);
  if (err) throw new ImageUploadError(err === "size" ? "too_large" : "unsupported_type", "Invalid document");
  return savePrivateOwnerDoc(f, userId, slot, OWNER_DOCUMENT_MAX_BYTES);
}

/** Подача заявки на роль владельца (GUEST). Файлы сохраняются в приватное хранилище. */
export async function POST(req: NextRequest) {
  const user = await requireUser(["GUEST"]);
  if (!user) {
    return NextResponse.json({ error: "Только для пользователей без роли владельца" }, { status: 403 });
  }

  const ip = clientIp(req);
  const ipRl = rateLimit(`post:owner-request:ip:${ip}`, 10, 60 * 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }

  const userRl = rateLimit(`post:owner-request:user:${user.id}`, 3, 60 * 60_000);
  if (!userRl.ok) {
    const res = NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
    if (userRl.retryAfterSec) res.headers.set("Retry-After", String(userRl.retryAfterSec));
    return res;
  }

  const pending = await prisma.ownerApplication.findFirst({
    where: { userId: user.id, status: OWNER_APPLICATION_STATUS.PENDING }
  });
  if (pending) {
    return NextResponse.json({ error: "У вас уже есть заявка на рассмотрении" }, { status: 409 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Ожидается multipart/form-data" }, { status: 400 });
  }

  const form = await req.formData();
  const payload = {
    fullName: String(form.get("fullName") ?? "").trim(),
    phone: String(form.get("phone") ?? "").trim(),
    address: String(form.get("address") ?? "").trim() || undefined,
    inn: String(form.get("inn") ?? "").trim() || undefined,
    email: String(form.get("email") ?? user.email ?? "").trim() || undefined,
    businessName: String(form.get("businessName") ?? form.get("fullName") ?? "").trim() || undefined,
    consent: form.get("consent") === "true" || form.get("consent") === "on"
  };

  const parsed = formSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные", details: parsed.error.flatten() }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(parsed.data.phone);
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Некорректный телефон" }, { status: 400 });
  }

  try {
    const [passportFront, passportBack, selfieWithDoc, propertyDoc] = await Promise.all([
      saveSlotFile(form, "passportFront", user.id, "passportFront", "photo"),
      saveSlotFile(form, "passportBack", user.id, "passportBack", "photo"),
      saveSlotFile(form, "selfieWithDoc", user.id, "selfieWithDoc", "photo"),
      saveSlotFile(form, "propertyDoc", user.id, "propertyDoc", "document")
    ]);

    if (!passportFront) {
      return NextResponse.json({ error: "Загрузите фото паспорта (лицевая сторона)" }, { status: 400 });
    }
    if (!passportBack) {
      return NextResponse.json({ error: "Загрузите фото паспорта (задняя сторона)" }, { status: 400 });
    }

    const email = (parsed.data.email ?? user.email ?? `${user.id}@tajstay.local`).trim().toLowerCase();

    const app = await prisma.ownerApplication.create({
      data: encryptOwnerApplicationInput({
        userId: user.id,
        fullName: parsed.data.fullName,
        phone: normalizedPhone,
        email,
        businessName: parsed.data.businessName ?? parsed.data.fullName,
        address: parsed.data.address ?? null,
        inn: parsed.data.inn ?? null,
        passportFront,
        passportBack,
        selfieWithDoc,
        propertyDoc,
        status: OWNER_APPLICATION_STATUS.PENDING
      })
    });

    await notifyOwnerRequestAdmins({
      applicationId: app.id,
      fullName: decryptOwnerApplicationField(app.fullName) ?? parsed.data.fullName
    });
    return NextResponse.json({ ok: true, id: app.id });
  } catch (err) {
    if (err instanceof ImageUploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[owner-requests] submit failed", err);
    return NextResponse.json({ error: "Не удалось сохранить заявку. Попробуйте позже." }, { status: 500 });
  }
}
