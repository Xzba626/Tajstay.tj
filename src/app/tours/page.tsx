import type { Metadata } from "next";
import { Compass, Mountain, Landmark, Waves, Trees, Map } from "lucide-react";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { PageContainer } from "@/components/ds";

export async function generateMetadata(): Promise<Metadata> {
  const locale = getLocale();
  return {
    title: `${m(locale, "toursPage.title")} — TajStay`,
    description: m(locale, "toursPage.subtitle")
  };
}

const CATEGORIES = [
  { icon: Mountain, key: "mountains" as const },
  { icon: Trees, key: "nature" as const },
  { icon: Landmark, key: "history" as const },
  { icon: Map, key: "city" as const },
  { icon: Waves, key: "lakes" as const },
  { icon: Compass, key: "culture" as const }
];

export default function ToursPage() {
  const locale = getLocale();

  return (
    <PageContainer width="narrow" className="mockup-screen pb-10">
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--green-accent)]">
          <Compass size={20} aria-hidden />
        </span>
        <div>
          <h1 className="mockup-screen__title !mb-1">{m(locale, "toursPage.title")}</h1>
          <p className="mockup-screen__subtitle !mt-0">{m(locale, "toursPage.subtitle")}</p>
        </div>
      </div>

      <section className="space-y-2" aria-label={m(locale, "toursPage.categoriesTitle")}>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)]">{m(locale, "toursPage.categoriesTitle")}</h2>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-3"
            >
              <Icon size={18} className="text-[var(--green-accent)]" aria-hidden />
              <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                {m(locale, `toursPage.categories.${key}`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{m(locale, "toursPage.comingTitle")}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">{m(locale, "toursPage.comingText")}</p>
      </section>
    </PageContainer>
  );
}
