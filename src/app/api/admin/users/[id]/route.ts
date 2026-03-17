import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth-prisma';
import { validateEmailDomain, validatePassword } from '@/lib/middleware/auth';
import bcrypt from 'bcrypt';
import { UserRole, AuditAction } from '@prisma/client';
import { auditUserAction } from '@/lib/audit';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-prisma';

// GET - Get single user (Super Admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    requireSuperAdmin(session);
    
    const { id } = await params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        managedDepartment: {
          select: {
            id: true,
            name: true
          }
        },
        departmentMemberships: {
          include: {
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Don't return password in response
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

// PUT - Update user (Super Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    requireSuperAdmin(session);
    
    const { id } = await params;
    
    const body = await request.json();
    const { 
      name, 
      email, 
      role,
      password,
      departmentId
    } = body;
    
    // Find existing user
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        managedDepartment: true
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Validation
    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Name, email, and role are required' },
        { status: 400 }
      );
    }
    
    // Validate email domain
    if (!validateEmailDomain(email)) {
      return NextResponse.json(
        { error: 'Email must be from @iiclakshya.com domain' },
        { status: 400 }
      );
    }
    
    // Validate password if provided
    if (password && password.trim() !== '') {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { error: 'Password validation failed', details: passwordValidation.errors },
          { status: 400 }
        );
      }
    }
    
    // Check if email already exists (excluding current user)
    if (email !== existingUser.email) {
      const duplicateUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (duplicateUser) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    }
    
    // Update user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Prepare update data
      const updateData: any = {
        name,
        email,
        role: role as UserRole,
      };

      // Update password only if provided
      if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password, 10);
      }

      // Update user
      const updatedUser = await tx.user.update({
        where: { id },
        data: updateData,
        include: {
          managedDepartment: {
            select: {
              id: true,
              name: true
            }
          },
          departmentMemberships: {
            include: {
              department: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // Handle department membership changes
      if (role === 'DEPT_ADMIN' || role === 'SUPERVISOR') {
        if (departmentId && departmentId !== existingUser.managedDepartment?.id) {
          // If user is becoming a department admin and departmentId is provided
          // This would require more complex logic to handle department admin changes
          // For now, we'll just update the user role
        }
      } else if (role === 'USER') {
        // Handle regular user department membership
        if (departmentId) {
          // Remove existing memberships
          await tx.departmentUser.deleteMany({
            where: { userId: id }
          });
          
          // Add new membership
          await tx.departmentUser.create({
            data: {
              userId: id,
              departmentId
            }
          });
        }
      }
      
      return updatedUser;
    });

    // Don't return password in response
    const { password: _, ...userWithoutPassword } = result;

    // Log user update
    if (session?.user) {
      auditUserAction(
        AuditAction.UPDATE,
        session.user.id,
        session.user.email!,
        session.user.role,
        'User',
        result.id,
        result.email,
        {
          updatedFields: Object.keys(body),
          newRole: result.role,
          departmentId,
        },
        request
      );
    }

    return NextResponse.json({ 
      message: 'User updated successfully',
      user: userWithoutPassword 
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

// DELETE - Delete user (Super Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    requireSuperAdmin(session);
    
    const { id } = await params;
    
    // Find user with related data
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        managedDepartment: true,
        departmentMemberships: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is managing a department
    if (user.managedDepartment) {
      return NextResponse.json(
        { error: 'Cannot delete user who is managing a department. Please assign a new admin first.' },
        { status: 400 }
      );
    }

    // Delete user (this will cascade delete department memberships)
    await prisma.user.delete({
      where: { id }
    });

    // Log user deletion
    if (session?.user) {
      auditUserAction(
        AuditAction.DELETE,
        session.user.id,
        session.user.email!,
        session.user.role,
        'User',
        user.id,
        user.email,
        {
          userRole: user.role,
          hadDepartmentMemberships: user.departmentMemberships.length > 0,
        },
        request
      );
    }

    return NextResponse.json({ 
      message: 'User deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}