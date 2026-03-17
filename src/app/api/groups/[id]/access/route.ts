import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';
import { isDepartmentUnderAdmin } from '@/lib/department-access';
import { auditUserAction } from '@/lib/audit';
import { AuditAction, UserRole } from '@prisma/client';

async function canManageGroupAccess(session: any, groupDepartmentId: string): Promise<boolean> {
  if (session.user.role === UserRole.SUPER_ADMIN) return true;
  if (session.user.role === UserRole.SUPERVISOR) {
    return session.user.departmentId === groupDepartmentId;
  }
  if (session.user.role === UserRole.DEPT_ADMIN && session.user.departmentId) {
    return isDepartmentUnderAdmin(groupDepartmentId, session.user.departmentId);
  }
  return false;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/** Get all descendant department IDs (children, grandchildren, ...) for a department */
async function getDescendantDepartmentIds(rootDepartmentId: string): Promise<string[]> {
  const result: string[] = [];
  const queue: string[] = [rootDepartmentId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = await prisma.department.findMany({
      where: { parentId: currentId },
      select: { id: true },
    });

    for (const child of children) {
      result.push(child.id);
      queue.push(child.id);
    }
  }

  return result;
}

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

// GET - List granted or not-granted users for this group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const allowedRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.DEPT_ADMIN, UserRole.SUPERVISOR];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const { id: groupId } = await params;
    const groupForAccess = await prisma.group.findUnique({
      where: { id: groupId },
      select: { departmentId: true },
    });
    if (!groupForAccess) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    const allowed = await canManageGroupAccess(session, groupForAccess.departmentId);
    if (!allowed) {
      return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section'); // 'granted' | 'not_granted'
    const search = (searchParams.get('search') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)));

    // Backwards compatibility: if no section provided, return simple granted list like before
    if (!section) {
      const groupAccess = await prisma.groupAccess.findMany({
        where: { groupId },
        include: {
          departmentUser: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      const users = groupAccess.map((access) => ({
        userId: access.departmentUser.user.id,
        ...access.departmentUser.user,
      }));

      return NextResponse.json({ users });
    }

    if (section !== 'granted' && section !== 'not_granted') {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            parent: {
              select: {
                id: true,
                name: true,
                admin: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const ancestorIds = await getAncestorDepartmentIds(group.departmentId);
    const departmentsForGrant = [group.departmentId, ...ancestorIds];

    // Implicit access holders:
    // - all super admins
    // - department admin of this department and of every ancestor (branch admin and sub-dept admins)
    // - any user with department access (grant) to this department or its ancestors
    const superAdmins = await prisma.user.findMany({
      where: { role: UserRole.SUPER_ADMIN },
      select: { id: true },
    });
    const implicitUserIds = new Set<string>(superAdmins.map((u) => u.id));

    const deptIdsForAdmins = [group.departmentId, ...ancestorIds];
    const ancestorDepts = await prisma.department.findMany({
      where: { id: { in: deptIdsForAdmins } },
      select: { adminId: true },
    });
    ancestorDepts.forEach((d) => {
      if (d.adminId) implicitUserIds.add(d.adminId);
    });
    const deptGrants = await prisma.departmentAccessGrant.findMany({
      where: {
        departmentId: {
          in: departmentsForGrant,
        },
      },
      select: { userId: true },
    });
    const deptAccessUserIds = new Set<string>(deptGrants.map((g) => g.userId));
    for (const id of deptAccessUserIds) {
      implicitUserIds.add(id);
    }

    if (section === 'granted') {
      const groupAccess = await prisma.groupAccess.findMany({
        where: { groupId },
        include: {
          departmentUser: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      const explicitUserIds = new Set<string>(
        groupAccess.map((ga) => ga.departmentUser.user.id)
      );

      // All users with access: implicit (roles/admins) + explicit group grants
      const allUserIds = new Set<string>(implicitUserIds);
      for (const id of explicitUserIds) {
        allUserIds.add(id);
      }

      const where: any = {
        id: { in: Array.from(allUserIds) },
      };
      if (search) {
        where.AND = [
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
          where,
          select: { id: true, name: true, email: true, role: true },
          orderBy: { name: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      return NextResponse.json({
        items: users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          directGrant: explicitUserIds.has(u.id),
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }

    // not_granted: ALL users who do not have implicit or explicit group access,
    // regardless of their department membership, except super admins.
    const existingAccess = await prisma.groupAccess.findMany({
      where: { groupId },
      include: {
        departmentUser: {
          select: { userId: true },
        },
      },
    });

    const explicitUserIds = new Set<string>(
      existingAccess
        .map((ga) => ga.departmentUser?.userId)
        .filter((id): id is string => !!id)
    );

    const excludeIds = new Set<string>([...implicitUserIds]);
    for (const id of explicitUserIds) {
      excludeIds.add(id);
    }

    const baseWhere: any = {
      role: { not: UserRole.SUPER_ADMIN },
      id: { notIn: Array.from(excludeIds) },
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

    const [users, total] = await prisma.$transaction([
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
      items: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Error fetching group access:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch group access' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

// POST - Grant access to a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const allowedRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.DEPT_ADMIN, UserRole.SUPERVISOR];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const { id } = await params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Ensure the group exists and get its department
    const group = await prisma.group.findUnique({
      where: { id },
      select: { id: true, departmentId: true, name: true },
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }
    const allowed = await canManageGroupAccess(session, group.departmentId);
    if (!allowed) {
      return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 });
    }

    // Find or create a departmentUser record for this group's department.
    // This allows granting access even if the user was not previously
    // registered to any department.
    let departmentUser = await prisma.departmentUser.findFirst({
      where: { userId, departmentId: group.departmentId },
    });

    if (!departmentUser) {
      departmentUser = await prisma.departmentUser.create({
        data: {
          userId,
          departmentId: group.departmentId,
        },
      });
    }

    // Check if access already exists
    const existingAccess = await prisma.groupAccess.findUnique({
      where: {
        departmentUserId_groupId: {
          departmentUserId: departmentUser.id,
          groupId: id
        }
      }
    });

    if (existingAccess) {
      return NextResponse.json(
        { error: 'User already has access to this group' },
        { status: 409 }
      );
    }

    // Grant access
    await prisma.groupAccess.create({
      data: {
        departmentUserId: departmentUser.id,
        groupId: id
      }
    });

    if (session?.user) {
      auditUserAction(
        AuditAction.GROUP_ACCESS_GRANT,
        session.user.id,
        session.user.email!,
        session.user.role,
        'GroupAccess',
        id,
        `Group ${id}`,
        { userId, departmentUserId: departmentUser.id },
        request
      );
    }

    return NextResponse.json({ 
      message: 'Access granted successfully' 
    });
  } catch (error: any) {
    console.error('Error granting group access:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to grant access' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

// DELETE - Remove access from a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const allowedRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.DEPT_ADMIN, UserRole.SUPERVISOR];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const { id } = await params;
    const group = await prisma.group.findUnique({
      where: { id },
      select: { departmentId: true },
    });
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    const allowed = await canManageGroupAccess(session, group.departmentId);
    if (!allowed) {
      return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 });
    }
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Remove access for this user from the group, regardless of specific
    // departmentUser record. If nothing is deleted, we still treat it as success.
    const deleted = await prisma.groupAccess.deleteMany({
      where: {
        groupId: id,
        departmentUser: {
          userId,
        },
      },
    });

    if (session?.user) {
      auditUserAction(
        AuditAction.GROUP_ACCESS_REVOKE,
        session.user.id,
        session.user.email!,
        session.user.role,
        'GroupAccess',
        id,
        `Group ${id}`,
        { userId, deletedCount: deleted.count },
        request
      );
    }

    return NextResponse.json({ 
      message: 'Access removed successfully' 
    });
  } catch (error: any) {
    console.error('Error removing group access:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove access' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}