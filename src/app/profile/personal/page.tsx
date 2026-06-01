import { redirect } from "next/navigation";

export default function ProfilePersonalRedirect() {
  redirect("/profile/edit");
}
