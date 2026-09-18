import { NextResponse } from "next/server";
import { LvError, lvErrorJson, LV_ERROR } from "@/lib/local-vault/errors";
import { writeLvAudit, LV_AUDIT } from "@/lib/local-vault/audit";

export function lvJsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function lvCatch(
  err: unknown,
  auditCtx?: { hotelId?: number | null; deviceId?: string | null; actorUserId?: number | null }
): Promise<NextResponse> {
  if (err instanceof LvError) {
    if (err.code === LV_ERROR.INVALID_CODE || err.code === LV_ERROR.EXPIRED_CODE || err.code === LV_ERROR.ALREADY_USED || err.code === LV_ERROR.INVALID_DEVICE_IDENTITY) {
      await writeLvAudit({
        action: LV_AUDIT.ACTIVATION_FAILED,
        hotelId: auditCtx?.hotelId,
        deviceId: auditCtx?.deviceId,
        actorUserId: auditCtx?.actorUserId,
        metadata: { code: err.code },
      }).catch(() => undefined);
    }
    const headers: HeadersInit = {};
    if (err.code === LV_ERROR.RATE_LIMITED && err.retryAfterSec != null) {
      headers["Retry-After"] = String(err.retryAfterSec);
    }
    return NextResponse.json(lvErrorJson(err), { status: err.httpStatus, headers });
  }
  console.error("[local-vault] unexpected", err instanceof Error ? err.message : "error");
  return NextResponse.json({ error: { code: LV_ERROR.INVALID_DEVICE_IDENTITY } }, { status: 500 });
}
