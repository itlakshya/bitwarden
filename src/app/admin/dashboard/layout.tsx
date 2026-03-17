import { Suspense } from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-prisma';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import DashboardShell from './DashboardShell';

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/admin/login');
  }

  // Admin panel only for users who signed in via admin login (not normal signin)
  if (session.user.loginSource !== 'admin') {
    redirect('/dashboard');
  }

  if (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.DEPT_ADMIN && session.user.role !== UserRole.SUPERVISOR) {
    redirect('/auth/signin?error=access_denied');
  }

  let managedDepartment: { id: string; name: string } | null = null;
  if (session.user.role === UserRole.DEPT_ADMIN) {
    const dept = await prisma.department.findFirst({
      where: { adminId: session.user.id },
      select: { id: true, name: true },
    });
    managedDepartment = dept;
  } else if (session.user.role === UserRole.SUPERVISOR && session.user.departmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: session.user.departmentId },
      select: { id: true, name: true },
    });
    managedDepartment = dept;
  }

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-50">Loading...</div>}>
      <DashboardShell
        user={session.user}
        isSuperAdmin={session.user.role === UserRole.SUPER_ADMIN}
        isDepartmentAdmin={session.user.role === UserRole.DEPT_ADMIN}
        isSupervisor={session.user.role === UserRole.SUPERVISOR}
        managedDepartment={managedDepartment}
      >
        {children}
      </DashboardShell>
    </Suspense>
  );
}