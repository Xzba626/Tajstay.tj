import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  href: string;
  label: string;
  className?: string;
};

/**
 * Reusable TajStay Admin back control (ADM-7). Explicit `href` fallback target — never relies on
 * browser history alone, since a nested Admin screen can be reached by direct link/refresh with
 * no history to go back to.
 */
export function AdminBackButton({ href, label, className }: Props) {
  return (
    <Link
      href={href}
      className={cn("admin-back-button", className)}
    >
      <ChevronLeft className="admin-back-button__icon" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
