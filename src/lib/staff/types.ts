import crypto from "node:crypto";

export const STAFF_ROLE = {
  MANAGER: "MANAGER",
  RECEPTIONIST: "RECEPTIONIST",
  HOUSEKEEPING: "HOUSEKEEPING"
} as const;

export type StaffRole = (typeof STAFF_ROLE)[keyof typeof STAFF_ROLE];

export const STAFF_STATUS = {
  ACTIVE: "ACTIVE",
  INVITED: "INVITED",
  SUSPENDED: "SUSPENDED",
  REMOVED: "REMOVED"
} as const;

export type StaffStatus = (typeof STAFF_STATUS)[keyof typeof STAFF_STATUS];

/** Operational permissions for hotel-scoped staff (Manager policy for BLOCK 5). */
export const HOTEL_PERMISSION = {
  BOOKING_CREATE_OFFLINE: "BOOKING_CREATE_OFFLINE",
  BOOKING_VIEW: "BOOKING_VIEW",
  BOOKING_OPERATIONAL_UPDATE: "BOOKING_OPERATIONAL_UPDATE",
  PAYMENT_RECORD: "PAYMENT_RECORD",
  CHAT_BOOKING_ACCESS: "CHAT_BOOKING_ACCESS",
  TODAY_VIEW: "TODAY_VIEW"
} as const;

export type HotelPermission = (typeof HOTEL_PERMISSION)[keyof typeof HOTEL_PERMISSION];

const MANAGER_PERMISSIONS: ReadonlySet<HotelPermission> = new Set(Object.values(HOTEL_PERMISSION));

export function permissionsForStaffRole(role: string): ReadonlySet<HotelPermission> {
  if (role === STAFF_ROLE.MANAGER) return MANAGER_PERMISSIONS;
  // Future: narrower reception/housekeeping policies.
  return new Set();
}

export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateTempPassword(): string {
  // Readable but not guessable: 12 chars from crypto.
  return crypto.randomBytes(9).toString("base64url").slice(0, 12);
}
