import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { toPublicUser } from "@/lib/auth/publicUser";
import { getUserTrustBadges } from "@/lib/auth/trustBadges";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json(
    { user: toPublicUser(user), trust: getUserTrustBadges(user) },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

