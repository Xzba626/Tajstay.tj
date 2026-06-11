/** Platform roles (User.role). */
export const USER_ROLE = {
  GUEST: "GUEST",
  HOTEL_MODERATOR: "HOTEL_MODERATOR",
  OWNER: "OWNER",
  ADMIN: "ADMIN"
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

/** Fine-grained hotel-scoped permissions. */
export const PERMISSION = {
  VIEW_CALENDAR: "view_calendar",
  SEARCH_BOOKINGS: "search_bookings",
  CHECK_IN_OUT: "check_in_out",
  OFFLINE_BOOKING: "offline_booking",
  VIEW_GUESTS: "view_guests",
  VIEW_ROOM_STATUS: "view_room_status",
  ASSIGN_ROOMS: "assign_rooms",
  CONFIRM_BOOKING: "confirm_booking",
  VIEW_FINANCES: "view_finances",
  MANAGE_PAYOUTS: "manage_payouts",
  MANAGE_HOTEL_SETTINGS: "manage_hotel_settings",
  DELETE_HOTEL: "delete_hotel",
  MANAGE_PAYMENT_METHODS: "manage_payment_methods",
  VIEW_REVENUE_ANALYTICS: "view_revenue_analytics",
  MANAGE_STAFF: "manage_staff",
  MANAGE_ROOMS: "manage_rooms",
  MANAGE_PROPERTIES: "manage_properties",
  PAYMENT_APPROVE: "payment_approve",
  MANAGE_CALENDAR_OVERRIDES: "manage_calendar_overrides"
} as const;

export type Permission = (typeof PERMISSION)[keyof typeof PERMISSION];

const MODERATOR_PERMISSIONS: Permission[] = [
  PERMISSION.VIEW_CALENDAR,
  PERMISSION.SEARCH_BOOKINGS,
  PERMISSION.CHECK_IN_OUT,
  PERMISSION.OFFLINE_BOOKING,
  PERMISSION.VIEW_GUESTS,
  PERMISSION.VIEW_ROOM_STATUS,
  PERMISSION.ASSIGN_ROOMS,
  PERMISSION.CONFIRM_BOOKING
];

const OWNER_PERMISSIONS: Permission[] = [
  ...MODERATOR_PERMISSIONS,
  PERMISSION.VIEW_FINANCES,
  PERMISSION.MANAGE_PAYOUTS,
  PERMISSION.MANAGE_HOTEL_SETTINGS,
  PERMISSION.DELETE_HOTEL,
  PERMISSION.MANAGE_PAYMENT_METHODS,
  PERMISSION.VIEW_REVENUE_ANALYTICS,
  PERMISSION.MANAGE_STAFF,
  PERMISSION.MANAGE_ROOMS,
  PERMISSION.MANAGE_PROPERTIES,
  PERMISSION.PAYMENT_APPROVE,
  PERMISSION.MANAGE_CALENDAR_OVERRIDES
];

const ADMIN_PERMISSIONS: Permission[] = [...OWNER_PERMISSIONS];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [USER_ROLE.GUEST]: [],
  [USER_ROLE.HOTEL_MODERATOR]: MODERATOR_PERMISSIONS,
  [USER_ROLE.OWNER]: OWNER_PERMISSIONS,
  [USER_ROLE.ADMIN]: ADMIN_PERMISSIONS
};

export function permissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role as UserRole] ?? [];
}

export function hasPermission(permissions: Permission[], perm: Permission): boolean {
  return permissions.includes(perm);
}

/** Dashboard paths allowed per role (middleware). */
export const DASHBOARD_PATH_BY_ROLE: Record<string, string> = {
  [USER_ROLE.ADMIN]: "/dashboard/admin",
  [USER_ROLE.OWNER]: "/dashboard/owner",
  [USER_ROLE.HOTEL_MODERATOR]: "/dashboard/moderator",
  [USER_ROLE.GUEST]: "/dashboard/bookings"
};
