export type OwnerSection =
  | "overview"
  | "properties"
  | "rooms"
  | "personnel"
  | "bookings"
  | "offline-bookings"
  | "calendar"
  | "notifications"
  | "reviews"
  | "finances"
  | "statistics"
  | "help";

export type OwnerMobileTab = "home" | "properties" | "bookings" | "calendar" | "menu";

export const OWNER_MOBILE_TABS: OwnerMobileTab[] = ["home", "properties", "bookings", "calendar", "menu"];

const MENU_SECTIONS = new Set<string>([
  "personnel",
  "finances",
  "statistics",
  "reviews",
  "notifications",
  "help"
]);

export function tabForOwnerSection(section: string): OwnerMobileTab {
  if (section === "overview") return "home";
  if (section === "properties" || section === "rooms") return "properties";
  if (section === "bookings" || section === "offline-bookings") return "bookings";
  if (section === "calendar") return "calendar";
  if (MENU_SECTIONS.has(section)) return "menu";
  return "home";
}

export function defaultSectionForOwnerTab(tab: OwnerMobileTab): OwnerSection {
  switch (tab) {
    case "home":
      return "overview";
    case "properties":
      return "properties";
    case "bookings":
      return "bookings";
    case "calendar":
      return "calendar";
    case "menu":
      return "overview";
    default:
      return "overview";
  }
}

export type OwnerSubNavItem = { section: OwnerSection; label: string };

export function subNavForOwnerTab(tab: OwnerMobileTab, labels: Record<string, string>): OwnerSubNavItem[] {
  switch (tab) {
    case "properties":
      return [
        { section: "properties", label: labels.properties },
        { section: "rooms", label: labels.rooms }
      ];
    case "bookings":
      return [
        { section: "bookings", label: labels.bookings },
        { section: "offline-bookings", label: labels.offlineBookings }
      ];
    default:
      return [];
  }
}
