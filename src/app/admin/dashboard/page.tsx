import { Suspense } from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-prisma';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  let managedDepartment = null;
  if (session.user.role === UserRole.DEPT_ADMIN || session.user.role === UserRole.SUPERVISOR) {
    managedDepartment = await prisma.department.findFirst({
      where: { adminId: session.user.id },
      select: { id: true, name: true, parentId: true },
    });
  }

  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center p-8">Loading...</div>}>
      <AdminDashboardClient
        user={session.user}
        isSuperAdmin={session.user.role === UserRole.SUPER_ADMIN}
        isDepartmentAdmin={session.user.role === UserRole.DEPT_ADMIN}
        isSupervisor={session.user.role === UserRole.SUPERVISOR}
        managedDepartment={managedDepartment}
      />
    </Suspense>
  );
}