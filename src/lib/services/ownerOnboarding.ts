import { prisma } from "@/lib/prisma";
import { getOwnerPaymentMethods } from "@/lib/owner-payment-methods";

export type OwnerOnboardingStep = {
  id: "property" | "photos" | "payment" | "calendar" | "publish";
  done: boolean;
  href: string;
};

export async function getOwnerOnboardingSteps(ownerId: number): Promise<OwnerOnboardingStep[]> {
  const hotels = await prisma.hotel.findMany({
    where: { ownerId },
    include: {
      photos: { take: 1 },
      rooms: { include: { photos: { take: 1 }, overrides: { take: 1 } } }
    }
  });

  const paymentMethods = await getOwnerPaymentMethods(ownerId);
  const hasProperty = hotels.length > 0;
  const hasPhotos = hotels.some((h) => Boolean(h.coverImageUrl) || h.photos.length > 0 || h.rooms.some((r) => r.photos.length > 0));
  const hasPayment = paymentMethods.length > 0;
  const hasCalendar = hotels.some((h) => h.rooms.some((r) => r.overrides.length > 0));
  const hasPublished = hotels.some((h) => h.status === "APPROVED");

  return [
    { id: "property", done: hasProperty, href: "/dashboard/owner?section=properties" },
    { id: "photos", done: hasPhotos, href: "/dashboard/owner?section=properties" },
    { id: "payment", done: hasPayment, href: "/dashboard/owner?section=finances" },
    { id: "calendar", done: hasCalendar, href: "/dashboard/owner?section=calendar" },
    { id: "publish", done: hasPublished, href: "/dashboard/owner?section=properties" }
  ];
}

export function onboardingProgress(steps: OwnerOnboardingStep[]): { done: number; total: number; percent: number } {
  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}
