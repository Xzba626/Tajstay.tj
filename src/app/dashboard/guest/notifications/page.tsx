import { redirect } from "next/navigation";

/** Legacy route — unified notifications center */
export default function GuestNotificationsRedirect() {
  redirect("/notifications");
}
