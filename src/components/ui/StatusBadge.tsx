import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "success" | "warning" | "danger" | "neutral" | "info";

const variants: Record<Variant, string> = {
  success: "bg-[rgba(20,92,67,0.3)] text-white ring-[rgba(42,74,64,0.95)]",
  warning: "bg-[rgba(125,94,35,0.3)] text-[#f5e6bf] ring-[rgba(133,109,57,0.95)]",
  danger: "bg-[rgba(130,45,54,0.28)] text-[#ffd6dc] ring-[rgba(150,68,80,0.95)]",
  neutral: "bg-[rgba(15,31,26,0.75)] text-[var(--ds-text-secondary)] ring-[rgba(42,74,64,0.95)]",
  info: "bg-[rgba(15,61,46,0.35)] text-[var(--ds-text-primary)] ring-[rgba(42,74,64,0.95)]"
};

export function StatusBadge({
  children,
  variant,
  className
}: {
  children: ReactNode;
  variant: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Hotel moderation */
export function hotelStatusVariant(status: string): Variant {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING":
      return "warning";
    case "REJECTED":
    case "DELETED":
      return "danger";
    default:
      return "neutral";
  }
}

/** Payment */
export function paymentStatusVariant(status: string): Variant {
  switch (status) {
    case "PAID":
      return "success";
    case "PENDING":
      return "warning";
    case "FAILED":
      return "danger";
    case "REFUNDED":
      return "neutral";
    default:
      return "neutral";
  }
}

/** Booking lifecycle */
export function bookingStatusVariant(status: string): Variant {
  if (status === "CONFIRMED" || status === "COMPLETED") return "success";
  if (status === "CHECKED_IN") return "info";
  if (status === "PENDING_OWNER" || status === "PENDING_PAYMENT" || status === "WAITING_PAYMENT" || status === "WAIT_PROOF" || status === "ON_REVIEW") return "warning";
  if (status === "CANCELLED" || status === "REJECTED") return "danger";
  return "neutral";
}

/** Complaints */
export function complaintStatusVariant(status: string): Variant {
  if (status === "RESOLVED") return "success";
  if (status === "OPEN" || status === "PENDING") return "warning";
  return "neutral";
}

export function roleVariant(role: string): Variant {
  if (role === "ADMIN") return "info";
  if (role === "OWNER") return "warning";
  return "neutral";
}
