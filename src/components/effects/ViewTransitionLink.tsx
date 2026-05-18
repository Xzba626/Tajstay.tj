"use client";

import type React from "react";
import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, PropsWithChildren } from "react";

type Props = PropsWithChildren<
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
    LinkProps & {
      className?: string;
    }
>;

export function ViewTransitionLink({ href, onClick, children, ...rest }: Props) {
  const router = useRouter();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const url = typeof href === "string" ? href : href.pathname ?? "/";
    if (typeof document === "undefined") return;

    const anyDoc = document as any;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && typeof anyDoc.startViewTransition === "function") {
      e.preventDefault();
      anyDoc.startViewTransition(() => {
        router.push(typeof href === "string" ? href : (href as any));
      });
    }
  }

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
