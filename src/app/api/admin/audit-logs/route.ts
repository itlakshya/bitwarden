import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-prisma';
import { requireSuperAdmin } from '@/lib/auth-prisma';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AuditAction } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (
      session.user.role !== UserRole.SUPER_ADMIN &&
      session.user.role !== UserRole.DEPT_ADMIN &&
      session.user.role !== UserRole.SUPERVISOR
    ) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // Filter parameters
    const action = searchParams.get('action') as AuditAction | null;
    const entityType = searchParams.get('entityType');
    const userId = searchParams.get('userId');
    const userEmail = searchParams.get('userEmail');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search'); // General search term

    // Sort parameters
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // Build where clause
    const whereClause: any = {};

    if (action) {
      whereClause.action = action;
    }

    if (entityType) {
      whereClause.entityType = entityType;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    if (userEmail) {
      whereClause.userEmail = {
        contains: userEmail,
        mode: 'insensitive',
      };
    }

    // Date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999); // End of day
        whereClause.createdAt.lte = endDateTime;
      }
    }

    // General search across multiple fields
    if (search) {
      whereClause.OR = [
        {
          userEmail: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          entityName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          entityType: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // For non–super admins, exclude audit entries performed by super admins
    if (session.user.role !== UserRole.SUPER_ADMIN) {
      whereClause.userRole = { not: UserRole.SUPER_ADMIN };
    }

    // Build order by clause
    const orderBy: any = {};
    if (sortBy === 'userEmail') {
      orderBy.userEmail = sortOrder;
    } else if (sortBy === 'action') {
      orderBy.action = sortOrder;
    } else if (sortBy === 'entityType') {
      orderBy.entityType = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
    }

    // Get total count for pagination
    const totalCount = await prisma.auditLog.count({
      where: whereClause,
    });

    // Get audit logs with pagination
    const auditLogs = await prisma.auditLog.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy,
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
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      auditLogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPreviousPage,
      },
    });

  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch audit logs' },
      { status: error.status || 500 }
    );
  }
}

// DELETE - Clear all audit logs (Super Admin only, cannot be undone)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    requireSuperAdmin(session);

    const result = await prisma.auditLog.deleteMany({});

    return NextResponse.json({
      message: 'All audit logs have been cleared.',
      deletedCount: result.count,
    });
  } catch (error: any) {
    console.error('Error clearing audit logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear audit logs' },
      { status: error.status || 500 }
    );
  }
}