import { NextRequest } from "next/server";
import { createActivationCode } from "@/lib/local-vault/createCode";
import { lvCatch, lvJsonOk } from "@/lib/local-vault/http";
import { LvError, LV_ERROR } from "@/lib/local-vault/errors";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { hotelId?: number } | null;
    if (!body || body.hotelId == null) {
      throw new LvError(LV_ERROR.HOTEL_NOT_AVAILABLE, 400);
    }
    const result = await createActivationCode({ hotelId: Number(body.hotelId) });
    return lvJsonOk(result, 201);
  } catch (e) {
    return lvCatch(e);
  }
}
