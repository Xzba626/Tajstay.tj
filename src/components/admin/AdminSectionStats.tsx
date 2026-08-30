import type { ReactNode } from "react";

type Stat = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "accent" | "warning" | "danger" | "info";
};

type Props = {
  stats: Stat[];
};

export function AdminSectionStats({ stats }: Props) {
  if (!stats.length) return null;
  return (
    <div className="admin-section-stats">
      {stats.map((stat) => (
        <div key={stat.label} className={`admin-section-stats__item admin-section-stats__item--${stat.tone ?? "default"}`}>
          <div className="admin-section-stats__label">{stat.label}</div>
          <div className="admin-section-stats__value">{stat.value}</div>
          {stat.hint ? <div className="admin-section-stats__hint">{stat.hint}</div> : null}
        </div>
      ))}
    </div>
  );
}
