import Link from "next/link";
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-prisma';
import { redirect } from 'next/navigation';
import { APP_NAME_PARTS } from "@/lib/branding";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  
  // Redirect authenticated users to appropriate dashboard
  if (session?.user) {
    if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'DEPT_ADMIN' || session.user.role === 'SUPERVISOR') {
      redirect('/admin/dashboard');
    } else {
      redirect('/dashboard');
    }
  }
  return (
    <div className="min-h-screen bg-white relative overflow-hidden flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 w-full z-50 p-6 lg:px-12 flex justify-start items-center">
        <img src="/logo.png" alt="Logo" className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm" />
      </header>

      {/* Dynamic Background Effects for White Theme */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-100 rounded-full mix-blend-multiply filter blur-[120px] opacity-60 animate-pulse transition-all duration-1000"></div>
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-yellow-100 rounded-full mix-blend-multiply filter blur-[150px] opacity-50 animate-pulse transition-all duration-1000" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] bg-blue-50 rounded-full mix-blend-multiply filter blur-[150px] opacity-70"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-blue-50/20 to-white/60 backdrop-blur-[1px]"></div>
      </div>

      <main className="max-w-6xl mx-auto px-6 pt-24 pb-8 relative z-10 w-full flex-grow flex flex-col justify-center items-center">
        <div className="text-center flex flex-col items-center max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/50 bg-blue-50/50 backdrop-blur-md px-4 py-2 text-[11px] sm:text-xs font-medium text-blue-800 shadow-[0_0_15px_rgba(239,246,255,0.8)]">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(250,204,21,0.5)] animate-pulse" />
            Secure • Encrypted • Private
          </div>

          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
            <span className="text-blue-950">{APP_NAME_PARTS.primary}</span>{" "}
            <span className="bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(245,158,11,0.15)]">
              {APP_NAME_PARTS.accent}
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed mx-auto font-normal">
            A secure department-based workspace for organizing data with custom fields, groups, and encrypted storage.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signin"
              className="group relative inline-flex items-center justify-center rounded-xl text-sm sm:text-base font-bold text-white overflow-hidden h-12 sm:h-14 px-10 sm:px-12 w-full sm:w-auto shadow-[0_8px_25px_rgba(37,99,235,0.25)] hover:shadow-[0_15px_35px_rgba(37,99,235,0.4)] transition-all duration-300 transform hover:-translate-y-1 ring-1 ring-blue-600/50 hover:ring-blue-500/70"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-blue-700 transition-opacity duration-300 group-hover:opacity-0"></span>
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out"></span>
              <span className="relative z-10 flex items-center gap-2">
                Sign In
                <svg className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </Link>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full relative group/cards">
          {/* Card 1 */}
          <div className="relative group/card rounded-2xl bg-white p-7 border border-slate-200/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.1)] transition-all duration-500 hover:-translate-y-2 flex flex-col items-center text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 focus-within::opacity-100"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 scale-x-0 group-hover/card:scale-x-100 transition-transform duration-500 origin-left"></div>
            
            <div className="w-12 h-12 rounded-xl bg-blue-50/80 flex items-center justify-center mb-5 group-hover/card:scale-110 group-hover/card:bg-blue-100 transition-all duration-500 relative z-10 shadow-sm">
              <svg className="w-6 h-6 text-blue-600 group-hover/card:text-blue-700 transition-colors duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="text-lg font-bold text-slate-800 mb-2 relative z-10 group-hover/card:text-blue-900 transition-colors duration-300">Department Organization</div>
            <p className="text-sm text-slate-500 leading-relaxed font-medium relative z-10 group-hover/card:text-slate-600 transition-colors duration-300">
              Organize data by departments with custom groups and dynamic fields.
            </p>
          </div>
          
          {/* Card 2 */}
          <div className="relative group/card rounded-2xl bg-white p-7 border border-slate-200/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(250,204,21,0.12)] transition-all duration-500 hover:-translate-y-2 flex flex-col items-center text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/50 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-amber-500 scale-x-0 group-hover/card:scale-x-100 transition-transform duration-500 origin-left"></div>

            <div className="w-12 h-12 rounded-xl bg-yellow-50/80 flex items-center justify-center mb-5 group-hover/card:scale-110 group-hover/card:bg-yellow-100 transition-all duration-500 relative z-10 shadow-sm">
              <svg className="w-6 h-6 text-yellow-600 group-hover/card:text-yellow-700 transition-colors duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="text-lg font-bold text-slate-800 mb-2 relative z-10 group-hover/card:text-yellow-900 transition-colors duration-300">Encrypted Storage</div>
            <p className="text-sm text-slate-500 leading-relaxed font-medium relative z-10 group-hover/card:text-slate-600 transition-colors duration-300">
              Sensitive data is encrypted at rest with AES-256 encryption.
            </p>
          </div>
          
          {/* Card 3 */}
          <div className="relative group/card rounded-2xl bg-white p-7 border border-slate-200/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(79,70,229,0.1)] transition-all duration-500 hover:-translate-y-2 flex flex-col items-center text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 scale-x-0 group-hover/card:scale-x-100 transition-transform duration-500 origin-left"></div>

             <div className="w-12 h-12 rounded-xl bg-blue-50/80 flex items-center justify-center mb-5 group-hover/card:scale-110 group-hover/card:bg-indigo-50 transition-all duration-500 relative z-10 shadow-sm">
              <svg className="w-6 h-6 text-blue-600 group-hover/card:text-indigo-600 transition-colors duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-lg font-bold text-slate-800 mb-2 relative z-10 group-hover/card:text-indigo-900 transition-colors duration-300">Role-Based Access</div>
            <p className="text-sm text-slate-500 leading-relaxed font-medium relative z-10 group-hover/card:text-slate-600 transition-colors duration-300">
              Super admins, department admins, and users with proper access control.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-50 w-full py-4 mt-auto bg-white/60 backdrop-blur-lg border-t border-slate-200/50 text-center px-4">
        <p className="text-sm text-slate-600 font-medium">
          Copyright &copy; 2026 All rights reserved with Learnfluence Education Limited (Formerly known as Learnfluence Education Private Limited).
        </p>
        <p className="text-xs text-slate-500 mt-1">
          *Managed and operated by a separate legal entity.
        </p>
      </footer>
    </div>
  );
}
