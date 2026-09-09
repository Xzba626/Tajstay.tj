import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { firstName?: string; lastName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";

  if (!firstName || firstName.length > 60 || lastName.length > 60) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const name = lastName ? `${firstName} ${lastName}` : firstName;

  await prisma.user.update({ where: { id: user.id }, data: { name } });

  return NextResponse.json({ ok: true, name });
}
