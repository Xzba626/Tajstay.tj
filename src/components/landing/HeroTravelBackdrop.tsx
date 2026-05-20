/** CSS mountain + lodge backdrop for Tajstay hero (lightweight travel visual). */
export function HeroTravelBackdrop({ className }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem] ${className ?? ""}`} aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-indigo-950/80 to-emerald-950/90" />
      <div
        className="absolute bottom-0 left-0 right-0 h-[55%] bg-gradient-to-t from-emerald-900/90 via-teal-900/40 to-transparent"
        style={{ clipPath: "polygon(0 40%, 12% 28%, 28% 38%, 42% 22%, 58% 35%, 72% 18%, 88% 32%, 100% 24%, 100% 100%, 0 100%)" }}
      />
      <div className="absolute bottom-[18%] left-[12%] h-10 w-14 rounded-t-lg bg-amber-300/90 shadow-[0_0_24px_rgba(251,191,36,0.5)]" />
      <div className="absolute bottom-[22%] left-[14%] h-8 w-10 rounded-sm bg-amber-200/80" />
      <div className="absolute bottom-[16%] right-[18%] h-9 w-12 rounded-t-md bg-amber-300/70" />
      <div className="absolute bottom-[20%] right-[20%] h-6 w-8 rounded-sm bg-amber-100/60" />
      <svg className="absolute bottom-[28%] left-[8%] right-[8%] h-16 w-[84%] opacity-40" viewBox="0 0 400 40">
        <path
          d="M20 30 Q80 10 140 28 T260 22 T380 30"
          fill="none"
          stroke="url(#route)"
          strokeWidth="2"
          strokeDasharray="6 8"
        />
        <defs>
          <linearGradient id="route" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute left-[10%] top-[18%] h-24 w-24 rounded-full bg-cyan-400/10 blur-2xl" />
      <div className="absolute right-[8%] top-[12%] h-32 w-32 rounded-full bg-amber-300/10 blur-3xl" />
    </div>
  );
}
