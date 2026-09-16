/**
 * Owner Active Hotel — UX preference only (not AuthZ authority).
 * Canonical authority remains URL `?hotelId=` + server ownership checks.
 */
export const OWNER_ACTIVE_HOTEL_COOKIE = "tajstay_owner_hotel";

export function parseOwnerHotelId(raw: string | undefined | null): number {
  const n = Number(raw ?? "");
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

/** Pick active hotel among approved IDs: URL wins, then cookie preference, then first. */
export function resolveActiveHotelId(opts: {
  requestedId: number;
  preferredId: number;
  approvedIds: number[];
}): { hotelId: number; shouldRedirect: boolean; redirectToId: number | null } {
  const approved = opts.approvedIds.filter((id) => Number.isFinite(id) && id > 0);
  if (approved.length === 0) {
    return { hotelId: 0, shouldRedirect: false, redirectToId: null };
  }
  const set = new Set(approved);
  if (opts.requestedId > 0 && set.has(opts.requestedId)) {
    return { hotelId: opts.requestedId, shouldRedirect: false, redirectToId: null };
  }
  if (opts.requestedId > 0 && !set.has(opts.requestedId)) {
    const fallback =
      opts.preferredId > 0 && set.has(opts.preferredId) ? opts.preferredId : approved[0];
    return { hotelId: fallback, shouldRedirect: true, redirectToId: fallback };
  }
  // No hotelId in URL
  if (approved.length === 1) {
    return { hotelId: approved[0], shouldRedirect: false, redirectToId: null };
  }
  if (opts.preferredId > 0 && set.has(opts.preferredId)) {
    return { hotelId: opts.preferredId, shouldRedirect: true, redirectToId: opts.preferredId };
  }
  return { hotelId: approved[0], shouldRedirect: true, redirectToId: approved[0] };
}
