'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRecaptcha } from '@/lib/recaptcha';
import { APP_NAME_PARTS } from '@/lib/branding';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { executeRecaptchaAction } = useRecaptcha();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      // Execute reCAPTCHA verification
      const recaptchaToken = await executeRecaptchaAction('forgot_password');
      
      const response = await axios.post('/api/auth/forgot-password', { 
        email,
        recaptchaToken 
      });
      setMessage(response.data.message);
    } catch (error: any) {
      setError(error.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white via-slate-50/70 to-white text-slate-900 p-4">
      <div className="mb-8 flex flex-col items-center">
        <Link href="/" className="text-3xl font-bold tracking-tighter">
          <span className="text-slate-900">{APP_NAME_PARTS.primary}</span>{" "}
          <span className="bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent">
            {APP_NAME_PARTS.accent}
          </span>
        </Link>
        <p className="mt-2 text-sm text-slate-600">Reset your password</p>
      </div>

      <div className="w-full max-w-[420px] space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">Forgot Password</h1>
          <p className="text-sm text-slate-600">
            Enter your email to receive a password reset link
          </p>
        </div>
        
        {message && (
          <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-500 text-center">
            {message}
          </div>
        )}
        
        {error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500 text-center">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium leading-none text-slate-900">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder='name@example.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-yellow-500/40 transition-all disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          <div className="text-center text-xs text-slate-500 pt-2">
            <div className="flex items-center justify-center space-x-1">
              <svg className="h-4 w-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Protected by Google reCAPTCHA</span>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md text-sm font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-[#09090b] hover:opacity-90 transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)] h-10 px-4 py-2 w-full mt-2"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        
        <div className="text-center text-sm text-slate-600">
          Remember your password?{' '}
          <Link href="/auth/signin" className="text-slate-900 hover:text-yellow-600 transition-colors hover:underline underline-offset-4">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
