import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * MOBILE PROFILE / OWNER / SECURITY CORRECTION BLOCK, PROBLEM K: every Profile subpage's "Back"
 * was a bare `<Link className="profile-subpage__back">{label}</Link>` — plain green text with no
 * icon, no button affordance, no guaranteed >=44px hit area. One reusable component now, used by
 * every ProfileSubpageShell consumer (Personal Data, Security, Notifications, Support, Legal),
 * instead of re-implementing this per page.
 */
export function ProfileBackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="profile-back-button">
      <ChevronLeft size={18} className="profile-back-button__icon" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
