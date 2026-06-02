export type AdminSection =
  | "dashboard"
  | "content"
  | "applications"
  | "hotels"
  | "users"
  | "owner-access"
  | "bookings"
  | "finance"
  | "notifications"
  | "complaints";

export type AdminMobileTab = "home" | "properties" | "bookings" | "users" | "more";

export const ADMIN_MOBILE_TABS: AdminMobileTab[] = ["home", "properties", "bookings", "users", "more"];

export function tabForSection(section: string): AdminMobileTab {
  if (section === "dashboard") return "home";
  if (section === "hotels" || section === "applications") return "properties";
  if (section === "bookings") return "bookings";
  if (section === "users" || section === "owner-access") return "users";
  return "more";
}

export function defaultSectionForTab(tab: AdminMobileTab): AdminSection {
  switch (tab) {
    case "home":
      return "dashboard";
    case "properties":
      return "hotels";
    case "bookings":
      return "bookings";
    case "users":
      return "users";
    case "more":
      return "notifications";
    default:
      return "dashboard";
  }
}

export type AdminSubNavItem = { section: AdminSection; label: string };

export function subNavForTab(tab: AdminMobileTab, labels: Record<string, string>): AdminSubNavItem[] {
  switch (tab) {
    case "properties":
      return [
        { section: "hotels", label: labels.hotels },
        { section: "applications", label: labels.applications }
      ];
    case "users":
      return [
        { section: "users", label: labels.users },
        { section: "owner-access", label: labels.ownerAccess }
      ];
    case "more":
      return [
        { section: "finance", label: labels.finance },
        { section: "complaints", label: labels.complaints },
        { section: "notifications", label: labels.notifications },
        { section: "content", label: labels.content }
      ];
    default:
      return [];
  }
}

export function titleKeyForSection(section: AdminSection): string {
  const map: Record<AdminSection, string> = {
    dashboard: "adminNav.dashboard",
    content: "adminNav.content",
    applications: "adminNav.applications",
    hotels: "adminNav.hotels",
    users: "adminNav.users",
    "owner-access": "adminNav.ownerAccess",
    bookings: "adminNav.bookings",
    finance: "adminNav.finance",
    complaints: "adminNav.complaints",
    notifications: "adminNav.notifications"
  };
  return map[section] ?? "admin.pageTitle";
}
