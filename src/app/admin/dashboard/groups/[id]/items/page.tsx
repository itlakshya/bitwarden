import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-prisma';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import GroupItemsClient from './GroupItemsClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GroupItemsPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/admin/login');
  }
  
  // Check if user has admin privileges
  if (session.user.role !== UserRole.SUPER_ADMIN && 
      session.user.role !== UserRole.DEPT_ADMIN && 
      session.user.role !== UserRole.SUPERVISOR) {
    redirect('/auth/signin?error=access_denied');
  }

  const { id } = await params;
  
  // Get group with field definitions
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      department: {
        select: {
          id: true,
          name: true
        }
      },
      fieldDefinitions: {
        orderBy: {
          order: 'asc'
        }
      }
    }
  });

  if (!group) {
    redirect('/admin/dashboard?tab=groups&error=group_not_found');
  }

  // Check if user has access to this group's department (view layer safeguard;
  // API will still enforce detailed permissions).
  if (session.user.role === UserRole.SUPERVISOR) {
    if (session.user.departmentId !== group.department.id) {
      redirect('/admin/dashboard?tab=departments&error=access_denied');
    }
  } else if (session.user.role === UserRole.DEPT_ADMIN) {
    const managedDepartment = await prisma.department.findFirst({
      where: { adminId: session.user.id },
      select: { id: true },
    });

    let allowed = false;
    if (managedDepartment) {
      if (managedDepartment.id === group.department.id) {
        allowed = true;
      } else {
        // Allow access to groups in sub-departments of the managed department
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
      redirect('/admin/dashboard?tab=groups&error=access_denied');
    }
  }
  
  return (
    <GroupItemsClient 
      group={group}
      isSuperAdmin={session.user.role === UserRole.SUPER_ADMIN}
    />
  );
}