export type OwnerSection =
  | "overview"
  | "properties"
  | "rooms"
  | "bookings"
  | "offline-bookings"
  | "calendar"
  | "notifications"
  | "reviews"
  | "finances"
  | "statistics"
  | "help";

export type OwnerMobileTab = "home" | "properties" | "bookings" | "calendar" | "more";

export const OWNER_MOBILE_TABS: OwnerMobileTab[] = ["home", "properties", "bookings", "calendar", "more"];

export function tabForOwnerSection(section: string): OwnerMobileTab {
  if (section === "overview") return "home";
  if (section === "properties" || section === "rooms") return "properties";
  if (section === "bookings" || section === "offline-bookings") return "bookings";
  if (section === "calendar") return "calendar";
  return "more";
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
    case "more":
      return "finances";
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
    case "more":
      return [
        { section: "finances", label: labels.finances },
        { section: "statistics", label: labels.statistics },
        { section: "reviews", label: labels.reviews },
        { section: "notifications", label: labels.notifications },
        { section: "help", label: labels.help }
      ];
    default:
      return [];
  }
}
