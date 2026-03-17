export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Basic layout for admin routes - authentication is handled per page
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}