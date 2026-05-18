import Image from "next/image";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { getSiteContent } from "@/lib/site-content";

export async function Footer() {
  const locale = getLocale();
  const content = await getSiteContent();

  return (
    <footer className="mt-auto border-t border-brand-500/70 bg-brand-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-brand-200 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg text-brand-100 transition hover:text-white"
          >
            <Image
              src={content.brand.logoMarkUrl}
              alt=""
              width={44}
              height={44}
              className="h-9 w-9 rounded-xl bg-brand-800 p-1 ring-1 ring-brand-500/70 transition-transform duration-300 hover:scale-105"
              unoptimized
            />
            <span className="hidden font-semibold sm:inline brand-wordmark">{content.brand.siteName}</span>
          </Link>
          <span className="hidden sm:inline">·</span>
          <span>
            © {new Date().getFullYear()} {m(locale, "footer.rights")}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/about" className="text-brand-200 transition hover:text-white hover:underline">
            {m(locale, "footer.about")}
          </Link>
          <Link href="/contacts" className="text-brand-200 transition hover:text-white hover:underline">
            {m(locale, "footer.contacts")}
          </Link>
          <Link href="/policy" className="text-brand-200 transition hover:text-white hover:underline">
            {m(locale, "footer.policy")}
          </Link>
          <Link href="/terms" className="text-brand-200 transition hover:text-white hover:underline">
            {m(locale, "footer.terms")}
          </Link>
          <Link href="/faq" className="text-brand-200 transition hover:text-white hover:underline">
            {m(locale, "footer.faq")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
