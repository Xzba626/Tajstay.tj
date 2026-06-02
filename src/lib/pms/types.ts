/** Physical room operational status */
export const PHYSICAL_ROOM_STATUS = {
  ACTIVE: "ACTIVE",
  OUT_OF_SERVICE: "OUT_OF_SERVICE",
  MAINTENANCE: "MAINTENANCE",
  CLEANING: "CLEANING",
  DIRTY: "DIRTY",
  INSPECTED: "INSPECTED",
  HIDDEN: "HIDDEN",
  ARCHIVED: "ARCHIVED"
} as const;

export type PhysicalRoomStatus = (typeof PHYSICAL_ROOM_STATUS)[keyof typeof PHYSICAL_ROOM_STATUS];

export const HOUSEKEEPING_STATUS = {
  CLEAN: "CLEAN",
  DIRTY: "DIRTY",
  CLEANING: "CLEANING",
  INSPECTED: "INSPECTED"
} as const;

export type HousekeepingStatus = (typeof HOUSEKEEPING_STATUS)[keyof typeof HOUSEKEEPING_STATUS];

export const MEAL_PLAN = {
  ROOM_ONLY: "ROOM_ONLY",
  BREAKFAST: "BREAKFAST",
  HALF_BOARD: "HALF_BOARD",
  FULL_BOARD: "FULL_BOARD"
} as const;

export type MealPlan = (typeof MEAL_PLAN)[keyof typeof MEAL_PLAN];

export const STAFF_ROLE = {
  RECEPTIONIST: "RECEPTIONIST",
  HOUSEKEEPING: "HOUSEKEEPING",
  /** Управляющий отеля — операции без вкладки «Финансы» */
  MANAGER: "MANAGER"
} as const;

export type HotelStaffRole = (typeof STAFF_ROLE)[keyof typeof STAFF_ROLE];

/** Room not sellable regardless of bookings */
export const NON_SELLABLE_ROOM_STATUSES: PhysicalRoomStatus[] = [
  PHYSICAL_ROOM_STATUS.OUT_OF_SERVICE,
  PHYSICAL_ROOM_STATUS.MAINTENANCE,
  PHYSICAL_ROOM_STATUS.HIDDEN,
  PHYSICAL_ROOM_STATUS.ARCHIVED
];

export function getBookingPhysicalRoomId(booking: {
  assignedRoomId?: number | null;
  roomId?: number | null;
}): number | null {
  return booking.assignedRoomId ?? booking.roomId ?? null;
}
