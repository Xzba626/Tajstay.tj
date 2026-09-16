import { getLocale } from "@/lib/i18n/get-locale";
import { requireManager, listActiveStaffHotels } from "@/lib/staff/hotelAccess";
import { ManagerProfileClient } from "@/components/manager/ManagerProfileClient";

export default async function ManagerProfilePage() {
  const user = await requireManager();
  const locale = getLocale();
  const memberships = await listActiveStaffHotels(user.id);
  return (
    <ManagerProfileClient
      locale={locale}
      name={user.name}
      hotels={memberships.map((x) => ({ id: x.hotel.id, name: x.hotel.name }))}
    />
  );
}
