type TrustItem = { id: string; label: string };

export function AuthTrustStrip({
  items,
  className = ""
}: {
  items: TrustItem[];
  className?: string;
}) {
  return (
    <div className={`auth-trust-strip ${className}`.trim()} role="list">
      {items.map((item) => (
        <div key={item.id} className="auth-trust-item" role="listitem">
          <CheckShieldIcon />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function CheckShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3 4 7v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
