import Image from "next/image";
import Link from "next/link";
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
    <footer className="mt-auto border-t border-emerald-900/40 bg-[#041a12]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-lg text-brand-100 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              <Image
                src={content.brand.logoMarkUrl}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-xl bg-emerald-950/80 p-1 ring-1 ring-emerald-700/50"
                unoptimized
              />
              <span className="brand-wordmark text-sm font-bold sm:text-base">{content.brand.siteName}</span>
            </Link>
          </div>

          <nav className="footer-trust-grid text-sm" aria-label="Footer">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-emerald-100/75 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#041a12]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-5 border-t border-white/8 pt-4 text-center text-xs text-emerald-200/60 sm:text-left">
          © {year} {m(locale, "footer.rights")}
        </p>
      </div>
    </footer>
  );
}
