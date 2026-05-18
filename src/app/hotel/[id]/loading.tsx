export default function HotelLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="skeleton h-80 rounded-2xl lg:col-span-2" />
        <div className="glass-panel rounded-2xl p-5">
          <div className="space-y-3">
            <div className="skeleton h-7 w-2/3 rounded-lg" />
            <div className="skeleton h-4 w-3/4 rounded-lg" />
            <div className="skeleton h-20 w-full rounded-lg" />
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-panel flex items-center justify-between rounded-xl p-4">
            <div className="space-y-2">
              <div className="skeleton h-5 w-40 rounded-lg" />
              <div className="skeleton h-4 w-20 rounded-lg" />
            </div>
            <div className="skeleton h-10 w-28 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
