import { NextResponse } from "next/server";

export async function GET() {
  // Placeholder. When you add real OAuth credentials, wire this to NextAuth/Google provider.
  return NextResponse.json(
    {
      ok: false,
      error: "Google OAuth is not wired yet. Add real integration later."
    },
    { status: 501 }
  );
}

