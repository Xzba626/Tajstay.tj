import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { getSiteContent } from "@/lib/site-content";

export async function Footer() {
  const locale = getLocale();
  const content = await getSiteContent();
  const year = new Date().getFullYear();

  const links = [
    { href: "/about", label: m(locale, "footer.about") },
    { href: "/contacts", label: m(locale, "footer.contacts") },
    { href: "/faq", label: m(locale, "footer.faq") },
    { href: "/profile/become-owner", label: m(locale, "userMenu.becomeOwner") },
    { href: "/terms", label: m(locale, "footer.terms") },
    { href: "/policy", label: m(locale, "footer.policy") }
  ];

  return (
    <footer className="site-footer mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <BrandMark
              href="/"
              name={content.brand.siteName}
              markSrc={content.brand.logoMarkUrl}
              nameClassName="text-sm sm:text-base"
            />
          </div>

          <nav className="footer-trust-grid text-sm" aria-label="Footer">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[var(--taj-text-secondary)] transition hover:text-[var(--taj-text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--taj-bg)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-4 border-t border-white/10 pt-4 text-center text-xs text-[var(--taj-text-muted)] sm:text-left">
          © {year} {m(locale, "footer.rights")}
        </p>
      </div>
    </footer>
  );
}
