import { redirect } from "next/navigation";
import { tripsHubFromLegacyGuest } from "@/lib/trips/urls";

export const dynamic = "force-dynamic";

/** Legacy route — unified into Trips Hub. */
export default function GuestDashboardRedirect({
  searchParams
}: {
  searchParams?: { notice?: string; error?: string; tab?: string };
}) {
  redirect(tripsHubFromLegacyGuest(searchParams));
}
