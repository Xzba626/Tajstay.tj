export default function HotelLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="skeleton h-80 rounded-2xl lg:col-span-2" />
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--taj-line)] bg-[var(--taj-snow)] p-5">
            <div className="skeleton h-8 w-3/4 rounded-lg" />
            <div className="mt-3 skeleton h-4 w-full rounded-lg" />
            <div className="mt-2 skeleton h-4 w-2/3 rounded-lg" />
          </div>
          <div className="rounded-2xl border border-[var(--taj-line)] bg-[var(--taj-snow)] p-5">
            <div className="skeleton h-6 w-1/2 rounded-lg" />
            <div className="mt-4 skeleton h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="skeleton h-7 w-40 rounded-lg" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-xl border border-[var(--taj-line)] bg-[var(--taj-snow)] p-4 sm:flex-row"
          >
            <div className="skeleton h-40 w-full rounded-xl sm:max-w-xs" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="skeleton h-5 w-1/2 rounded-lg" />
              <div className="skeleton h-4 w-full rounded-lg" />
              <div className="skeleton h-10 w-32 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
