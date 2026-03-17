import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';
import { auditUserAction } from '@/lib/audit';
import { hasDepartmentAccess, isDepartmentUnderAdmin } from '@/lib/department-access';
import { AuditAction } from '@prisma/client';

async function checkGroupAccess(
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

  if (userRole === 'SUPERVISOR' && userDepartmentId === group.departmentId) {
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
      },
    },
  });

  return !!groupAccess;
}

// PUT - Update a specific group item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: groupId, itemId } = await params;
    const body = await request.json();

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, departmentId: true },
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const allowed = await checkGroupAccess(
      session.user.id,
      groupId,
      session.user.role,
      session.user.departmentId
    );

    if (!allowed) {
      return NextResponse.json(
        { error: 'Access denied to this group' },
        { status: 403 }
      );
    }

    const existingItem = await prisma.groupItem.findFirst({
      where: {
        id: itemId,
        groupId,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found in this group' },
        { status: 404 }
      );
    }

    const { title, values } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Item title is required' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.groupItem.update({
        where: { id: itemId },
        data: { title },
      });

      if (Array.isArray(values)) {
        await tx.fieldValue.deleteMany({
          where: { groupItemId: itemId },
        });

        await tx.fieldValue.createMany({
          data: values.map((v: any) => ({
            fieldDefinitionId: v.fieldDefinitionId,
            groupItemId: itemId,
            value: v.value,
          })),
        });
      }
    });

    if (session?.user) {
      auditUserAction(
        AuditAction.ITEM_UPDATE,
        session.user.id,
        session.user.email!,
        session.user.role,
        'GroupItem',
        existingItem.id,
        title,
        { groupId },
        request
      );
    }

    return NextResponse.json({ message: 'Item updated successfully' });
  } catch (error: any) {
    console.error('Error updating group item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update item' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

// DELETE - Delete a specific group item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: groupId, itemId } = await params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, departmentId: true },
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const allowed = await checkGroupAccess(
      session.user.id,
      groupId,
      session.user.role,
      session.user.departmentId
    );

    if (!allowed) {
      return NextResponse.json(
        { error: 'Access denied to this group' },
        { status: 403 }
      );
    }

    const item = await prisma.groupItem.findFirst({
      where: {
        id: itemId,
        groupId,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found in this group' },
        { status: 404 }
      );
    }

    await prisma.groupItem.delete({
      where: { id: itemId },
    });

    if (session?.user) {
      auditUserAction(
        AuditAction.ITEM_DELETE,
        session.user.id,
        session.user.email!,
        session.user.role,
        'GroupItem',
        item.id,
        item.title,
        { groupId },
        request
      );
    }

    return NextResponse.json({
      message: 'Item deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting group item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete item' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}