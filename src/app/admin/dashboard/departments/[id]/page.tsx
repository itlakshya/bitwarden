import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-prisma';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hasDepartmentAccess } from '@/lib/department-access';
import DepartmentDetailClient from './DepartmentDetailClient';

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/admin/login');
  if (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.DEPT_ADMIN && session.user.role !== UserRole.SUPERVISOR) {
    redirect('/auth/signin?error=access_denied');
  }

  const { id } = await params;
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      parent: {
        select: { id: true, name: true },
      },
      children: {
        select: {
          id: true,
          name: true,
          description: true,
          admin: { select: { name: true, email: true } },
          _count: { select: { groups: true, users: true } },
        },
      },
      groups: {
        select: {
          id: true,
          name: true,
          description: true,
          _count: { select: { items: true, userAccess: true } },
        },
      },
      _count: { select: { groups: true, users: true } },
    },
  });

  if (!department) redirect('/admin/dashboard?tab=departments');
  let canManageAccess = session.user.role === UserRole.SUPER_ADMIN;

  if (session.user.role !== UserRole.SUPER_ADMIN) {
    const managed = await prisma.department.findFirst({
      where: { adminId: session.user.id },
      select: { id: true },
    });

    let isAdminOfThisDept = managed?.id === department.id;
    let isAncestorAdmin = false;

    if (!isAdminOfThisDept && managed) {
      // Walk up the parent chain from the current department to see
      // if the logged-in department admin manages any ancestor.
      let current = await prisma.department.findUnique({
        where: { id: department.id },
        select: { parentId: true },
      });

      while (current?.parentId && !isAncestorAdmin) {
        if (current.parentId === managed.id) {
          isAncestorAdmin = true;
          break;
        }
        current = await prisma.department.findUnique({
          where: { id: current.parentId },
          select: { parentId: true },
        });
      }
    }

    canManageAccess = isAdminOfThisDept || isAncestorAdmin;

    const hasGrant = await hasDepartmentAccess(session.user.id, department.id);
    if (!canManageAccess && !hasGrant) {
      redirect('/admin/dashboard?tab=departments');
    }
  }

  const canEditDeleteGroups =
    canManageAccess ||
    (session.user.role === UserRole.SUPERVISOR && session.user.departmentId === department.id);

  return (
    <DepartmentDetailClient
      department={JSON.parse(JSON.stringify(department))}
      isSuperAdmin={session.user.role === UserRole.SUPER_ADMIN}
      isSupervisor={session.user.role === UserRole.SUPERVISOR}
      canManageAccess={canManageAccess}
      canEditDeleteGroups={canEditDeleteGroups}
    />
  );
}
