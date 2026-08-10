import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { getSiteContent } from "@/lib/site-content";
import { TajikPattern } from "@/components/ds/TajikPattern";

export async function Footer() {
  const locale = getLocale();
  const content = await getSiteContent();
  const year = new Date().getFullYear();

  const links = [
    { href: "/about", label: m(locale, "footer.about") },
    { href: "/contacts", label: m(locale, "footer.contacts") },
    { href: "/policy", label: m(locale, "footer.policy") },
    { href: "/terms", label: m(locale, "footer.terms") }
  ];

  return (
    <footer className="site-footer mt-auto" data-heritage-motif="main">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <TajikPattern kind="divider" className="heritage-section-motif" />
        <div className="footer-brand-row">
          <BrandMark
            href="/"
            name={content.brand.siteName}
            markSrc={content.brand.logoMarkUrl}
            nameClassName="text-sm sm:text-base"
          />
        </div>

        <nav className="footer-trust-links mt-4 text-sm sm:mt-5" aria-label="Footer">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-0.5 text-[var(--taj-text-secondary)] transition hover:text-[var(--taj-text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--taj-lake)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--taj-bg)] sm:inline-block sm:py-0 [&:not(:last-child)]:sm:mr-6"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="footer-copyright mt-4 border-t border-[var(--color-border)] pt-4 text-center text-xs text-[var(--taj-text-muted)] sm:text-left">
          © {year} {content.brand.siteName}. {m(locale, "footer.rights")}
        </p>
      </div>
    </footer>
  );
}
