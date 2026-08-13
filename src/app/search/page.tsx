import { searchApprovedHotels, type PropertyTypeFilter } from "@/lib/services/search";
import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { SearchExperience } from "@/widgets/search-filters/SearchExperience";
import { HomeSearchExtras } from "@/components/home/HomeSearchExtras";
import { getSiteContent } from "@/lib/site-content";

const BOOK_ERR_KEYS: Record<string, string> = {
  invalid: "checkout.errInvalid",
  dates: "checkout.errDates",
  phone_in_use: "checkout.errPhoneTaken",
  unavailable: "checkout.errUnavailable",
  failed: "checkout.errGeneric",
  rate: "checkout.errRate"
};

type Props = {
  searchParams: {
    bookErr?: string;
    q?: string;
    city?: string;
    guests?: string;
    minPrice?: string;
    maxPrice?: string;
    propertyType?: PropertyTypeFilter;
    checkIn?: string;
    checkOut?: string;
    wifi?: string;
    breakfast?: string;
    parking?: string;
    ratingMin?: string;
    sortBy?: "POPULAR" | "PRICE_ASC" | "RATING_DESC";
  };
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Поиск отелей — TajStay",
    description: "Найдите и сравните отели по городам, цене, рейтингу и датам заезда в TajStay."
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const locale = getLocale();
  const bookErr = (searchParams.bookErr ?? "").trim();
  const errPath = BOOK_ERR_KEYS[bookErr];
  const content = await getSiteContent();
  const hotels = await searchApprovedHotels({
    q: searchParams.q,
    city: searchParams.city,
    guests: Number(searchParams.guests || 1),
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
    propertyType: searchParams.propertyType ?? "ANY",
    wifi: searchParams.wifi === "on" || searchParams.wifi === "true",
    breakfast: searchParams.breakfast === "on" || searchParams.breakfast === "true",
    parking: searchParams.parking === "on" || searchParams.parking === "true",
    ratingMin: searchParams.ratingMin ? Number(searchParams.ratingMin) : undefined,
    sortBy: searchParams.sortBy ?? "POPULAR"
  });
  return (
    <div className="mx-auto flex w-[94%] max-w-7xl flex-col justify-center space-y-4 px-0 py-4 sm:w-full sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
      {errPath && (
        <div
          className="rounded-xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm text-brand-200"
          role="alert"
        >
          <span className="font-semibold">{m(locale, "checkout.errBanner")}: </span>
          {m(locale, errPath)}
        </div>
      )}
      <div className="hidden md:block" data-reveal data-stagger="30">
        <h1 className="text-[clamp(1.7rem,6vw,2.2rem)] font-bold tracking-tight text-white">{m(locale, "header.search")}</h1>
        <p className="mt-2 text-brand-200">{m(locale, "search.filters")}</p>
      </div>
      <div className="p-0 md:rounded-3xl md:p-5" data-reveal data-stagger="70">
        <SearchExperience
          initialHotels={hotels}
          locale={locale}
          initialFilters={{
            q: searchParams.q,
            city: searchParams.city,
            checkIn: searchParams.checkIn,
            checkOut: searchParams.checkOut,
            guests: searchParams.guests,
            minPrice: searchParams.minPrice,
            maxPrice: searchParams.maxPrice,
            ratingMin: searchParams.ratingMin,
            sortBy: searchParams.sortBy,
            wifi: searchParams.wifi,
            breakfast: searchParams.breakfast,
            parking: searchParams.parking,
            propertyType: searchParams.propertyType
          }}
        />
      </div>
      <div className="search-moved-sections md:hidden">
        <HomeSearchExtras locale={locale} banner={content.homeBanner} />
      </div>
    </div>
  );
}

