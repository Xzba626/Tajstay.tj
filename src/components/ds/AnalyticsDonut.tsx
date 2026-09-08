"use client";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "gold";

export type AnalyticsSegment = {
  value: number;
  tone: Tone;
  label: string;
};

type Props = {
  segments: AnalyticsSegment[];
  centerValue: string;
  centerLabel: string;
  ariaLabel: string;
};

const R = 42;
const C = 2 * Math.PI * R;

function toneClass(tone: Tone) {
  return `analytics-donut__seg--${tone}`;
}

export function AnalyticsDonut({ segments, centerValue, centerLabel, ariaLabel }: Props) {
  const visible = segments.filter((segment) => segment.value > 0);
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) {
    return (
      <div className="analytics-donut analytics-donut--empty" role="img" aria-label={ariaLabel}>
        <svg viewBox="0 0 120 120" className="analytics-donut__svg" aria-hidden>
          <circle cx="60" cy="60" r={R} className="analytics-donut__track" />
        </svg>
        <div className="analytics-donut__center">
          <strong>0</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
    );
  }

  let offset = 0;
  const arcs = visible.map((segment) => {
    const frac = segment.value / total;
    const length = frac * C;
    const dashOffset = C - offset;
    offset += length;
    return { ...segment, length, dashOffset, pct: Math.round(frac * 100) };
  });

  return (
    <div className="analytics-visual">
      <div className="analytics-donut" role="img" aria-label={ariaLabel}>
        <svg viewBox="0 0 120 120" className="analytics-donut__svg" aria-hidden>
          <circle cx="60" cy="60" r={R} className="analytics-donut__track" />
          {arcs.map((arc) => (
            <circle
              key={`${arc.tone}-${arc.label}`}
              cx="60"
              cy="60"
              r={R}
              className={`analytics-donut__seg ${toneClass(arc.tone)}`}
              strokeDasharray={`${arc.length} ${C - arc.length}`}
              strokeDashoffset={arc.dashOffset}
            />
          ))}
        </svg>
        <div className="analytics-donut__center">
          <strong>{centerValue}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <ul className="analytics-legend">
        {arcs.map((arc) => (
          <li key={`${arc.tone}-${arc.label}-legend`}>
            <span className={`analytics-legend__dot analytics-legend__dot--${arc.tone}`} aria-hidden />
            <span className="analytics-legend__label">{arc.label}</span>
            <span className="analytics-legend__value">
              {arc.value.toLocaleString()}
              <em>{arc.pct}%</em>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
