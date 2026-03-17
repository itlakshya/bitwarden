import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-prisma';
import { getAuditLogStats } from '@/lib/audit';
import { UserRole } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (
      session.user.role !== UserRole.SUPER_ADMIN &&
      session.user.role !== UserRole.DEPT_ADMIN &&
      session.user.role !== UserRole.SUPERVISOR
    ) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const excludeSuperAdmin = session.user.role !== UserRole.SUPER_ADMIN;
    const stats = await getAuditLogStats(excludeSuperAdmin);

    return NextResponse.json(stats);

  } catch (error: any) {
    console.error('Error fetching audit log stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch audit log statistics' },
      { status: error.status || 500 }
    );
  }
}