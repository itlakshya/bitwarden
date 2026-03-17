import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-prisma';
import { UserRole, AuditAction } from '@prisma/client';
import { auditUserAction } from '@/lib/audit';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/** Get ancestor department IDs (parent, grandparent, ...) for a department */
async function getAncestorDepartmentIds(departmentId: string): Promise<string[]> {
  const ids: string[] = [];
  let current = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { parentId: true },
  });
  while (current?.parentId) {
    ids.push(current.parentId);
    current = await prisma.department.findUnique({
      where: { id: current.parentId },
      select: { parentId: true },
    });
  }
  return ids;
}

/** Check if session can manage this department (own department or super admin) */
async function canManageDepartment(session: { user: { id: string; role: string } }, departmentId: string): Promise<boolean> {
  if (session.user.role === UserRole.SUPER_ADMIN) return true;
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { adminId: true },
  });
  return dept?.adminId === session.user.id;
}

// GET - List granted or not-granted users with pagination
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.DEPT_ADMIN && session.user.role !== UserRole.SUPERVISOR) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: departmentId } = await params;
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, adminId: true, parentId: true },
    });
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    const allowed = await canManageDepartment(session, departmentId);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section'); // 'granted' | 'not_granted'
    const search = (searchParams.get('search') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)));

    if (section !== 'granted' && section !== 'not_granted') {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
    }

    const ancestorIds = await getAncestorDepartmentIds(departmentId);
    const departmentIdsWithAccess = [departmentId, ...ancestorIds];

    // Collect admin user IDs for the current department and all ancestor departments.
    const ancestorDepartments =
      ancestorIds.length > 0
        ? await prisma.department.findMany({
            where: { id: { in: ancestorIds } },
            select: { adminId: true },
          })
        : [];

    const ancestorAdminIds = ancestorDepartments
      .map((d) => d.adminId)
      .filter((id): id is string => !!id);

    if (section === 'granted') {
      // User has access if they have a grant for this department or any ancestor,
      // or if they are the admin of this department or any ancestor department,
      // or if they are a super admin.
      const grants = await prisma.departmentAccessGrant.findMany({
        where: { departmentId: { in: departmentIdsWithAccess } },
        select: { userId: true, departmentId: true },
      });

      const grantedUserIdsSet = new Set(grants.map((g) => g.userId));
      const directGrantUserIds = new Set(
        grants.filter((g) => g.departmentId === departmentId).map((g) => g.userId)
      );

      // Include current department admin and all ancestor department admins
      const combinedIds = new Set<string>(grantedUserIdsSet);
      if (department.adminId) {
        combinedIds.add(department.adminId);
      }
      for (const adminId of ancestorAdminIds) {
        combinedIds.add(adminId);
      }
      const combinedIdArray = Array.from(combinedIds);

      const whereGranted: any = {
        OR: [
          { id: { in: combinedIdArray } },
          { role: UserRole.SUPER_ADMIN },
        ],
      };

      if (search) {
        whereGranted.AND = [
          {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        ];
      }

      const [users, total] = await prisma.$transaction([
        prisma.user.findMany({
          where: whereGranted,
          select: { id: true, name: true, email: true, role: true },
          orderBy: { name: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.user.count({
          where: whereGranted,
        }),
      ]);

      const items = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        directGrant: directGrantUserIds.has(u.id),
      }));

      return NextResponse.json({
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }

    // not_granted: eligible users who don't have access
    const grants = await prisma.departmentAccessGrant.findMany({
      where: { departmentId: { in: departmentIdsWithAccess } },
      select: { userId: true },
    });
    const hasAccessUserIds = new Set(grants.map((g) => g.userId));

    // Users who implicitly have access and therefore must not appear in "not granted":
    // - current department admin
    // - ancestor department admins
    const implicitAdminIds = new Set<string>();
    if (department.adminId) {
      implicitAdminIds.add(department.adminId);
    }
    for (const adminId of ancestorAdminIds) {
      implicitAdminIds.add(adminId);
    }

    // Eligible: not SUPER_ADMIN, not any department admin in the chain, and no explicit access
    const baseWhere: any = {
      role: { not: UserRole.SUPER_ADMIN },
      id: { notIn: [...implicitAdminIds, ...hasAccessUserIds] },
    };

    if (search) {
      baseWhere.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [eligibleUsers, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: baseWhere,
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where: baseWhere }),
    ]);

    return NextResponse.json({
      items: eligibleUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error('Department access list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list access' },
      { status: 500 }
    );
  }
}

// POST - Grant access to a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.DEPT_ADMIN && session.user.role !== UserRole.SUPERVISOR) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: departmentId } = await params;
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, name: true, adminId: true },
    });
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    const allowed = await canManageDepartment(session, departmentId);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const userId = body?.userId;
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.role === UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Cannot grant access to super admin' }, { status: 400 });
    }
    if (user.id === department.adminId) {
      return NextResponse.json({ error: 'User is already the department admin' }, { status: 400 });
    }

    await prisma.departmentAccessGrant.upsert({
      where: {
        userId_departmentId: { userId, departmentId },
      },
      create: { userId, departmentId },
      update: {},
    });

    auditUserAction(
      AuditAction.DEPARTMENT_ACCESS_GRANT,
      session.user.id,
      session.user.email!,
      session.user.role as UserRole,
      'DepartmentAccessGrant',
      undefined,
      department.name,
      { departmentId, grantedUserId: userId, grantedUserEmail: user.email },
      request
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Department access grant error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to grant access' },
      { status: 500 }
    );
  }
}
