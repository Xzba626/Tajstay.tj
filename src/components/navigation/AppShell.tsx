"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TstAssistant } from "@/components/ai/TstAssistant";
import { isShellHiddenRoute, isWorkspaceRoute } from "@/constants/app-navigation";
import type { Locale } from "@/lib/i18n/locale";

type Props = {
  locale: Locale;
};

/**
 * Sets document-level shell mode for premium mobile chrome (tab bar, compact footer).
 * Mounts TST only after hydration so `useSearchParams` inside Suspense does not
 * shift siblings (PageBackdrop) and cause a body hydration mismatch.
 */
export function AppShell({ locale }: Props) {
  const pathname = usePathname() ?? "/";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const shell = !isShellHiddenRoute(pathname);
    const workspace = isWorkspaceRoute(pathname);
    document.body.classList.toggle("app-shell", shell);
    document.body.classList.toggle("app-shell--hidden-nav", !shell);
    document.body.classList.toggle("app-shell--workspace", workspace);
    return () => {
      document.body.classList.remove("app-shell", "app-shell--hidden-nav", "app-shell--workspace");
    };
  }, [pathname]);

  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
      <TstAssistant locale={locale} />
    </Suspense>
  );
}
