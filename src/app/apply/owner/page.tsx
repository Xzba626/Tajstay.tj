import { redirect } from "next/navigation";

/** Старый URL — редирект в профиль. */
export default function ApplyOwnerRedirectPage() {
  redirect("/profile/become-owner");
}
