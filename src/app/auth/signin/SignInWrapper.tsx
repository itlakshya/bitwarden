'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignInWrapper({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (session?.user) {
      // Redirect authenticated users to appropriate dashboard
      if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'DEPT_ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [session, status, router]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Don't render signin form if user is authenticated
  if (session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}