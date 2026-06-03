export const AUTH_ROLE_CHANGED_EVENT = "tajstay:auth-role-changed";
export const PROFILE_UPDATED_EVENT = "tajstay:profile-updated";

export type AuthRoleChangedDetail = {
  role: string;
  previousRole?: string;
};

export type ProfileUpdatedDetail = {
  telegramId?: string | null;
  telegramUsername?: string | null;
};

export function dispatchAuthRoleChanged(detail: AuthRoleChangedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_ROLE_CHANGED_EVENT, { detail }));
}

export function dispatchProfileUpdated(detail: ProfileUpdatedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail }));
}
