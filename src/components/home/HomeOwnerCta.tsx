import Link from "next/link";

type Props = {
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  eyebrow?: string;
  trustPoints?: string[];
};

export function HomeOwnerCta({ title, description, primaryLabel, secondaryLabel, eyebrow = "TajStay Partner", trustPoints }: Props) {
  return (
    <div className="home-owner-cta">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="home-section__eyebrow">{eyebrow}</p>
          <h2 className="mt-2 font-[family-name:var(--taj-font-ui)] text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-emerald-100/85 sm:text-base">{description}</p>
          {trustPoints?.length ? (
            <ul className="home-owner-cta__trust mt-5">
              {trustPoints.map((point) => (
                <li key={point}>
                  <span aria-hidden>✓</span> {point}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
          <Link href="/profile/become-owner" className="taj-btn taj-btn--primary taj-btn--lg taj-btn--full">
            {primaryLabel}
          </Link>
          <Link href="/dashboard/owner" className="taj-btn taj-btn--secondary taj-btn--lg taj-btn--full">
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
