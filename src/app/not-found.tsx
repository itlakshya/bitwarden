'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftIcon, HomeIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 text-red-600 mb-2">
          <span className="text-2xl font-bold">404</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          Page not found
        </h1>
        <p className="text-sm text-slate-600">
          The page you are looking for doesn&apos;t exist or may have been moved.
        </p>
        {pathname && (
          <p className="text-xs text-slate-400 break-all">
            Requested path: <span className="font-mono">{pathname}</span>
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <HomeIcon className="h-4 w-4 mr-2" />
            Go to home
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}

