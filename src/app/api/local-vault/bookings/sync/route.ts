import { NextRequest } from "next/server";
import { deviceBookingSync } from "@/lib/local-vault/bookingSync";
import { lvCatch, lvJsonOk } from "@/lib/local-vault/http";

/** Same shape as devices/heartbeat: raw body in, signed-PoP verified inside the service. */
export async function POST(req: NextRequest) {
  try {
    const rawBody = Buffer.from(await req.arrayBuffer());
    const result = await deviceBookingSync(req, rawBody);
    return lvJsonOk(result, 200);
  } catch (e) {
    return lvCatch(e);
  }
}
