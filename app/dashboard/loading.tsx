export default function DashboardLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 animate-pulse" />
        <div className="h-1.5 w-32 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-500 to-accent-500 animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
