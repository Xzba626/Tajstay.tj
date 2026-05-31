import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/requireAuth";

export type ProfileUser = NonNullable<Awaited<ReturnType<typeof requireProfileUser>>>;

export async function requireProfileUser() {
  return requireUser(["GUEST", "OWNER", "ADMIN"]);
}

export function profileOk(extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: true, ...extra });
}

export function profileError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function mapProfileUniqueError(err: unknown): "phone" | "email" | "telegram" | "unknown" {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = err.meta?.target;
    const fields = Array.isArray(target) ? target.join(",") : String(target ?? "");
    if (fields.includes("phone")) return "phone";
    if (fields.includes("email")) return "email";
    if (fields.includes("telegramId")) return "telegram";
  }
  return "unknown";
}
