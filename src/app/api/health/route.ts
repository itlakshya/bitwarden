import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Get basic system stats
    const stats = await prisma.$transaction([
      prisma.user.count(),
      prisma.department.count(),
      prisma.group.count(),
      prisma.groupItem.count()
    ]);
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      stats: {
        users: stats[0],
        departments: stats[1],
        groups: stats[2],
        items: stats[3]
      },
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed'
      },
      { status: 503 }
    );
  }
}