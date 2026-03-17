'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { UserRole } from '@prisma/client';
import { APP_NAME_PARTS } from '@/lib/branding';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  role: UserRole;
  name?: string | null;
  email?: string | null;
  departmentId?: string | null;
}

interface DashboardShellProps {
  user: User;
  isSuperAdmin: boolean;
  isDepartmentAdmin: boolean;
  isSupervisor: boolean;
  managedDepartment?: { id: string; name: string } | null;
  children: React.ReactNode;
}
export default function DashboardShell({
  user,
  isSuperAdmin,
  isDepartmentAdmin,
  isSupervisor,
  managedDepartment,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';

  const isDepartmentDetail = pathname.match(/^\/admin\/dashboard\/departments\/[^/]+$/);
  const isActive = (itemId: string) =>
    isDepartmentDetail ? itemId === 'departments' : tab === itemId;

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/admin/login' });
  };

  const navItems = [
    { name: 'Overview', id: 'overview', href: '/admin/dashboard?tab=overview', icon: Squares2X2Icon, available: true },
    {
      name: 'Departments',
      id: 'departments',
      href:
        isSuperAdmin || !managedDepartment
          ? '/admin/dashboard?tab=departments'
          : `/admin/dashboard/departments/${managedDepartment.id}`,
      icon: BuildingOfficeIcon,
      available: isSuperAdmin || isDepartmentAdmin || isSupervisor,
    },
    {
      name: 'Users',
      id: 'users',
      href: '/admin/dashboard?tab=users',
      icon: UserGroupIcon,
      available: isSuperAdmin,
    },
    {
      name: 'Audit Logs',
      id: 'audit-logs',
      href: '/admin/dashboard?tab=audit-logs',
      icon: DocumentTextIcon,
      available: isSuperAdmin || isDepartmentAdmin || isSupervisor,
    },
    {
      name: 'Profile',
      id: 'settings',
      href: '/admin/dashboard?tab=settings',
      icon: UserCircleIcon,
      available: true,
    },
  ];

  const filteredNav = navItems.filter((item) => item.available);

  return (
    <div className="flex h-screen bg-slate-50/50">
      <div className="w-64 bg-white border-r border-slate-200/60 flex flex-col shrink-0 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <ShieldCheckIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {APP_NAME_PARTS.primary} Admin
              </h1>
              <p className="text-xs font-medium text-slate-500">
                {isSuperAdmin ? 'Super Administrator' : isDepartmentAdmin ? 'Dept Admin' : 'Supervisor'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.id);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`group flex items-center px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-600/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 shrink-0 transition-colors ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-white space-y-3">
          <div className="flex items-center px-2 py-1.5">
            <div className="flex flex-col flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs font-medium text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl transition-all shadow-sm group"
            title="Sign out"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2 text-slate-400 group-hover:text-red-500 transition-colors" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative z-10">
        <main className="flex-1 overflow-auto bg-slate-50/50 p-6 md:p-8 lg:p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
