import { redirect } from "next/navigation";

export default function ProfileEmailRedirect() {
  redirect("/profile/account/email");
}
