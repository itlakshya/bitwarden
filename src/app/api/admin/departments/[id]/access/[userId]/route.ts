import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-prisma';
import { UserRole, AuditAction } from '@prisma/client';
import { auditUserAction } from '@/lib/audit';

async function canManageDepartment(session: { user: { id: string; role: string } }, departmentId: string): Promise<boolean> {
  if (session.user.role === UserRole.SUPER_ADMIN) return true;
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { adminId: true },
  });
  return dept?.adminId === session.user.id;
}

// DELETE - Revoke (direct) access for a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.DEPT_ADMIN && session.user.role !== UserRole.SUPERVISOR) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: departmentId, userId } = await params;
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, name: true },
    });
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    const allowed = await canManageDepartment(session, departmentId);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const deleted = await prisma.departmentAccessGrant.deleteMany({
      where: { userId, departmentId },
    });

    if (deleted.count > 0) {
      auditUserAction(
        AuditAction.DEPARTMENT_ACCESS_REVOKE,
        session.user.id,
        session.user.email!,
        session.user.role as UserRole,
        'DepartmentAccessGrant',
        undefined,
        department.name,
        { departmentId, revokedUserId: userId, revokedUserEmail: user?.email },
        request
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Department access revoke error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to revoke access' },
      { status: 500 }
    );
  }
}
