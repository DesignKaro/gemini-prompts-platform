export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-40 rounded-full bg-white/70" />
          <div className="mt-2 h-4 w-64 rounded-full bg-white/60" />
        </div>
        <div className="h-9 w-28 rounded-full bg-white/70" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`dashboard-loading-card-${index}`}
            className="rounded-xl border border-[#eef2f6] bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
          >
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-gray-100" />
              <div className="h-4 w-16 rounded-full bg-gray-100" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 w-24 rounded-full bg-gray-100" />
              <div className="h-6 w-20 rounded-full bg-gray-100" />
              <div className="h-2 w-16 rounded-full bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
