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

// GET - List all users (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    requireSuperAdmin(session);
    
    // Parse pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    const skip = (page - 1) * limit;
    
    // Build where clause for search and filters
    const whereClause: any = {};
    const conditions: any[] = [];
    
    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      });
    }
    
    if (roleFilter) {
      conditions.push({ role: roleFilter });
    }
    
    if (conditions.length > 0) {
      whereClause.AND = conditions;
    }
    
    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;
    
    // Get total count for pagination
    const totalCount = await prisma.user.count({
      where: whereClause
    });
    
    const users = await prisma.user.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
        managedDepartment: {
          select: {
            id: true,
            name: true
          }
        },
        departmentMemberships: {
          select: {
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
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    
    return NextResponse.json({ 
      users,
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
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: error.message?.includes('required') ? 403 : 500 }
    );
  }
}

// POST - Create new user (Super Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    requireSuperAdmin(session);
    
    const body = await request.json();
    const { name, email, role, password, departmentId } = body;
    
    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
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
    
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Password validation failed', details: passwordValidation.errors },
        { status: 400 }
      );
    }
    
    // Validate role
    const validRoles = Object.values(UserRole);
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // If creating a department admin, verify department exists
    if (role === UserRole.DEPT_ADMIN && departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId }
      });
      
      if (!department) {
        return NextResponse.json(
          { error: 'Department not found' },
          { status: 404 }
        );
      }
      
      // Check if department already has an admin
      const existingAdmin = await prisma.department.findFirst({
        where: { adminId: { not: null as any } }
      });
      
      if (existingAdmin) {
        return NextResponse.json(
          { error: 'Department already has an admin' },
          { status: 409 }
        );
      }
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || UserRole.USER,
        isVerified: true, // Admin-created users are auto-verified
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true
      }
    });
    
    // If department admin, update department
    if (role === UserRole.DEPT_ADMIN && departmentId) {
      await prisma.department.update({
        where: { id: departmentId },
        data: { adminId: user.id }
      });
    }
    
    // Send welcome email
    try {
      await sendEmail({
        to: email,
        subject: 'Welcome to Lakshya Copycat',
        html: `
          <h2>Welcome to Lakshya Copycat!</h2>
          <p>Hello ${name},</p>
          <p>Your account has been created by a system administrator.</p>
          <p><strong>Login Details:</strong></p>
          <ul>
            <li>Email: ${email}</li>
            <li>Role: ${role || 'User'}</li>
          </ul>
          <p>You can now sign in at: <a href="${process.env.BASE_URL}/auth/signin">${process.env.BASE_URL}/auth/signin</a></p>
          <p>Please change your password after your first login.</p>
          <br>
          <p>Best regards,<br>Lakshya Team</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail user creation if email fails
    }

    // Log user creation
    if (session?.user) {
      auditUserAction(
        AuditAction.CREATE,
        session.user.id,
        session.user.email!,
        session.user.role,
        'User',
        user.id,
        user.email,
        {
          userRole: user.role,
          departmentId,
          adminCreated: true,
        },
        request
      );
    }
    
    return NextResponse.json({ 
      message: 'User created successfully',
      user 
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: error.message?.includes('required') ? 403 : 500 }
    );
  }
}