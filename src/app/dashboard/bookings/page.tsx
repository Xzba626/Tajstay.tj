import { redirect } from "next/navigation";
import { tripsHubPath } from "@/lib/trips/urls";
import { parseTripsTab } from "@/lib/trips/classify";

type Props = {
  searchParams?: { tab?: string; notice?: string; error?: string };
};

/** Legacy path — keep working links; History hub lives at /history. */
export default function BookingsLegacyRedirect({ searchParams }: Props) {
  const tab = parseTripsTab(searchParams?.tab);
  redirect(
    tripsHubPath(tab, {
      notice: searchParams?.notice,
      error: searchParams?.error
    })
  );
}
