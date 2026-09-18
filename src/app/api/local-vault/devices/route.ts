import { NextRequest } from "next/server";
import { listDevices } from "@/lib/local-vault/devices";
import { lvCatch, lvJsonOk } from "@/lib/local-vault/http";

export async function GET(req: NextRequest) {
  try {
    const hotelIdRaw = req.nextUrl.searchParams.get("hotelId");
    const hotelId = hotelIdRaw != null && hotelIdRaw !== "" ? Number(hotelIdRaw) : null;
    if (hotelId != null && (!Number.isFinite(hotelId) || hotelId <= 0)) {
      return lvJsonOk({ devices: [] }, 200);
    }
    const result = await listDevices(hotelId);
    return lvJsonOk(result, 200);
  } catch (e) {
    return lvCatch(e);
  }
}
