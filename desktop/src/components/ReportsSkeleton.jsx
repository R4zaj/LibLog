export default function ReportsSkeleton() {
  return (
    <div className="flex flex-col h-full bg-[#f4f5f8] dark:bg-dark-bg overflow-y-auto animate-fade-in relative">
      <div className="max-w-[1400px] w-full mx-auto px-8 py-8 flex flex-col gap-6">
        
        {/* Header Skeleton */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="h-7 w-60 rounded-lg bg-gray-200 dark:bg-dark-border animate-pulse" />
            <div className="h-4 w-80 rounded-md bg-gray-200/70 dark:bg-dark-border/60 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-20 rounded-md bg-gray-200 dark:bg-dark-border animate-pulse" />
            <div className="h-8 w-28 rounded-md bg-gray-200 dark:bg-dark-border animate-pulse" />
            <div className="h-8 w-24 rounded-md bg-gray-200 dark:bg-dark-border animate-pulse" />
          </div>
        </div>

        {/* Filter Panel Skeleton */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6">
          <div className="flex flex-col gap-6">
            
            {/* Quick Select Skeleton */}
            <div className="flex flex-col gap-2">
              <div className="h-3 w-20 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
              <div className="h-9 w-full max-w-4xl rounded-lg bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-dark-border animate-pulse" />
            </div>

            {/* Report Modules Skeleton */}
            <div className="flex flex-col gap-2">
              <div className="h-3 w-24 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
              <div className="h-9 w-full max-w-4xl rounded-lg bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-dark-border animate-pulse" />
            </div>

            {/* Inputs & Generate Button Row Skeleton */}
            <div className="flex items-end gap-6 flex-wrap">
              <div className="flex flex-col gap-2">
                <div className="h-3 w-14 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
                <div className="h-9 w-64 rounded-lg bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-dark-border animate-pulse" />
              </div>

              <div className="flex flex-col gap-2">
                <div className="h-3 w-16 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
                <div className="h-9 w-40 rounded-lg bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-dark-border animate-pulse" />
              </div>

              <div className="flex flex-col gap-2">
                <div className="h-3 w-16 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
                <div className="h-9 w-40 rounded-lg bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-dark-border animate-pulse" />
              </div>

              <div className="flex flex-col gap-2">
                <div className="h-3 w-20 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
                <div className="h-9 w-40 rounded-lg bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-dark-border animate-pulse" />
              </div>

              <div className="flex flex-col gap-2">
                <div className="h-3 w-20 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
                <div className="h-9 w-48 rounded-lg bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-dark-border animate-pulse" />
              </div>

              <div className="h-9 w-36 rounded-lg bg-purple-200 dark:bg-purple-900/40 animate-pulse ml-2" />
            </div>

            {/* Timestamp Footer Skeleton */}
            <div className="h-3 w-96 rounded bg-gray-100 dark:bg-dark-bg animate-pulse pt-2" />
          </div>
        </div>

        {/* Top 5 Summary Cards Skeleton */}
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((card) => (
            <div 
              key={card} 
              className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-5 flex flex-col relative overflow-hidden"
            >
              <div className="h-3 w-20 rounded bg-gray-200 dark:bg-dark-border animate-pulse mb-3" />
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-bg animate-pulse" />
              <div className="h-8 w-24 rounded-md bg-gray-200 dark:bg-dark-border animate-pulse mt-1" />
              <div className="h-3 w-28 rounded bg-gray-100 dark:bg-dark-bg animate-pulse mt-3" />
              <div className="h-3 w-20 rounded bg-gray-100 dark:bg-dark-bg animate-pulse mt-3" />
            </div>
          ))}
        </div>

        {/* Book Metrics Section Header Skeleton */}
        <div className="flex items-center gap-4 mt-2 mb-2">
          <div className="w-1 h-8 rounded-full bg-purple-300 dark:bg-purple-900/50 animate-pulse" />
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 animate-pulse" />
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-28 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
            <div className="h-3 w-48 rounded bg-gray-100 dark:bg-dark-bg animate-pulse" />
          </div>
        </div>

        {/* Book Metrics Cards Skeleton */}
        <div className="grid grid-cols-12 gap-6 mb-2">
          
          {/* Table 1: Most Borrowed Books */}
          <div className="col-span-4 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col">
            <div className="flex flex-col gap-1.5 mb-6">
              <div className="h-4 w-36 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
              <div className="h-3 w-44 rounded bg-gray-100 dark:bg-dark-bg animate-pulse" />
            </div>
            
            <div className="flex flex-col divide-y divide-gray-50 dark:divide-dark-border">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="py-3 flex items-center justify-between gap-3">
                  <div className="h-3 w-4 rounded bg-gray-100 dark:bg-dark-bg animate-pulse" />
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="h-3 w-28 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
                    <div className="h-2.5 w-20 rounded bg-gray-100 dark:bg-dark-bg animate-pulse" />
                  </div>
                  <div className="h-5 w-6 rounded bg-purple-100 dark:bg-purple-900/40 animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Table 2: Least Borrowed Books */}
          <div className="col-span-4 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col">
            <div className="flex flex-col gap-1.5 mb-6">
              <div className="h-4 w-36 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
              <div className="h-3 w-44 rounded bg-gray-100 dark:bg-dark-bg animate-pulse" />
            </div>
            
            <div className="flex flex-col divide-y divide-gray-50 dark:divide-dark-border">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="py-3 flex items-center justify-between gap-3">
                  <div className="h-3 w-4 rounded bg-gray-100 dark:bg-dark-bg animate-pulse" />
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="h-3 w-28 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
                    <div className="h-2.5 w-20 rounded bg-gray-100 dark:bg-dark-bg animate-pulse" />
                  </div>
                  <div className="h-5 w-6 rounded bg-cyan-100 dark:bg-cyan-900/40 animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Chart Placeholder: Genre Distribution */}
          <div className="col-span-4 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-32 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
                <div className="h-3 w-40 rounded bg-gray-100 dark:bg-dark-bg animate-pulse" />
              </div>
              <div className="h-6 w-24 rounded-full bg-gray-100 dark:bg-dark-bg animate-pulse" />
            </div>

            {/* Simulated Animated Bar Columns */}
            <div className="flex-1 w-full min-h-[220px] flex items-end justify-between gap-3 px-4 pb-4">
              <div className="flex-1 bg-purple-100 dark:bg-purple-900/30 rounded-t h-32 animate-pulse" />
              <div className="flex-1 bg-purple-200 dark:bg-purple-900/50 rounded-t h-48 animate-pulse" />
              <div className="flex-1 bg-purple-150 dark:bg-purple-900/40 rounded-t h-24 animate-pulse" />
              <div className="flex-1 bg-purple-200 dark:bg-purple-900/50 rounded-t h-40 animate-pulse" />
              <div className="flex-1 bg-purple-100 dark:bg-purple-900/30 rounded-t h-16 animate-pulse" />
            </div>
          </div>
        </div>

        {/* User Metrics Section Header Skeleton */}
        <div className="flex items-center gap-4 mt-2 mb-2">
          <div className="w-1 h-8 rounded-full bg-cyan-400 dark:bg-cyan-800 animate-pulse" />
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 animate-pulse" />
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-28 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
            <div className="h-3 w-44 rounded bg-gray-100 dark:bg-dark-bg animate-pulse" />
          </div>
        </div>

        {/* User Metrics Section Skeleton */}
        <div className="grid grid-cols-2 gap-6 mb-2">
          {/* Most Active Students */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col">
            <div className="flex flex-col gap-1.5 mb-6">
              <div className="h-4 w-36 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
              <div className="h-3 w-44 rounded bg-gray-100 dark:bg-dark-bg animate-pulse" />
            </div>
            
            <div className="flex flex-col divide-y divide-gray-50 dark:divide-dark-border">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="py-3 flex items-center justify-between gap-4">
                  <div className="h-3 w-4 rounded bg-gray-100 dark:bg-dark-bg animate-pulse" />
                  <div className="h-3 w-32 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
                  <div className="h-3 w-20 rounded bg-gray-100 dark:bg-dark-bg animate-pulse" />
                  <div className="h-5 w-8 rounded bg-cyan-100 dark:bg-cyan-900/40 animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Library Visits by Program (Donut Skeleton) */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-40 rounded bg-gray-200 dark:bg-dark-border animate-pulse" />
                <div className="h-3 w-52 rounded bg-gray-100 dark:bg-dark-bg animate-pulse" />
              </div>
              <div className="h-6 w-16 rounded-full bg-gray-100 dark:bg-dark-bg animate-pulse" />
            </div>

            <div className="flex-1 w-full min-h-[220px] flex items-center justify-center">
              <div className="w-36 h-36 rounded-full border-[18px] border-purple-100 dark:border-purple-900/30 border-t-purple-300 dark:border-t-purple-600 animate-pulse" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
