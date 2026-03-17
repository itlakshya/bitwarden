import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-prisma';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import GroupEditClient from './GroupEditClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GroupEditPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/admin/login');
  }

  if (
    session.user.role !== UserRole.SUPER_ADMIN &&
    session.user.role !== UserRole.DEPT_ADMIN &&
    session.user.role !== UserRole.SUPERVISOR
  ) {
    redirect('/auth/signin?error=access_denied');
  }

  const { id } = await params;

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      department: {
        select: {
          id: true,
          name: true,
        },
      },
      fieldDefinitions: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  if (!group) {
    redirect('/admin/dashboard?tab=departments&error=group_not_found');
  }

  // Supervisors may only edit groups in their sub-department
  if (session.user.role === UserRole.SUPERVISOR) {
    if (session.user.departmentId !== group.department.id) {
      redirect('/admin/dashboard?tab=departments&error=access_denied');
    }
  }

  // Dept admins may only edit groups in their department or its sub-departments
  if (session.user.role === UserRole.DEPT_ADMIN) {
    const managedDepartment = await prisma.department.findFirst({
      where: { adminId: session.user.id },
      select: { id: true },
    });

    let allowed = false;
    if (managedDepartment) {
      if (managedDepartment.id === group.department.id) {
        allowed = true;
      } else {
        let current = await prisma.department.findUnique({
          where: { id: group.department.id },
          select: { parentId: true },
        });

        while (current?.parentId && !allowed) {
          if (current.parentId === managedDepartment.id) {
            allowed = true;
            break;
          }
          current = await prisma.department.findUnique({
            where: { id: current.parentId },
            select: { parentId: true },
          });
        }
      }
    }

    if (!allowed) {
      redirect('/admin/dashboard?tab=departments&error=access_denied');
    }
  }

  return (
    <GroupEditClient
      group={{
        id: group.id,
        name: group.name,
        description: group.description,
        department: group.department,
        fieldDefinitions: group.fieldDefinitions,
      }}
    />
  );
}

