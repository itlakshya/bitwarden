import { prisma } from './prisma';
import { AuditAction, UserRole } from '@prisma/client';
import { NextRequest } from 'next/server';

interface AuditLogData {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityName?: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  details?: Record<string, any>;
  request?: NextRequest;
}

/**
 * Create an audit log entry
 * This function is designed to be fire-and-forget to minimize performance impact
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    // Extract IP address and user agent from request if provided
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (data.request) {
      // Get IP address from various headers (considering proxies)
      ipAddress = 
        data.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        data.request.headers.get('x-real-ip') ||
        data.request.headers.get('cf-connecting-ip') ||
        data.request.headers.get('x-client-ip') ||
        undefined;

      userAgent = data.request.headers.get('user-agent') || undefined;
    }

    // Create audit log entry asynchronously without blocking
    setImmediate(async () => {
      try {
        await prisma.auditLog.create({
          data: {
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId,
            entityName: data.entityName,
            userId: data.userId,
            userEmail: data.userEmail,
            userRole: data.userRole,
            details: data.details || undefined,
            ipAddress,
            userAgent,
          },
        });
      } catch (error) {
        // Log error but don't throw to avoid disrupting main operation
        console.error('Failed to create audit log:', error);
      }
    });
  } catch (error) {
    // Log error but don't throw to avoid disrupting main operation
    console.error('Error in createAuditLog:', error);
  }
}

/**
 * Batch create multiple audit log entries for better performance
 */
export async function createAuditLogBatch(logs: AuditLogData[]): Promise<void> {
  if (logs.length === 0) return;

  try {
    setImmediate(async () => {
      try {
        const auditData = logs.map(data => {
          let ipAddress: string | undefined;
          let userAgent: string | undefined;

          if (data.request) {
            ipAddress = 
              data.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
              data.request.headers.get('x-real-ip') ||
              data.request.headers.get('cf-connecting-ip') ||
              data.request.headers.get('x-client-ip') ||
              undefined;

            userAgent = data.request.headers.get('user-agent') || undefined;
          }

          return {
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId,
            entityName: data.entityName,
            userId: data.userId,
            userEmail: data.userEmail,
            userRole: data.userRole,
            details: data.details || undefined,
            ipAddress,
            userAgent,
          };
        });

        await prisma.auditLog.createMany({
          data: auditData,
        });
      } catch (error) {
        console.error('Failed to create audit log batch:', error);
      }
    });
  } catch (error) {
    console.error('Error in createAuditLogBatch:', error);
  }
}

/**
 * Helper function to create audit log for user actions
 */
export function auditUserAction(
  action: AuditAction,
  userId: string,
  userEmail: string,
  userRole: UserRole,
  entityType: string,
  entityId?: string,
  entityName?: string,
  details?: Record<string, any>,
  request?: NextRequest
): void {
  createAuditLog({
    action,
    entityType,
    entityId,
    entityName,
    userId,
    userEmail,
    userRole,
    details,
    request,
  });
}

/**
 * Helper function to create audit log for authentication events
 */
export function auditAuthEvent(
  action: 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE',
  userId: string,
  userEmail: string,
  userRole: UserRole,
  details?: Record<string, any>,
  request?: NextRequest
): void {
  createAuditLog({
    action,
    entityType: 'User',
    entityId: userId,
    entityName: userEmail,
    userId,
    userEmail,
    userRole,
    details,
    request,
  });
}

/**
 * Helper function to create audit log for data operations
 */
export function auditDataOperation(
  action: AuditAction,
  entityType: string,
  entityId: string,
  entityName: string,
  userId: string,
  userEmail: string,
  userRole: UserRole,
  details?: Record<string, any>,
  request?: NextRequest
): void {
  createAuditLog({
    action,
    entityType,
    entityId,
    entityName,
    userId,
    userEmail,
    userRole,
    details,
    request,
  });
}

/**
 * Clean up old audit logs (for maintenance)
 * This should be run periodically via a cron job
 */
export async function cleanupOldAuditLogs(daysToKeep: number = 365): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`Cleaned up ${result.count} old audit log entries`);
    return result.count;
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    throw error;
  }
}

/**
 * Get audit log statistics.
 * When excludeSuperAdmin is true, only counts logs where the actor was not a super admin.
 */
export async function getAuditLogStats(excludeSuperAdmin = false) {
  const baseWhere = excludeSuperAdmin
    ? { userRole: { not: UserRole.SUPER_ADMIN } }
    : {};
  try {
    const [totalLogs, recentLogs, topActions, topUsers] = await Promise.all([
      // Total logs count
      prisma.auditLog.count({ where: baseWhere }),
      
      // Logs from last 24 hours
      prisma.auditLog.count({
        where: {
          ...baseWhere,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // Top 5 actions by frequency
      prisma.auditLog.groupBy({
        by: ['action'],
        where: baseWhere,
        _count: {
          action: true,
        },
        orderBy: {
          _count: {
            action: 'desc',
          },
        },
        take: 5,
      }),
      
      // Top 5 most active users
      prisma.auditLog.groupBy({
        by: ['userEmail'],
        where: baseWhere,
        _count: {
          userEmail: true,
        },
        orderBy: {
          _count: {
            userEmail: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    return {
      totalLogs,
      recentLogs,
      topActions: topActions.map(item => ({
        action: item.action,
        count: item._count.action,
      })),
      topUsers: topUsers.map(item => ({
        userEmail: item.userEmail,
        count: item._count.userEmail,
      })),
    };
  } catch (error) {
    console.error('Error getting audit log stats:', error);
    throw error;
  }
}