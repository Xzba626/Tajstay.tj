type Props = {
  size?: number;
  thinking?: boolean;
  className?: string;
};

/** Minimal TST brand mark: circle + T + eyes. */
export function TstIcon({ size = 24, thinking = false, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" opacity="0.85" />
      <path
        d="M11 10.5h10M16 10.5V21"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12.5" cy="14" r="1.1" fill="currentColor" className={thinking ? "tst-icon-eye" : undefined} />
      <circle cx="19.5" cy="14" r="1.1" fill="currentColor" className={thinking ? "tst-icon-eye tst-icon-eye--delay" : undefined} />
      {thinking ? (
        <path
          d="M10 24.5c2.2-1.4 4.5-1.4 6 0s3.8 1.4 6 0"
          stroke="#6ee7b7"
          strokeWidth="1.2"
          strokeLinecap="round"
          className="tst-icon-pulse"
        />
      ) : (
        <path d="M11 24.5h10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
      )}
    </svg>
  );
}
