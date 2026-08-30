type Segment = {
  value: number;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
  label: string;
};

type Props = {
  segments: Segment[];
  className?: string;
  single?: boolean;
};

export function WorkspaceKpiBar({ segments, className, single }: Props) {
  const visible = segments.filter((segment) => segment.value > 0);
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) return null;

  return (
    <div className={className ? `workspace-kpi-visual ${className}` : "workspace-kpi-visual"}>
      <div className={`workspace-kpi-bar${single ? " workspace-kpi-bar--single" : ""}`} role="img" aria-hidden>
        {visible.map((segment) => (
          <span
            key={`${segment.tone}-${segment.label}`}
            className={`workspace-kpi-bar__seg workspace-kpi-bar__seg--${segment.tone}`}
            style={{ flex: segment.value }}
          />
        ))}
      </div>
      <ul className="workspace-kpi-legend">
        {visible.map((segment) => (
          <li key={`${segment.tone}-${segment.label}-legend`}>
            <span className={`workspace-kpi-legend__dot workspace-kpi-legend__dot--${segment.tone}`} aria-hidden />
            {segment.label}: {segment.value.toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
