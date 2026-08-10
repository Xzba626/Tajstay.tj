import type { TajPatternKind } from "@/components/ds/TajikPattern";

/**
 * One screen = one dominant heritage motif (Phase 5F).
 * Secondary Divider/Micro/Corner may accompany; never stack competing families.
 */
export const HERITAGE_MOTIF_BY_SCREEN = {
  home: "pamir",
  search: "main",
  hotel: "pamir",
  booking: "crown",
  payment: "crown",
  "payment-success": "crown",
  chat: "micro",
  profile: "chakan",
  favorites: "chakan",
  login: "crown",
  register: "crown",
  about: "dushanbe",
  owner: "micro",
  admin: "divider",
  "empty-state": "chakan",
  "not-found": "pamir",
  footer: "main"
} as const satisfies Record<string, TajPatternKind>;

export type HeritageScreen = keyof typeof HERITAGE_MOTIF_BY_SCREEN;

export function dominantMotifFor(screen: HeritageScreen): TajPatternKind {
  return HERITAGE_MOTIF_BY_SCREEN[screen];
}
