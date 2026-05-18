export default function RootLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="skeleton h-12 w-1/2 rounded-2xl" />
      <div className="glass-panel rounded-3xl p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="skeleton h-10 rounded-xl" />
          <div className="skeleton h-10 rounded-xl" />
          <div className="skeleton h-10 rounded-xl" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-panel rounded-3xl p-5">
            <div className="skeleton h-48 rounded-2xl" />
            <div className="mt-4 space-y-3">
              <div className="skeleton h-5 w-2/3 rounded-lg" />
              <div className="skeleton h-4 w-full rounded-lg" />
              <div className="skeleton h-10 w-1/2 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
