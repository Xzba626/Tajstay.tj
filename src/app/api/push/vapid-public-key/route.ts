import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) {
    return NextResponse.json({ publicKey: null, enabled: false }, { status: 200 });
  }
  return NextResponse.json({ publicKey, enabled: true });
}
