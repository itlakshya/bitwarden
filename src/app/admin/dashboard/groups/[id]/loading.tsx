export default function GroupDetailLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[50vh] p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-purple-600" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-600">Loading group...</p>
        <div className="flex gap-2">
          <div className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
