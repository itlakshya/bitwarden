import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/middleware/auth";
import { UserRole } from "@prisma/client";

export async function GET() {
  try {
    const session = await requireAuth();
    
    // Only admins and supervisors can access stats
    if (
      session.user.role !== UserRole.SUPER_ADMIN &&
      session.user.role !== UserRole.DEPT_ADMIN &&
      session.user.role !== UserRole.SUPERVISOR
    ) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    let stats;
    
    if (session.user.role === UserRole.SUPER_ADMIN) {
      // Super admin sees all stats; department count = top-level departments only
      stats = await prisma.$transaction([
        prisma.department.count({ where: { parentId: null } }),
        prisma.user.count(),
        prisma.group.count(),
        prisma.groupItem.count()
      ]);
      
      return NextResponse.json({
        totalDepartments: stats[0],
        totalUsers: stats[1],
        totalGroups: stats[2],
        totalItems: stats[3]
      });
    } else {
      // Department admins and supervisors see only their department stats
      const departmentId = session.user.departmentId;
      
      if (!departmentId) {
        return NextResponse.json({
          totalDepartments: 0,
          totalUsers: 0,
          totalGroups: 0,
          totalItems: 0
        });
      }
      
      stats = await prisma.$transaction([
        // Department count = 1 (their department only; exclude sub-departments)
        prisma.department.count({
          where: { id: departmentId }
        }),
        prisma.departmentUser.count({
          where: { departmentId }
        }),
        prisma.group.count({
          where: { departmentId }
        }),
        prisma.groupItem.count({
          where: {
            group: {
              departmentId
            }
          }
        })
      ]);
      
      return NextResponse.json({
        totalDepartments: stats[0],
        totalUsers: stats[1],
        totalGroups: stats[2],
        totalItems: stats[3]
      });
    }
    
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: error.message?.includes('required') ? 403 : 500 }
    );
  }
}