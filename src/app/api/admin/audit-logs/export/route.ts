import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-prisma';
import { requireSuperAdmin } from '@/lib/auth-prisma';
import { prisma } from '@/lib/prisma';
import { auditUserAction } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

// Helper function to escape CSV values
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, newline, or quote, wrap it in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

// Helper function to format details object for CSV
function formatDetailsForCsv(details: any): string {
  if (!details || typeof details !== 'object') {
    return '';
  }
  
  try {
    // Convert object to readable string format
    const formatted = Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
    return formatted;
  } catch {
    return JSON.stringify(details);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    requireSuperAdmin(session);

    const { searchParams } = new URL(request.url);
    
    // Filter parameters (same as main audit logs endpoint)
    const action = searchParams.get('action') as AuditAction | null;
    const entityType = searchParams.get('entityType');
    const userId = searchParams.get('userId');
    const userEmail = searchParams.get('userEmail');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    // Export limit (max 10,000 records for performance)
    const maxRecords = 10000;

    // Build where clause (same logic as main endpoint)
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

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endDateTime;
      }
    }

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

    // Get audit logs for export
    const auditLogs = await prisma.auditLog.findMany({
      where: whereClause,
      take: maxRecords,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    // Log the export action
    if (session?.user) {
      auditUserAction(
        AuditAction.EXPORT_DATA,
        session.user.id,
        session.user.email!,
        session.user.role,
        'AuditLog',
        undefined,
        'Audit Logs Export',
        {
          recordCount: auditLogs.length,
          filters: {
            action,
            entityType,
            userId,
            userEmail,
            startDate,
            endDate,
            search,
          },
        },
        request
      );
    }

    // CSV Headers
    const headers = [
      'Date & Time',
      'Action',
      'Entity Type',
      'Entity ID',
      'Entity Name',
      'User Email',
      'User Name',
      'User Role',
      'IP Address',
      'User Agent',
      'Details',
    ];

    // Generate CSV content
    const csvRows = [
      headers.join(','), // Header row
      ...auditLogs.map(log => [
        escapeCsvValue(log.createdAt.toISOString()),
        escapeCsvValue(log.action),
        escapeCsvValue(log.entityType),
        escapeCsvValue(log.entityId),
        escapeCsvValue(log.entityName),
        escapeCsvValue(log.userEmail),
        escapeCsvValue(log.user?.name),
        escapeCsvValue(log.userRole),
        escapeCsvValue(log.ipAddress),
        escapeCsvValue(log.userAgent),
        escapeCsvValue(formatDetailsForCsv(log.details)),
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `audit-logs-${timestamp}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export audit logs' },
      { status: error.status || 500 }
    );
  }
}