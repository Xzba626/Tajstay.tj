import { NextResponse } from "next/server";
import { isPusherConfigured } from "@/lib/pusher/config";

export async function GET() {
  return NextResponse.json({ enabled: isPusherConfigured() });
}
