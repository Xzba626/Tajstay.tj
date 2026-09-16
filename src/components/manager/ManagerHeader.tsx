import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function ManagerHeader({
  hotelName,
  brandLabel,
  profileHref = "/dashboard/manager/profile"
}: {
  hotelName: string;
  brandLabel: string;
  profileHref?: string;
}) {
  return (
    <header className="owner-workspace-header manager-workspace-header">
      <div className="owner-workspace-header__inner">
        <Link href="/dashboard/manager/today" className="owner-workspace-header__brand">
          <span className="owner-workspace-header__brand-primary">{brandLabel || BRAND.name}</span>
          <span className="owner-workspace-header__brand-secondary">{hotelName}</span>
        </Link>
        <Link href={profileHref} className="owner-workspace-header__action">
          ☰
        </Link>
      </div>
    </header>
  );
}
