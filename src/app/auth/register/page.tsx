'use client';

import Link from 'next/link';
import { APP_NAME_PARTS } from '@/lib/branding';
import { ExclamationTriangleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Register() {
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

  // Don't render register form if user is authenticated
  if (session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white via-slate-50/70 to-white text-slate-900 p-4">
      <div className="mb-8 flex flex-col items-center">
        <Link href="/" className="text-3xl font-bold tracking-tighter">
          <span className="text-slate-900">{APP_NAME_PARTS.primary}</span>{" "}
          <span className="bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent">
            {APP_NAME_PARTS.accent}
          </span>
        </Link>
        <p className="mt-2 text-sm text-slate-600">Secure workspace management</p>
      </div>

      <div className="w-full max-w-[420px] space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-amber-600" />
          </div>
          
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Registration Disabled
          </h1>
          
          <p className="text-sm text-slate-600 leading-relaxed">
            Public registration has been disabled for security reasons. 
            Only system administrators can create new accounts.
          </p>
        </div>
        
        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center space-x-3">
            <ShieldCheckIcon className="w-5 h-5 text-slate-600 flex-shrink-0" />
            <div className="text-sm text-slate-700">
              <strong>Email Domain Restriction:</strong> Only @iiclakshya.com addresses are allowed
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <ShieldCheckIcon className="w-5 h-5 text-slate-600 flex-shrink-0" />
            <div className="text-sm text-slate-700">
              <strong>Admin-Only Creation:</strong> Accounts must be created by super administrators
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="text-center text-sm text-slate-600">
            Need an account? Contact your system administrator.
          </div>
          
          <div className="text-center">
            <Link 
              href="/auth/signin" 
              className="inline-flex items-center justify-center rounded-md text-sm font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-[#09090b] hover:opacity-90 transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)] h-10 px-6 py-2"
            >
              Sign In Instead
            </Link>
          </div>
        </div>
        
        <div className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-slate-900 hover:text-yellow-600 transition-colors hover:underline underline-offset-4">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
 
