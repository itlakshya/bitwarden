'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useSearchParams, useRouter } from 'next/navigation';
import { UserRole } from '@prisma/client';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  CogIcon,
  PlusIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  RectangleGroupIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import DepartmentManagement from './components/DepartmentManagement';
import UserManagement from './components/UserManagement';
import Settings from './components/Settings';
import AuditLogs from './components/AuditLogs';

interface User {
  id: string;
  role: UserRole;
  name?: string | null;
  email?: string | null;
  departmentId?: string | null;
}

interface AdminDashboardClientProps {
  user: User;
  isSuperAdmin: boolean;
  isDepartmentAdmin: boolean;
  isSupervisor: boolean;
  managedDepartment?: {
    id: string;
    name: string;
    parentId: string | null;
  } | null;
}

type ActiveTab = 'overview' | 'departments' | 'users' | 'audit-logs' | 'settings';

export default function AdminDashboardClient({
  user,
  isSuperAdmin,
  isDepartmentAdmin,
  isSupervisor,
  managedDepartment,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: ActiveTab = (tabParam as ActiveTab) || 'overview';
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDepartments: 0,
    totalUsers: 0,
    totalGroups: 0,
    totalItems: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load dashboard stats');
    } finally {
      setStatsLoading(false);
    }
  };

  const navigation = [
    {
      name: 'Overview',
      id: 'overview' as ActiveTab,
      icon: CogIcon,
      available: true,
    },
    {
      name: 'Departments',
      id: 'departments' as ActiveTab,
      icon: BuildingOfficeIcon,
      available: isSuperAdmin || isDepartmentAdmin || isSupervisor,
    },
    {
      name: 'Users',
      id: 'users' as ActiveTab,
      icon: UserGroupIcon,
      available: isSuperAdmin,
    },
    {
      name: 'Audit Logs',
      id: 'audit-logs' as ActiveTab,
      icon: DocumentTextIcon,
      available: isSuperAdmin || isDepartmentAdmin || isSupervisor,
    },
    {
      name: 'Profile',
      id: 'settings' as ActiveTab,
      icon: CogIcon,
      available: true,
    },
  ].filter((item) => item.available);

  const renderContent = () => {
    switch (activeTab) {
      case 'departments':
        return (
          <DepartmentManagement
            isSuperAdmin={isSuperAdmin}
            managedDepartment={
              isSuperAdmin ? undefined : managedDepartment
            }
          />
        );
      case 'users':
        return <UserManagement />;
      case 'audit-logs':
        return <AuditLogs canClear={isSuperAdmin} />;
      case 'settings':
        return <Settings user={user} />;
      default:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-12">
            {/* Premium Hero Banner */}
            <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-slate-200/50 shadow-[0_8px_40px_rgba(0,0,0,0.03)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-gradient-to-bl from-blue-100/60 via-indigo-50/20 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity duration-1000"></div>
              <div className="absolute bottom-0 left-0 w-[20rem] h-[20rem] bg-gradient-to-tr from-amber-50/60 to-transparent rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity duration-1000 delay-100"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
                    Dashboard <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Overview</span>
                  </h2>
                  <p className="text-slate-600 text-base font-medium max-w-xl leading-relaxed">
                    Welcome back, <span className="text-slate-800 font-bold">{user.name}</span>. Here is the operational status of your organization.
                  </p>
                </div>
                <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm text-sm font-semibold text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>System Optimal</span>
                </div>
              </div>
            </div>

            {/* Ultra-modern Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-[2rem] border border-slate-100 p-7 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.08)] hover:border-blue-200/60 transition-all duration-500 hover:-translate-y-2 group relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                <div className="flex items-start justify-between relative z-10">
                  <p className="text-sm font-medium text-slate-500 tracking-wider">Departments</p>
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white text-blue-600 group-hover:shadow-lg group-hover:shadow-blue-600/20 transition-all duration-500">
                    <BuildingOfficeIcon className="h-6 w-6 transition-colors" />
                  </div>
                </div>
                <div className="relative z-10 mt-4">
                  {statsLoading ? (
                    <div className="h-8 w-12 animate-pulse rounded-lg bg-slate-200" aria-hidden="true" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-900 tracking-tight group-hover:text-blue-950 transition-colors">{stats.totalDepartments}</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-100 p-7 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.08)] hover:border-emerald-200/60 transition-all duration-500 hover:-translate-y-2 group relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                <div className="flex items-start justify-between relative z-10">
                  <p className="text-sm font-medium text-slate-500 tracking-wider">Active Users</p>
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white text-emerald-500 group-hover:shadow-lg group-hover:shadow-emerald-500/20 transition-all duration-500">
                    <UserGroupIcon className="h-6 w-6 transition-colors" />
                  </div>
                </div>
                <div className="relative z-10 mt-4">
                  {statsLoading ? (
                    <div className="h-8 w-12 animate-pulse rounded-lg bg-slate-200" aria-hidden="true" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-900 tracking-tight group-hover:text-emerald-950 transition-colors">{stats.totalUsers}</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-100 p-7 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.08)] hover:border-purple-200/60 transition-all duration-500 hover:-translate-y-2 group relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                <div className="flex items-start justify-between relative z-10">
                  <p className="text-sm font-medium text-slate-500 tracking-wider">Access Groups</p>
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white text-purple-600 group-hover:shadow-lg group-hover:shadow-purple-600/20 transition-all duration-500">
                    <RectangleGroupIcon className="h-6 w-6 transition-colors" />
                  </div>
                </div>
                <div className="relative z-10 mt-4">
                  {statsLoading ? (
                    <div className="h-8 w-12 animate-pulse rounded-lg bg-slate-200" aria-hidden="true" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-900 tracking-tight group-hover:text-purple-950 transition-colors">{stats.totalGroups}</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-100 p-7 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(245,158,11,0.08)] hover:border-amber-200/60 transition-all duration-500 hover:-translate-y-2 group relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                <div className="flex items-start justify-between relative z-10">
                  <p className="text-sm font-medium text-slate-500 tracking-wider">Secured Items</p>
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white text-amber-500 group-hover:shadow-lg group-hover:shadow-amber-500/20 transition-all duration-500">
                    <ShieldCheckIcon className="h-6 w-6 transition-colors" />
                  </div>
                </div>
                <div className="relative z-10 mt-4">
                  {statsLoading ? (
                    <div className="h-8 w-12 animate-pulse rounded-lg bg-slate-200" aria-hidden="true" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-900 tracking-tight group-hover:text-amber-950 transition-colors">{stats.totalItems}</p>
                  )}
                </div>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
                <h3 className="text-lg font-semibold text-slate-900 mb-6 tracking-tight">Interactive Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    onClick={() => router.push('/admin/dashboard?tab=departments')}
                    className="flex items-center justify-between p-8 bg-white border border-slate-100 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.08)] hover:border-blue-200/60 transition-all duration-500 hover:-translate-y-2 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <div className="flex items-center relative z-10">
                      <div className="w-16 h-16 bg-slate-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-600/20 transition-all duration-500">
                        <BuildingOfficeIcon className="h-8 w-8 transition-colors" />
                      </div>
                      <div className="text-left ml-6">
                        <p className="font-medium text-slate-900 group-hover:text-blue-700 transition-colors">Create Department</p>
                        <p className="text-sm text-slate-600 mt-1">Deploy a new organizational sector</p>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-blue-600 group-hover:bg-blue-50 transition-all duration-300 relative z-10">
                       <ChevronRightIcon className="h-5 w-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>

                  <button
                    onClick={() => router.push('/admin/dashboard?tab=users')}
                    className="flex items-center justify-between p-8 bg-white border border-slate-100 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.08)] hover:border-emerald-200/60 transition-all duration-500 hover:-translate-y-2 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <div className="flex items-center relative z-10">
                      <div className="w-16 h-16 bg-slate-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-500/20 transition-all duration-500">
                        <UserGroupIcon className="h-8 w-8 transition-colors" />
                      </div>
                      <div className="text-left ml-6">
                        <p className="font-medium text-slate-900 group-hover:text-emerald-700 transition-colors">Manage Users</p>
                        <p className="text-sm text-slate-600 mt-1">Control access & permissions</p>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-emerald-500 group-hover:bg-emerald-50 transition-all duration-300 relative z-10">
                       <ChevronRightIcon className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex-1 overflow-auto">
        {/* Header */}
      {renderContent()}
    </div>
  );
}