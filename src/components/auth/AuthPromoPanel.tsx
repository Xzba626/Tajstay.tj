import type { AuthPromoFeaturedHotel } from "@/lib/services/authPromoHotel";

export type AuthPromoLabels = {
  badge: string;
  headingLine1: string;
  headingAccent: string;
  subtitle: string;
  benefit1Title: string;
  benefit1Text: string;
  benefit2Title: string;
  benefit2Text: string;
  benefit3Title: string;
  benefit3Text: string;
  previewGuestChoice: string;
  previewPriceFrom: string;
  previewAbstractTitle: string;
  previewAbstractRating: string;
  previewAbstractConfirm: string;
  trustSsl: string;
  trustVerified: string;
  trustNoFees: string;
  trustInstant: string;
};

export type AuthPromoPanelProps = {
  labels: AuthPromoLabels;
  featuredHotel?: AuthPromoFeaturedHotel | null;
};

export { TajAuthPromoPanel as AuthPromoPanel } from "@/components/auth/TajAuthPromoPanel";
