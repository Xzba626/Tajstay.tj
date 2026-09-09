"use client";

export function OfflineRetryButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="rounded-xl bg-[#0f7a4d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f7a4d]"
    >
      {label}
    </button>
  );
}
