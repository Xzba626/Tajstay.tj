/** Local Vault machine error codes — closed set matching Desktop contract. */
export const LV_ERROR = {
  INVALID_CODE: "INVALID_CODE",
  EXPIRED_CODE: "EXPIRED_CODE",
  ALREADY_USED: "ALREADY_USED",
  HOTEL_NOT_AVAILABLE: "HOTEL_NOT_AVAILABLE",
  DEVICE_ALREADY_BOUND: "DEVICE_ALREADY_BOUND",
  INVALID_DEVICE_IDENTITY: "INVALID_DEVICE_IDENTITY",
  UNSUPPORTED_APP_VERSION: "UNSUPPORTED_APP_VERSION",
  RATE_LIMITED: "RATE_LIMITED",
} as const;

export type LvErrorCode = (typeof LV_ERROR)[keyof typeof LV_ERROR];

export class LvError extends Error {
  readonly code: LvErrorCode;
  readonly httpStatus: number;
  readonly retryAfterSec?: number;

  constructor(code: LvErrorCode, httpStatus: number, retryAfterSec?: number) {
    super(code);
    this.name = "LvError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.retryAfterSec = retryAfterSec;
  }
}

export function lvErrorJson(err: LvError) {
  const body: { error: { code: string; retryAfterSec?: number } } = {
    error: { code: err.code },
  };
  if (err.code === LV_ERROR.RATE_LIMITED && err.retryAfterSec != null) {
    body.error.retryAfterSec = err.retryAfterSec;
  }
  return body;
}
