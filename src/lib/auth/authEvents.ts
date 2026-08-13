export const AUTH_ROLE_CHANGED_EVENT = "tajstay:auth-role-changed";

export type AuthRoleChangedDetail = {
  role: string;
  previousRole?: string;
};

export function dispatchAuthRoleChanged(detail: AuthRoleChangedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_ROLE_CHANGED_EVENT, { detail }));
}
