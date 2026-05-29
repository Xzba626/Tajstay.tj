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

function resolveHref(href: LinkProps["href"]): string {
  if (typeof href === "string") return href;
  const pathname = href.pathname ?? "/";
  const search = href.search ?? "";
  const hash = href.hash ?? "";
  return `${pathname}${search}${hash}`;
}

export function ViewTransitionLink({ href, onClick, children, ...rest }: Props) {
  const router = useRouter();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (typeof document === "undefined") return;

    const url = resolveHref(href);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startVT = (document as Document & { startViewTransition?: (cb: () => void) => { finished?: Promise<void> } })
      .startViewTransition;

    if (reduced || typeof startVT !== "function") return;

    e.preventDefault();
    try {
      const transition = startVT.call(document, () => {
        router.push(url);
      });
      void transition?.finished?.catch(() => {
        window.location.assign(url);
      });
    } catch {
      window.location.assign(url);
    }
  }

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
