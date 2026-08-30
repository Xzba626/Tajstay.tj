import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
};

export function AdminSectionHead({ title, subtitle, meta }: Props) {
  return (
    <div className="admin-section-head-block">
      <div className="admin-section-head">
        <span className="admin-section-head__bar" aria-hidden />
        <div className="admin-section-head__text">
          <h2 className="admin-section-head__title">{title}</h2>
          {subtitle ? <p className="admin-section-head__subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {meta ? <div className="admin-section-head__meta">{meta}</div> : null}
    </div>
  );
}
