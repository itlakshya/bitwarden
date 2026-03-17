import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/middleware/auth";
import { isDepartmentUnderAdmin } from "@/lib/department-access";
import { auditUserAction } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

function allowedToManageGroup(session: any, groupDepartmentId: string): Promise<boolean> {
  if (session.user.role === 'SUPER_ADMIN') return Promise.resolve(true);
  if (session.user.role === 'SUPERVISOR') {
    return Promise.resolve(session.user.departmentId === groupDepartmentId);
  }
  if (session.user.role === 'DEPT_ADMIN' && session.user.departmentId) {
    return isDepartmentUnderAdmin(groupDepartmentId, session.user.departmentId);
  }
  return Promise.resolve(false);
}

// GET - Get specific group with field definitions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'DEPT_ADMIN', 'SUPERVISOR'].includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const { id: groupId } = await params;
    
    const group = await prisma.group.findUnique({
      where: { id: groupId },
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
        },
        items: {
          include: {
            values: {
              include: {
                fieldDefinition: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    encrypted: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            items: true,
            userAccess: true
          }
        }
      }
    });
    
    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }
    
    const allowed = await allowedToManageGroup(session, group.departmentId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Access denied to this group' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ group });
  } catch (error: any) {
    console.error('Error fetching group:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch group' },
      { status: error.message?.includes('required') ? 403 : 500 }
    );
  }
}

// PUT - Update group and field definitions
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'DEPT_ADMIN', 'SUPERVISOR'].includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const { id: groupId } = await params;
    const body = await request.json();
    const { name, description, fieldDefinitions = [] } = body;
    
    // Get existing group
    const existingGroup = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        fieldDefinitions: {
          include: {
            _count: {
              select: { values: true }
            }
          }
        }
      }
    });
    
    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }
    
    const allowed = await allowedToManageGroup(session, existingGroup.departmentId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Access denied to this group' },
        { status: 403 }
      );
    }
    
    // Update group and field definitions in a transaction
    const updatedGroup = await prisma.$transaction(async (tx) => {
      // Update group basic info
      await tx.group.update({
        where: { id: groupId },
        data: {
          name: name || existingGroup.name,
          description: description !== undefined ? description : existingGroup.description,
        }
      });

      // Handle field definitions update (non-destructive for unchanged fields)
      if (Array.isArray(fieldDefinitions)) {
        const incoming = fieldDefinitions as any[];
        const existing = await tx.fieldDefinition.findMany({ where: { groupId } });
        const incomingById = new Map<string, any>();
        const incomingIds = new Set<string>();

        for (const field of incoming) {
          if (field.id) {
            incomingById.set(field.id, field);
            incomingIds.add(field.id);
          }
        }

        // Delete definitions that are not present anymore
        const toDeleteIds = existing
          .filter((f) => !incomingIds.has(f.id))
          .map((f) => f.id);

        if (toDeleteIds.length > 0) {
          await tx.fieldDefinition.deleteMany({
            where: { id: { in: toDeleteIds } }
          });
        }

        // Upsert incoming fields
        for (let index = 0; index < incoming.length; index++) {
          const field = incoming[index];
          if (field.id) {
            // update existing
            await tx.fieldDefinition.update({
              where: { id: field.id },
              data: {
                name: field.name,
                type: field.type,
                required: field.required || false,
                encrypted: field.encrypted || false,
                placeholder: field.placeholder || '',
                order: field.order ?? index,
              },
            });
          } else {
            // create new
            await tx.fieldDefinition.create({
              data: {
                name: field.name,
                type: field.type,
                required: field.required || false,
                encrypted: field.encrypted || false,
                placeholder: field.placeholder || '',
                order: field.order ?? index,
                groupId,
              },
            });
          }
        }
      }
      
      // Return updated group
      return await tx.group.findUnique({
        where: { id: groupId },
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
          },
          _count: {
            select: {
              items: true,
              userAccess: true
            }
          }
        }
      });
    });
    
    if (session?.user && updatedGroup) {
      auditUserAction(
        AuditAction.UPDATE,
        session.user.id,
        session.user.email!,
        session.user.role,
        'Group',
        updatedGroup.id,
        updatedGroup.name,
        {},
        request
      );
    }
    
    return NextResponse.json({ 
      message: 'Group updated successfully',
      group: updatedGroup 
    });
    
  } catch (error: any) {
    console.error('Error updating group:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update group' },
      { status: error.message?.includes('required') ? 403 : 500 }
    );
  }
}

// DELETE - Delete group and all related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'DEPT_ADMIN', 'SUPERVISOR'].includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const { id: groupId } = await params;
    
    // Get existing group
    const existingGroup = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: {
            items: true
          }
        }
      }
    });
    
    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }
    
    const allowed = await allowedToManageGroup(session, existingGroup.departmentId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Access denied to this group' },
        { status: 403 }
      );
    }
    
    // Delete group (cascade will handle related data)
    await prisma.group.delete({
      where: { id: groupId }
    });
    
    if (session?.user) {
      auditUserAction(
        AuditAction.DELETE,
        session.user.id,
        session.user.email!,
        session.user.role,
        'Group',
        existingGroup.id,
        existingGroup.name,
        { deletedItems: existingGroup._count.items },
        request
      );
    }
    
    return NextResponse.json({ 
      message: 'Group deleted successfully',
      deletedItems: existingGroup._count.items
    });
    
  } catch (error: any) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete group' },
      { status: error.message?.includes('required') ? 403 : 500 }
    );
  }
}