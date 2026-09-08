export default function DashboardLoading() {
  return (
    <div className="p-6 md:p-8 space-y-8 animate-pulse w-full max-w-[1400px] mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-3 w-full sm:w-1/3">
          <div className="h-8 bg-nexus-border/50 rounded-lg w-3/4"></div>
          <div className="h-4 bg-nexus-border/30 rounded-lg w-1/2"></div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="h-10 w-24 bg-nexus-border/40 rounded-lg"></div>
          <div className="h-10 w-32 bg-nexus-primary/20 rounded-lg"></div>
        </div>
      </div>

      {/* Stats/Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-nexus-card border border-nexus-border/50 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-nexus-border/40"></div>
              <div className="w-16 h-5 rounded-full bg-nexus-border/30"></div>
            </div>
            <div className="space-y-2 mt-4">
              <div className="h-8 w-1/2 bg-nexus-border/50 rounded-lg"></div>
              <div className="h-4 w-3/4 bg-nexus-border/30 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="bg-nexus-card border border-nexus-border/50 rounded-xl min-h-[400px] p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-48 bg-nexus-border/40 rounded-lg"></div>
          <div className="h-8 w-64 bg-nexus-border/40 rounded-lg"></div>
        </div>
        
        {/* Table Rows */}
        <div className="space-y-4">
          <div className="h-10 w-full bg-nexus-border/50 rounded-lg"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 items-center">
              <div className="h-12 w-full bg-nexus-border/20 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
