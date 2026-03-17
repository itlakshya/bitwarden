import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';
import { decrypt } from '@/lib/encryption';
import { hasDepartmentAccess, isDepartmentUnderAdmin } from '@/lib/department-access';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: groupId } = await params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        department: true,
        fieldDefinitions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Reuse the same access rules as items JSON endpoint
    const hasAccess = await checkGroupAccessForExport(
      session.user.id,
      groupId,
      session.user.role,
      // @ts-ignore - some sessions may not have departmentId
      session.user.departmentId
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this group' },
        { status: 403 }
      );
    }

    const items = await prisma.groupItem.findMany({
      where: { groupId },
      include: {
        values: {
          include: {
            fieldDefinition: {
              select: {
                id: true,
                name: true,
                type: true,
                encrypted: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const decryptedItems = items.map((item) => ({
      ...item,
      values: item.values.map((value) => ({
        ...value,
        value:
          value.fieldDefinition.encrypted && value.encryptedValue
            ? decrypt(value.encryptedValue)
            : value.value,
      })),
    }));

    // CSV should only show the group's fields as columns
    const headers = group.fieldDefinitions.map((f) => f.name);

    const escapeCsv = (value: string | null | undefined) => {
      if (value === null || value === undefined) return '';
      const s = String(value);
      if (/[",\n]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = [
      headers.map(escapeCsv).join(','),
      ...decryptedItems.map((item) => {
        const fieldValues = group.fieldDefinitions.map((field) => {
          const v = item.values.find(
            (val) => val.fieldDefinition.id === field.id
          );
          return escapeCsv(v?.value ?? '');
        });

        return fieldValues.join(',');
      }),
    ];

    const csv = lines.join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${group.name || 'group'}-items.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting group items CSV:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export group items' },
      { status: error.message?.includes('required') ? 403 : 500 }
    );
  }
}

async function checkGroupAccessForExport(
  userId: string,
  groupId: string,
  userRole: string,
  userDepartmentId?: string | null
): Promise<boolean> {
  if (userRole === 'SUPER_ADMIN') {
    return true;
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { departmentId: true },
  });

  if (!group) {
    return false;
  }

  if (userRole === 'DEPT_ADMIN' && userDepartmentId && await isDepartmentUnderAdmin(group.departmentId, userDepartmentId)) {
    return true;
  }

  if (await hasDepartmentAccess(userId, group.departmentId)) {
    return true;
  }

  const groupAccess = await prisma.groupAccess.findFirst({
    where: {
      groupId,
      departmentUser: {
        userId,
        departmentId: group.departmentId,
      },
    },
  });

  return !!groupAccess;
}

