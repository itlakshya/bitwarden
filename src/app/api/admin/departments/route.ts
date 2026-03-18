import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-prisma";
import { validateEmailDomain, validatePassword } from "@/lib/middleware/auth";
import { UserRole, AuditAction } from "@prisma/client";
import bcrypt from "bcrypt";
import { sendEmail } from "@/lib/email";
import { auditUserAction } from "@/lib/audit";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-prisma";

// GET - List all departments (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    requireSuperAdmin(session);
    
    // Parse pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    const skip = (page - 1) * limit;
    const topLevelOnly = searchParams.get('topLevelOnly') === 'true';
    
    // Build where clause for search and filters
    const whereClause: any = {};
    if (topLevelOnly && search) {
      whereClause.AND = [
        { parentId: null },
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { admin: { name: { contains: search, mode: 'insensitive' } } },
            { admin: { email: { contains: search, mode: 'insensitive' } } }
          ]
        }
      ];
    } else if (topLevelOnly) {
      whereClause.parentId = null;
    } else if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { admin: { name: { contains: search, mode: 'insensitive' } } },
        { admin: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }
    
    // Build order by clause
    const orderBy: any = {};
    if (sortBy === 'adminName') {
      orderBy.admin = { name: sortOrder };
    } else if (sortBy === 'adminEmail') {
      orderBy.admin = { email: sortOrder };
    } else {
      orderBy[sortBy] = sortOrder;
    }
    
    // Get total count for pagination
    const totalCount = await prisma.department.count({
      where: whereClause
    });
    
    const departments = await prisma.department.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            isVerified: true
          }
        },
        parent: {
          select: {
            id: true,
            name: true
          }
        },
        children: {
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                isVerified: true
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
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    
    return NextResponse.json({ 
      departments,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    });
  } catch (error: any) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch departments' },
      { status: error.message?.includes('required') ? 403 : 500 }
    );
  }
}

// POST - Create new department with admin (Super Admin or Dept Admin creating sub under their dept)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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
    
    // Authorization: Super Admin can create any; Dept Admin only sub-department under their managed dept
    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'DEPT_ADMIN') {
      return NextResponse.json(
        { error: 'Permission denied. Only Super Admin or Department Admin can create departments.' },
        { status: 403 }
      );
    }
    if (session.user.role === 'DEPT_ADMIN') {
      if (!parentId) {
        return NextResponse.json(
          { error: 'Department admins can only create sub-departments under their department.' },
          { status: 403 }
        );
      }
      const parentDept = await prisma.department.findUnique({
        where: { id: parentId },
        select: { adminId: true },
      });
      if (!parentDept || parentDept.adminId !== session.user.id) {
        return NextResponse.json(
          { error: 'You can only create sub-departments under a department you manage.' },
          { status: 403 }
        );
      }
    }
    
    // Validation
    if (!name || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Department name, admin name, email, and password are required' },
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
    
    // Validate admin password
    const passwordValidation = validatePassword(adminPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Admin password validation failed', details: passwordValidation.errors },
        { status: 400 }
      );
    }
    
    // Check if department name already exists under the same parent (siblings only)
    // Top-level: unique among root departments. Sub-department: unique among same parent's children.
    const existingSibling = await prisma.department.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        parentId: parentId || null,
      },
    });
    if (existingSibling) {
      return NextResponse.json(
        { error: parentId ? 'A sub-department with this name already exists under this department.' : 'A department with this name already exists.' },
        { status: 409 }
      );
    }

    // Check if admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // If creating a sub-department, verify parent exists
    if (parentId) {
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
    
    // Hash admin password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Create department with admin in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create admin user with appropriate role
      // DEPT_ADMIN for departments, SUPERVISOR for sub-departments
      const adminRole = parentId ? UserRole.SUPERVISOR : UserRole.DEPT_ADMIN;
      
      const admin = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: adminRole,
          isVerified: true, // Admin-created users are auto-verified
        }
      });
      
      // Create department
      const department = await tx.department.create({
        data: {
          name,
          description,
          parentId: parentId || undefined,
          adminId: admin.id,
        },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isVerified: true
            }
          }
        }
      });
      
      return { department, admin };
    });
    
    // Send welcome email to department admin
    try {
      await sendEmail({
        to: adminEmail,
        subject: 'Welcome - Department Admin Access',
        html: `
          <h2>Welcome to Lakshya DataVault</h2>
          <p>Hello ${adminName},</p>
          <p>You have been assigned as the Department Administrator for <strong>${name}</strong>.</p>
          
          <p><strong>Your Login Details:</strong></p>
          <ul>
            <li>Email: ${adminEmail}</li>
            <li>Password: ${adminPassword}</li>
            <li>Role: Department Admin</li>
            <li>Department: ${name}</li>
          </ul>
          
          <p><strong>Your Responsibilities:</strong></p>
          <ul>
            <li>Manage groups within your department</li>
            <li>Create and configure custom fields for groups</li>
            <li>Invite and manage department users</li>
            <li>Assign users to specific groups</li>
          </ul>
          
          <p>You can sign in at: <a href="${process.env.BASE_URL}/auth/signin">${process.env.BASE_URL}/auth/signin</a></p>
          <p>Please change your password after your first login for security.</p>
          
          <br>
          <p>Best regards,<br>Lakshya Team</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail department creation if email fails
    }

    if (session?.user) {
      auditUserAction(
        AuditAction.CREATE,
        session.user.id,
        session.user.email!,
        session.user.role,
        'Department',
        result.department.id,
        result.department.name,
        { adminEmail: adminEmail, parentId: parentId || null },
        request
      );
    }
    
    return NextResponse.json({ 
      message: 'Department and admin created successfully',
      department: result.department
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating department:', error);
    const code = error?.code;
    const isUniqueViolation = code === 'P2002' || (error?.message && String(error.message).includes('Unique constraint failed'));
    const friendlyMessage = isUniqueViolation
      ? 'A department or sub-department with this name already exists. Please choose a different name.'
      : (error?.message && !String(error.message).includes('invocation') ? error.message : 'Unable to create department. Please try again.');
    return NextResponse.json(
      { error: friendlyMessage },
      { status: isUniqueViolation ? 409 : (error?.message?.includes('required') ? 403 : 500) }
    );
  }
}