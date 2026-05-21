import { NextResponse } from "next/server";
import { getFirebasePublicConfig } from "@/lib/firebase/config";

/** GET — public Firebase web config for client init (keys are already NEXT_PUBLIC_*). */
export async function GET() {
  const config = getFirebasePublicConfig();
  if (!config) return NextResponse.json({ enabled: false });
  return NextResponse.json({ enabled: true, config });
}
