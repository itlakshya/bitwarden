'use client';

import { useState, useEffect } from 'react';
import { signIn, getSession, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRecaptcha } from '@/lib/recaptcha';
import { APP_NAME_PARTS } from '@/lib/branding';
import { ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function AdminLogin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { executeRecaptchaAction } = useRecaptcha();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (session?.user) {
      // Only allow admin roles to access admin dashboard
      if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'DEPT_ADMIN' || session.user.role === 'SUPERVISOR') {
        router.push('/admin/dashboard');
      } else {
        // Block regular users from admin login
        setError('Access denied. Admin privileges required.');
        return;
      }
    }
  }, [session, status, router]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white relative overflow-hidden">
        {/* Dynamic Background Effects */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-blue-100 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 animate-pulse"></div>
        </div>
        <div className="animate-pulse text-center relative z-10">
          <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4 border border-blue-200"></div>
          <div className="h-4 bg-slate-200 rounded w-32 mx-auto border border-slate-100"></div>
        </div>
      </div>
    );
  }

  // Don't render login form if user is authenticated
  if (session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-blue-100 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 animate-pulse"></div>
        </div>
        <div className="text-center relative z-10">
          <p className="text-slate-600 font-medium tracking-wide">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    // Execute reCAPTCHA verification
    let recaptchaToken: string;
    try {
      recaptchaToken = await executeRecaptchaAction('admin_login');
    } catch (error) {
      setError('Security verification failed. Please try again.');
      setLoading(false);
      return;
    }

    // Validate admin email domain
    if (!email.toLowerCase().endsWith('@iiclakshya.com')) {
      setError('Admin access requires @iiclakshya.com email address');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
    const result = await signIn('credentials', {
      email,
      password,
      recaptchaToken,
      loginSource: 'admin',
      redirect: false,
    });
      
      if (result?.error) {
        if (result.error === 'CredentialsSignin') {
          setError('Invalid email or password');
        } else {
          setError(result.error);
        }
        return;
      }
      
      // Check if user has admin privileges
      const session = await getSession();
      if (!session?.user) {
        setError('Authentication failed');
        return;
      }
      
      // Verify admin role
      if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'DEPT_ADMIN' && session.user.role !== 'SUPERVISOR') {
        setError('Access denied: Admin privileges required');
        return;
      }
      
      // Redirect to admin dashboard
      router.push('/admin/dashboard');
    } catch (error: any) {
      console.error('Admin login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white relative overflow-hidden text-slate-900 p-4 sm:p-8">
      {/* Dynamic Background Effects for White Theme */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-100 rounded-full mix-blend-multiply filter blur-[120px] opacity-60 animate-pulse transition-all duration-1000"></div>
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-yellow-100 rounded-full mix-blend-multiply filter blur-[150px] opacity-50 animate-pulse transition-all duration-1000" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] bg-blue-50 rounded-full mix-blend-multiply filter blur-[150px] opacity-70"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-blue-50/20 to-white/60 backdrop-blur-[1px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row rounded-3xl border border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(37,99,235,0.05)] overflow-hidden">
        
        {/* Left Column - Branding */}
        <div className="w-full md:w-5/12 p-10 md:p-12 hidden md:flex flex-col justify-between bg-gradient-to-br from-slate-50 to-blue-50/40 border-r border-slate-200/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
          
          <div className="relative z-10">
            <Link href="/">
              <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain drop-shadow-sm mb-12 hover:scale-105 transition-transform duration-300 origin-left" />
            </Link>
            
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm leading-tight">
                <div className="flex items-baseline">
                  <span className="text-blue-950">{APP_NAME_PARTS.primary}</span>
                  <span className="bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(245,158,11,0.1)] ml-2">
                    {APP_NAME_PARTS.accent}
                  </span>
                </div>
                <div className="flex items-center space-x-3 mt-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex flex-shrink-0 items-center justify-center shadow-sm border border-slate-100 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                    <ShieldCheckIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-2xl text-slate-700 font-bold">Admin Portal</span>
                </div>
              </h2>
              <p className="text-base text-slate-600 font-medium leading-relaxed max-w-sm">
                Secure access to administrative tools, department management, and system-wide settings.
              </p>
            </div>
          </div>
          
          <div className="relative z-10 mt-12 pt-8 border-t border-slate-200/60">
            <div className="flex items-center space-x-3 text-sm text-slate-500 font-medium">
              <ShieldCheckIcon className="h-5 w-5 text-emerald-500" />
              <span>Enterprise-grade security controls</span>
            </div>
          </div>
        </div>

        {/* Right Column - Form */}
        <div className="w-full md:w-7/12 p-8 sm:p-10 md:p-14 flex flex-col justify-center bg-white relative">
          <div className="md:hidden mb-10 flex flex-col items-center text-center">
            <Link href="/">
              <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain drop-shadow-sm mb-6" />
            </Link>
          </div>
          
          <div className="space-y-3 mb-8">
            <div className="flex items-center space-x-3 md:hidden justify-center mb-2">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shadow-sm border border-blue-100">
                <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 md:text-left text-center">
              Welcome Back
            </h1>
            <p className="text-sm text-slate-500 md:text-left text-center">
              Sign in to your administrative account to continue
            </p>
          </div>
          
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200/60 p-4 text-sm text-red-600 font-medium text-center md:text-left shadow-sm animate-in fade-in slide-in-from-top-2 flex items-start space-x-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold leading-none text-slate-700 ml-1">
                Admin Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="admin@iiclakshya.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:border-blue-500 transition-all disabled:cursor-not-allowed disabled:opacity-50 shadow-sm hover:border-slate-400"
                required
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label htmlFor="password" className="text-sm font-semibold leading-none text-slate-700">
                  Password
                </label>
                <Link href="/auth/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:border-blue-500 transition-all disabled:cursor-not-allowed disabled:opacity-50 shadow-sm hover:border-slate-400"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="group relative inline-flex items-center justify-center rounded-xl text-sm font-bold text-white overflow-hidden h-12 w-full mt-2 shadow-[0_8px_25px_rgba(37,99,235,0.25)] hover:shadow-[0_15px_35px_rgba(37,99,235,0.4)] transition-all duration-300 transform hover:-translate-y-1 ring-1 ring-blue-600/50 hover:ring-blue-500/70 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-blue-700 transition-opacity duration-300 group-hover:opacity-0"></span>
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out"></span>
              <span className="relative z-10 flex items-center gap-2">
                {loading ? 'Authenticating...' : 'Sign In Now'}
                {!loading && (
                  <svg className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </span>
            </button>
          </form>
          
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
            <div className="flex items-center space-x-1 border border-slate-200/50 bg-slate-50 rounded-full py-1.5 px-3">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-[10px] md:text-xs text-slate-500 font-medium">Protected by reCAPTCHA</span>
            </div>
            
            <div className="text-[11px] md:text-xs text-slate-500 font-medium">
              Not an admin?{' '}
              <Link href="/auth/signin" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors border-b border-transparent hover:border-blue-600">
                User Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}