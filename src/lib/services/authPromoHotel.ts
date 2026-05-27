import { searchApprovedHotels } from "@/lib/services/search";

export type AuthPromoFeaturedHotel = {
  id: number;
  name: string;
  city: string;
  rating: number;
  minPrice: number;
  imageUrl: string | null;
};

/** Top-rated approved hotel for auth promo preview; null if none qualify. */
export async function getAuthPromoFeaturedHotel(): Promise<AuthPromoFeaturedHotel | null> {
  const hotels = await searchApprovedHotels({ sortBy: "RATING_DESC" });
  const hotel = hotels.find((h) => h.rating > 0 && h.rooms.length > 0);
  if (!hotel) return null;

  const minPrice = Math.min(...hotel.rooms.map((room) => Number(room.price)));
  if (!Number.isFinite(minPrice) || minPrice <= 0) return null;

  return {
    id: hotel.id,
    name: hotel.name,
    city: hotel.city,
    rating: hotel.rating,
    minPrice,
    imageUrl: hotel.coverImageUrl?.trim() || null
  };
}
