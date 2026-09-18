import { NextRequest } from "next/server";
import { revokeDevice } from "@/lib/local-vault/devices";
import { lvCatch, lvJsonOk } from "@/lib/local-vault/http";
import { LvError, LV_ERROR } from "@/lib/local-vault/errors";

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    const id = ctx.params?.id?.trim();
    if (!id) throw new LvError(LV_ERROR.INVALID_DEVICE_IDENTITY, 404);
    const body = (await req.json().catch(() => ({}))) as { reason?: string };
    const result = await revokeDevice({ bindingId: id, reason: body.reason ?? null });
    return lvJsonOk(result, 200);
  } catch (e) {
    return lvCatch(e);
  }
}
