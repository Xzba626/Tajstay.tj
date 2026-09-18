import { LvError, LV_ERROR } from "@/lib/local-vault/errors";

/**
 * LOCAL_VAULT_CODE_PEPPER — fail closed. No hardcoded fallback.
 */
export function requireCodePepper(): string {
  const pepper = process.env.LOCAL_VAULT_CODE_PEPPER?.trim() ?? "";
  if (!pepper || pepper.length < 16) {
    throw new LvError(LV_ERROR.HOTEL_NOT_AVAILABLE, 503);
  }
  return pepper;
}

export function isPepperConfigured(): boolean {
  const pepper = process.env.LOCAL_VAULT_CODE_PEPPER?.trim() ?? "";
  return pepper.length >= 16;
}
