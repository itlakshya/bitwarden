import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth-prisma';
import { validateEmailDomain, validatePassword } from '@/lib/middleware/auth';
import { isDepartmentUnderAdmin } from '@/lib/department-access';
import bcrypt from 'bcrypt';
import { UserRole, AuditAction } from '@prisma/client';
import { auditUserAction } from '@/lib/audit';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-prisma';

async function canManageDepartment(session: any, departmentId: string): Promise<boolean> {
  if (!session?.user?.id) return false;
  if (session.user.role === UserRole.SUPER_ADMIN) return true;
  if (session.user.role !== UserRole.DEPT_ADMIN) return false;
  const managed = await prisma.department.findFirst({
    where: { adminId: session.user.id },
    select: { id: true },
  });
  return !!managed && (await isDepartmentUnderAdmin(departmentId, managed.id));
}

// GET - Get single department (Super Admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    requireSuperAdmin(session);
    
    const { id } = await params;
    
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            password: true // Include password for editing (will be masked in frontend)
          }
        },
        parent: {
          select: {
            id: true,
            name: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        groups: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                items: true,
                userAccess: true
              }
            }
          }
        },
        users: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        _count: {
          select: {
            groups: true,
            users: true
          }
        }
      }
    });

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ department });
  } catch (error: any) {
    console.error('Error fetching department:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch department' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

// PUT - Update department (Super Admin or dept admin for their sub-departments)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;
    const allowed = await canManageDepartment(session, id);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Access denied to this department' },
        { status: 403 }
      );
    }
    const body = await request.json();
    const { 
      name, 
      description, 
      parentId,
      adminName, 
      adminEmail, 
      adminPassword 
    } = body;
    
    // Find existing department
    const existingDepartment = await prisma.department.findUnique({
      where: { id },
      include: {
        admin: true
      }
    });

    if (!existingDepartment) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }
    
    // Validation
    if (!name || !adminName || !adminEmail) {
      return NextResponse.json(
        { error: 'Department name, admin name, and email are required' },
        { status: 400 }
      );
    }
    
    // Validate admin email domain
    if (!validateEmailDomain(adminEmail)) {
      return NextResponse.json(
        { error: 'Admin email must be from @iiclakshya.com domain' },
        { status: 400 }
      );
    }
    
    // Validate admin password if provided (optional for updates)
    if (adminPassword) {
      const passwordValidation = validatePassword(adminPassword);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { error: 'Admin password validation failed', details: passwordValidation.errors },
          { status: 400 }
        );
      }
    }
    
    // Check if department name already exists (excluding current department)
    const duplicateDepartment = await prisma.department.findFirst({
      where: { 
        name: { equals: name, mode: 'insensitive' },
        id: { not: id }
      }
    });
    
    if (duplicateDepartment) {
      return NextResponse.json(
        { error: 'Department with this name already exists' },
        { status: 409 }
      );
    }
    
    // Check if admin email already exists (excluding current admin)
    if (adminEmail !== existingDepartment.admin.email) {
      const duplicateUser = await prisma.user.findUnique({
        where: { email: adminEmail }
      });
      
      if (duplicateUser) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    }
    
    // If updating parentId, verify parent exists
    if (parentId && parentId !== existingDepartment.parentId) {
      const parentDepartment = await prisma.department.findUnique({
        where: { id: parentId }
      });
      
      if (!parentDepartment) {
        return NextResponse.json(
          { error: 'Parent department not found' },
          { status: 404 }
        );
      }
    }
    
    // Update department and admin in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update admin user
      const adminUpdateData: any = {
        name: adminName,
        email: adminEmail,
      };

      // Update password only if provided (optional for updates)
      if (adminPassword && adminPassword.trim() !== '') {
        adminUpdateData.password = await bcrypt.hash(adminPassword, 10);
      }

      // Update role based on department type (sub-department => SUPERVISOR, top-level => DEPT_ADMIN)
      const effectiveParentId = parentId !== undefined ? (parentId || null) : existingDepartment.parentId;
      adminUpdateData.role = effectiveParentId ? UserRole.SUPERVISOR : UserRole.DEPT_ADMIN;

      const updatedAdmin = await tx.user.update({
        where: { id: existingDepartment.adminId },
        data: adminUpdateData
      });
      
      // Update department; preserve existing parentId if not provided (keeps sub-department under parent)
      const updatedDepartment = await tx.department.update({
        where: { id },
        data: {
          name,
          description,
          parentId: parentId !== undefined ? (parentId || null) : existingDepartment.parentId,
        },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          parent: {
            select: {
              id: true,
              name: true
            }
          },
          children: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          groups: {
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  items: true,
                  userAccess: true
                }
              }
            }
          },
          _count: {
            select: {
              groups: true,
              users: true
            }
          }
        }
      });
      
      return updatedDepartment;
    });

    if (session?.user) {
      auditUserAction(
        AuditAction.UPDATE,
        session.user.id,
        session.user.email!,
        session.user.role,
        'Department',
        result.id,
        result.name,
        {},
        request
      );
    }

    return NextResponse.json({ 
      message: 'Department updated successfully',
      department: result 
    });
  } catch (error: any) {
    console.error('Error updating department:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update department' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

// DELETE - Delete department (Super Admin or branch admin for own/sub departments)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;
    const allowed = await canManageDepartment(session, id);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Access denied to this department' },
        { status: 403 }
      );
    }
    
    // Find department with related data
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        children: true,
        groups: {
          include: {
            items: true
          }
        },
        users: true
      }
    });

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Check if department has sub-departments
    if (department.children.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete department with sub-departments. Please delete sub-departments first.' },
        { status: 400 }
      );
    }

    // Check if department has groups with items
    const hasItems = department.groups.some(group => group.items.length > 0);
    if (hasItems) {
      return NextResponse.json(
        { error: 'Cannot delete department with groups containing items. Please delete all items first.' },
        { status: 400 }
      );
    }

    // Delete department and admin in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete department (this will cascade delete groups, field definitions, etc.)
      await tx.department.delete({
        where: { id }
      });
      
      // Delete the admin user
      await tx.user.delete({
        where: { id: department.adminId }
      });
    });

    if (session?.user) {
      auditUserAction(
        AuditAction.DELETE,
        session.user.id,
        session.user.email!,
        session.user.role,
        'Department',
        department.id,
        department.name,
        {},
        request
      );
    }

    return NextResponse.json({ 
      message: 'Department deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error deleting department:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete department' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}