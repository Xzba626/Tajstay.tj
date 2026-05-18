import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { runDevSeed } from "@/lib/seed/runDevSeed";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return forbiddenJson();
  }

  const secret = process.env.SEED_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "SEED_SECRET is not set in .env (required for /api/seed in development)" },
      { status: 503 }
    );
  }

  const provided =
    req.nextUrl.searchParams.get("secret")?.trim() ?? req.headers.get("x-seed-secret")?.trim() ?? "";
  if (provided !== secret) return forbiddenJson();

  const adminSession = await getAdminUser();
  const allowInsecureDev = process.env.SEED_ALLOW_INSECURE_DEV === "1";
  if (!adminSession && !allowInsecureDev) {
    return NextResponse.json(
      {
        error:
          "Log in as ADMIN or set SEED_ALLOW_INSECURE_DEV=1 in .env for one-time bootstrap (development only)."
      },
      { status: 403 }
    );
  }

  const users = await runDevSeed();

  return NextResponse.json({
    ok: true,
    users: { adminId: users.adminId, ownerId: users.ownerId, guestId: users.guestId },
    hotelId: users.hotelId
  });
}
