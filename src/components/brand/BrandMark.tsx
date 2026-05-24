import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/cn";

type Props = {
  href?: string;
  name?: string;
  markSrc?: string;
  showName?: boolean;
  size?: "sm" | "md";
  className?: string;
  nameClassName?: string;
};

export function BrandMark({
  href,
  name = BRAND.name,
  markSrc = BRAND.logoMark,
  showName = true,
  size = "md",
  className,
  nameClassName
}: Props) {
  const inner = (
    <>
      <span className={cn("brand-mark-badge", size === "sm" && "brand-mark-badge--sm")}>
        <Image
          src={markSrc}
          alt=""
          width={size === "sm" ? 28 : 32}
          height={size === "sm" ? 28 : 32}
          className={cn("object-contain", size === "sm" ? "h-7 w-7" : "h-8 w-8")}
          unoptimized
          priority
        />
      </span>
      {showName ? (
        <span className={cn("brand-mark-name truncate font-bold text-[var(--taj-text)]", nameClassName)}>{name}</span>
      ) : null}
    </>
  );

  const classes = cn("brand-mark inline-flex min-w-0 items-center gap-2 sm:gap-2.5", className);

  if (href) {
    return (
      <Link href={href} className={cn(classes, "rounded-xl outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-emerald-400/50")}>
        {inner}
      </Link>
    );
  }

  return <div className={classes}>{inner}</div>;
}
