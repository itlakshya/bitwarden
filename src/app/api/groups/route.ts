import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/middleware/auth";
import { auditUserAction } from "@/lib/audit";
import { AuditAction, UserRole } from "@prisma/client";

// GET - List groups for admin roles
export async function GET() {
  try {
    const session = await requireAuth();
    
    let groups;
    
    if (session.user.role === UserRole.SUPER_ADMIN) {
      // Super admin can see all groups
      groups = await prisma.group.findMany({
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
            },
            include: {
              _count: {
                select: { values: true }
              }
            }
          },
          _count: {
            select: {
              items: true,
              userAccess: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Department admin and supervisor logic
      if (session.user.role === UserRole.DEPT_ADMIN) {
        // Dept admin sees groups in their department and sub-departments
        const rootDeptId = session.user.departmentId;
        if (!rootDeptId) {
          return NextResponse.json({ groups: [] });
        }

        // Collect all descendant department IDs
        const deptIds: string[] = [rootDeptId];
        const queue: string[] = [rootDeptId];
        while (queue.length > 0) {
          const currentId = queue.shift()!;
          const children = await prisma.department.findMany({
            where: { parentId: currentId },
            select: { id: true },
          });
          for (const child of children) {
            deptIds.push(child.id);
            queue.push(child.id);
          }
        }

        groups = await prisma.group.findMany({
          where: {
            departmentId: { in: deptIds },
          },
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            fieldDefinitions: {
              orderBy: {
                order: "asc",
              },
            },
            _count: {
              select: {
                items: true,
                userAccess: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });
      } else {
        // Supervisors & other admins: show only groups they have explicit access to
        const userId = session.user.id;

        const accessRecords = await prisma.groupAccess.findMany({
          where: {
            departmentUser: {
              userId,
            },
          },
          select: {
            group: {
              include: {
                department: {
                  select: { id: true, name: true },
                },
                fieldDefinitions: {
                  orderBy: { order: "asc" },
                },
                _count: {
                  select: {
                    items: true,
                    userAccess: true,
                  },
                },
              },
            },
          },
        });

        groups = accessRecords.map((r) => r.group);
      }
    }

    return NextResponse.json({ groups });
  } catch (error: any) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch groups" },
      { status: error.message?.includes("required") ? 403 : 500 }
    );
  }
}

// POST - Create new group
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { name, description, departmentId, fieldDefinitions = [] } = body;
    
    // Validation
    if (!name || !departmentId) {
      return NextResponse.json(
        { error: 'Group name and department ID are required' },
        { status: 400 }
      );
    }
    
    // Check if user can create groups in this department
    if (session.user.role !== UserRole.SUPER_ADMIN) {
      const userDeptId = session.user.departmentId;

      if (!userDeptId) {
        return NextResponse.json(
          { error: "Access denied to this department" },
          { status: 403 }
        );
      }

      if (session.user.role === UserRole.DEPT_ADMIN) {
        // Dept admin can create groups in their department and sub-departments
        const allowedDeptIds: string[] = [userDeptId];
        const queue: string[] = [userDeptId];
        while (queue.length > 0) {
          const currentId = queue.shift()!;
          const children = await prisma.department.findMany({
            where: { parentId: currentId },
            select: { id: true },
          });
          for (const child of children) {
            allowedDeptIds.push(child.id);
            queue.push(child.id);
          }
        }

        if (!allowedDeptIds.includes(departmentId)) {
          return NextResponse.json(
            { error: "Access denied to this department" },
            { status: 403 }
          );
        }
      } else if (session.user.role === UserRole.SUPERVISOR) {
        // Supervisor can create groups only in the sub-department they supervise
        if (departmentId !== userDeptId) {
          return NextResponse.json(
            { error: "Access denied to this department" },
            { status: 403 }
          );
        }
      } else {
        // Other roles cannot create groups
        return NextResponse.json(
          { error: "Access denied to this department" },
          { status: 403 }
        );
      }
    }
    
    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId }
    });
    
    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }
    
    // Check if group name already exists in department
    const existingGroup = await prisma.group.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        departmentId
      }
    });
    
    if (existingGroup) {
      return NextResponse.json(
        { error: 'Group with this name already exists in the department' },
        { status: 409 }
      );
    }
    
    // Create group with field definitions in a transaction
    const group = await prisma.$transaction(async (tx) => {
      // Create the group
      const newGroup = await tx.group.create({
        data: {
          name,
          description,
          departmentId,
        }
      });
      
      // Create field definitions if provided
      if (fieldDefinitions.length > 0) {
        await tx.fieldDefinition.createMany({
          data: fieldDefinitions.map((field: any, index: number) => ({
            name: field.name,
            type: field.type,
            required: field.required || false,
            encrypted: field.encrypted || false,
            placeholder: field.placeholder || '',
            order: field.order || index,
            groupId: newGroup.id
          }))
        });
      }
      
      // Return group with field definitions
      return await tx.group.findUnique({
        where: { id: newGroup.id },
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

    if (!group) {
      throw new Error('Failed to create group');
    }
    
    if (session?.user) {
      auditUserAction(
        AuditAction.CREATE,
        session.user.id,
        session.user.email!,
        session.user.role,
        'Group',
        group.id,
        group.name,
        { departmentId },
        request
      );
    }
    
    return NextResponse.json({ 
      message: 'Group created successfully',
      group 
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create group' },
      { status: error.message?.includes('required') ? 403 : 500 }
    );
  }
}