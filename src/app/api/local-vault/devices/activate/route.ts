import { NextRequest } from "next/server";
import { activateDevice, type ActivateBody } from "@/lib/local-vault/activate";
import { lvCatch, lvJsonOk } from "@/lib/local-vault/http";
import { LvError, LV_ERROR } from "@/lib/local-vault/errors";

export async function POST(req: NextRequest) {
  try {
    const rawBody = Buffer.from(await req.arrayBuffer());
    let body: ActivateBody;
    try {
      body = JSON.parse(rawBody.toString("utf8")) as ActivateBody;
    } catch {
      throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 400);
    }
    if (!body.activationCode) {
      throw new LvError(LV_ERROR.INVALID_CODE, 400);
    }
    const result = await activateDevice(req, rawBody, body);
    return lvJsonOk(result, 200);
  } catch (e) {
    return lvCatch(e);
  }
}
