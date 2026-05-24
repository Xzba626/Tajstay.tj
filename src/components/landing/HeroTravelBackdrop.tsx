/** Lightweight Tajik mountains + valley — emerald only, no blue/indigo */
export function HeroTravelBackdrop({ className }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[1.5rem] ${className ?? ""}`} aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, #083528 0%, #06281f 48%, #031b15 100%)"
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-[58%] opacity-90"
        style={{
          background: "linear-gradient(to top, rgba(15, 75, 52, 0.85) 0%, transparent 100%)",
          clipPath: "polygon(0 45%, 10% 32%, 22% 40%, 36% 26%, 50% 38%, 64% 22%, 78% 34%, 92% 24%, 100% 30%, 100% 100%, 0 100%)"
        }}
      />
      <div
        className="absolute bottom-[22%] left-[14%] h-2 w-2 rounded-full bg-[var(--taj-sand-400)] opacity-80 shadow-[0_0_12px_rgba(212,184,122,0.5)]"
        title=""
      />
      <div className="absolute bottom-[28%] right-[20%] h-1.5 w-1.5 rounded-full bg-[var(--taj-sand-400)] opacity-70" />
      <div className="absolute left-[8%] top-[20%] h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="absolute right-[10%] top-[15%] h-24 w-24 rounded-full bg-emerald-400/8 blur-3xl" />
    </div>
  );
}
