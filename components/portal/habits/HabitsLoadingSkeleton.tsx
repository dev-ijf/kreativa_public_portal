function Bone({ className }: { className?: string }) {
  return (
    <div
      className={["animate-pulse rounded-xl bg-slate-200/80", className].filter(Boolean).join(" ")}
    />
  );
}

/** Daily Reports — day tab content skeleton (right of calendar). */
export function DailyReportsDaySkeleton() {
  return (
    <div className="space-y-4 md:columns-2 md:gap-4 md:space-y-0" aria-busy="true" aria-live="polite">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden break-inside-avoid md:mb-4 md:inline-block md:w-full"
        >
          <Bone className="h-11 w-full rounded-none" />
          <div className="p-4 space-y-3">
            <Bone className="h-3 w-24" />
            <Bone className="h-10 w-full rounded-2xl" />
            <Bone className="h-10 w-full rounded-2xl" />
            <Bone className="h-8 w-2/3 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Daily Reports — summary tab content skeleton (right of calendar). */
export function DailyReportsSummarySkeleton() {
  return (
    <div className="space-y-4 md:columns-2 md:gap-4 md:space-y-0" aria-busy="true" aria-live="polite">
      <div className="break-inside-avoid md:mb-4 md:inline-block md:w-full space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-2"
          >
            <Bone className="h-3 w-20 mx-auto" />
            <Bone className="h-8 w-12 mx-auto" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 break-inside-avoid md:mb-4 md:inline-block md:w-full space-y-4">
        <Bone className="h-5 w-40" />
        <Bone className="h-3 w-full" />
        <Bone className="h-2 w-full rounded-full" />
        <Bone className="h-3 w-3/4" />
        <Bone className="h-2 w-3/4 rounded-full" />
      </div>
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 break-inside-avoid md:mb-4 md:inline-block md:w-full space-y-3">
        <Bone className="h-5 w-36" />
        <Bone className="h-8 w-full rounded-2xl" />
        <Bone className="h-8 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** Right-column skeleton for Secondary Daily habits form. */
export function SecondaryDailyFormSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3"
          >
            <Bone className="h-4 w-28" />
            <Bone className="h-12 w-full rounded-2xl" />
            <Bone className="h-12 w-full rounded-2xl" />
            <Bone className="h-12 w-full rounded-2xl" />
          </div>
        ))}
      </div>
      <Bone className="h-12 w-full rounded-2xl md:hidden" />
    </div>
  );
}

/** Right-column skeleton for Secondary Weekly panel (header, sub-tabs, content, actions). */
export function SecondaryWeeklyPanelSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="space-y-1">
        <Bone className="h-6 w-56" />
        <Bone className="h-3 w-40" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Bone className="h-9 w-[4.5rem] rounded-full" />
        <Bone className="h-9 w-[5.5rem] rounded-full" />
        <Bone className="h-9 w-24 rounded-full" />
        <Bone className="h-9 w-16 rounded-full" />
      </div>

      <div className="bg-primary/10 rounded-3xl p-5 space-y-3">
        <Bone className="h-4 w-40 bg-primary/20" />
        <div className="grid grid-cols-2 gap-3">
          <Bone className="h-14 rounded-2xl bg-primary/15" />
          <Bone className="h-14 rounded-2xl bg-primary/15" />
          <Bone className="h-14 rounded-2xl bg-primary/15" />
          <Bone className="h-14 rounded-2xl bg-primary/15" />
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
        <Bone className="h-5 w-64 max-w-full" />
        <Bone className="h-10 w-full" />
        <Bone className="h-10 w-36" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Bone className="h-12 rounded-2xl" />
        <Bone className="h-12 rounded-2xl" />
      </div>
    </div>
  );
}
