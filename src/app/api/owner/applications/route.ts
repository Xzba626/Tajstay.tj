import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { OWNER_APPLICATION_STATUS } from "@/lib/domain/booking";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { normalizePhone } from "@/lib/validation/phone";

const bodySchema = z
  .object({
    fullName: z.string().min(2).max(200),
    phone: z.string().min(5).max(32),
    email: z.string().email().max(200),
    businessName: z.string().min(2).max(200),
    documentUrl: z.union([z.literal(""), z.string().url().max(2000)]).optional()
  })
  .superRefine((data, ctx) => {
    const d = data.documentUrl;
    if (d && d !== "" && !d.startsWith("https://")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ссылка на документ должна использовать HTTPS",
        path: ["documentUrl"]
      });
    }
  });

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
  const ipRl = rateLimit(`post:owner-application:ip:${ip}`, 20, 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }

  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные", details: parsed.error.flatten() }, { status: 400 });
  }

  const pending = await prisma.ownerApplication.findFirst({
    where: { userId: user.id, status: OWNER_APPLICATION_STATUS.PENDING }
  });
  if (pending) {
    return NextResponse.json({ error: "У вас уже есть заявка на рассмотрении" }, { status: 409 });
  }

  const { fullName, phone, email, businessName, documentUrl } = parsed.data;
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedPhone || !normalizedEmail) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const app = await prisma.ownerApplication.create({
    data: {
      userId: user.id,
      fullName: fullName.trim(),
      phone: normalizedPhone,
      email: normalizedEmail,
      businessName: businessName.trim(),
      documentUrl: documentUrl || null,
      status: OWNER_APPLICATION_STATUS.PENDING
    }
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        bookingId: null,
        type: "OWNER_APPLICATION_NEW",
        isRead: false
      }))
    });
  }

  return NextResponse.json({ ok: true, id: app.id });
}
