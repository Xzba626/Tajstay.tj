import type { TstHotel, TstParsedQuery } from "@/lib/ai/tstIntent";

export type TstPageKind = "home" | "search" | "hotel" | "booking" | "history" | "other";

export type TstPageContext = {
  kind: TstPageKind;
  hotelId?: number;
  searchDraft: Partial<TstParsedQuery>;
};

export function parsePageContext(pathname: string, rawSearch: string): TstPageContext {
  const params = new URLSearchParams(rawSearch);
  const searchDraft = searchParamsToDraft(params);

  if (pathname.startsWith("/hotel/")) {
    const id = Number(pathname.split("/")[2]);
    return {
      kind: "hotel",
      hotelId: Number.isFinite(id) ? id : undefined,
      searchDraft
    };
  }
  if (pathname.startsWith("/search") || pathname.startsWith("/map")) {
    return { kind: "search", searchDraft };
  }
  if (pathname === "/") {
    return { kind: "home", searchDraft };
  }
  if (pathname.startsWith("/history") || pathname.startsWith("/dashboard/bookings")) {
    return { kind: "history", searchDraft };
  }
  if (pathname.startsWith("/chat/booking")) {
    return { kind: "history", searchDraft };
  }
  if (pathname.startsWith("/booking") || pathname.startsWith("/payment")) {
    return { kind: "booking", searchDraft };
  }
  return { kind: "other", searchDraft };
}

export function searchParamsToDraft(params: URLSearchParams): Partial<TstParsedQuery> {
  const draft: Partial<TstParsedQuery> = {};
  const city = params.get("city");
  const maxPrice = params.get("maxPrice");
  const minPrice = params.get("minPrice");
  const guests = params.get("guests");
  const checkIn = params.get("checkIn");
  const checkOut = params.get("checkOut");
  if (city) draft.city = city;
  if (maxPrice) draft.maxPrice = Number(maxPrice);
  if (minPrice) draft.minPrice = Number(minPrice);
  if (guests) draft.guests = Number(guests);
  if (checkIn) draft.checkIn = checkIn;
  if (checkOut) draft.checkOut = checkOut;
  if (params.get("wifi") === "true") draft.wifi = true;
  if (params.get("breakfast") === "true") draft.breakfast = true;
  if (params.get("parking") === "true") draft.parking = true;
  return draft;
}

export function contextHintKey(ctx: TstPageContext): string | null {
  if (ctx.kind === "hotel" && ctx.hotelId) return "tstAssistant.context.hotel";
  if (ctx.kind === "search") return "tstAssistant.context.search";
  if (ctx.kind === "history") return "tstAssistant.context.history";
  if (ctx.kind === "booking") return "tstAssistant.context.booking";
  return null;
}
