import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/middleware/auth";

// Common include for groups
const groupInclude = {
  department: {
    select: {
      id: true,
      name: true,
      parent: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  fieldDefinitions: {
    select: {
      id: true,
      name: true,
      type: true,
      required: true,
      encrypted: true,
    },
    orderBy: {
      order: "asc" as const,
    },
  },
  _count: {
    select: {
      items: true,
      userAccess: true,
    },
  },
};

// GET - Get groups accessible to the current user
export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const userRole = session.user.role;
    const departmentId = session.user.departmentId;

    async function getDescendantDepartmentIds(rootIds: string[]): Promise<string[]> {
      const result = new Set<string>();
      const queue: string[] = [];
      for (const id of rootIds) {
        if (id) {
          result.add(id);
          queue.push(id);
        }
      }
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = await prisma.department.findMany({
          where: { parentId: currentId },
          select: { id: true },
        });
        for (const child of children) {
          if (!result.has(child.id)) {
            result.add(child.id);
            queue.push(child.id);
          }
        }
      }
      return Array.from(result);
    }

    // SUPER_ADMIN: all groups with full manage rights
    if (userRole === "SUPER_ADMIN") {
      const groups = await prisma.group.findMany({
        include: groupInclude,
        orderBy: { name: "asc" },
      });
      const withFlag = groups.map((g) => ({ ...g, canManage: true }));
      return NextResponse.json({ groups: withFlag });
    }

    // Compute groups user can manage (CRUD)
    let managedDeptIds: string[] = [];

    if (userRole === "DEPT_ADMIN" && departmentId) {
      // Dept admin: own department + all descendant sub-departments
      managedDeptIds = await getDescendantDepartmentIds([departmentId]);
    } else if (userRole === "SUPERVISOR" && departmentId) {
      // Supervisor: only their own sub-department
      managedDeptIds = [departmentId];
    }

    const groupsManaged =
      managedDeptIds.length > 0
        ? await prisma.group.findMany({
            where: { departmentId: { in: managedDeptIds } },
            include: groupInclude,
            orderBy: { name: "asc" },
          })
        : [];

    // Groups from department-level grants
    const deptGrants = await prisma.departmentAccessGrant.findMany({
      where: { userId },
      select: { departmentId: true },
    });
    const grantDeptIds = Array.from(
      new Set(deptGrants.map((g) => g.departmentId))
    );

    const grantDeptTreeIds =
      grantDeptIds.length > 0 ? await getDescendantDepartmentIds(grantDeptIds) : [];

    const groupsViaDeptGrants =
      grantDeptTreeIds.length > 0
        ? await prisma.group.findMany({
            where: { departmentId: { in: grantDeptTreeIds } },
            include: groupInclude,
            orderBy: { name: "asc" },
          })
        : [];

    // Groups from explicit group access
    const groupsViaGroupAccess = await prisma.group.findMany({
      where: {
        userAccess: {
          some: {
            departmentUser: {
              userId,
            },
          },
        },
      },
      include: groupInclude,
      orderBy: { name: "asc" },
    });

    // Merge and dedupe by id
    const allGroupsMap = new Map<string, any>();
    const addWithSource = (arr: any[], source: "managed" | "granted" | "explicit") => {
      for (const g of arr) {
        const existing = allGroupsMap.get(g.id);
        if (!existing) {
          allGroupsMap.set(g.id, { ...g, __sources: new Set([source]) });
        } else {
          existing.__sources.add(source);
        }
      }
    };

    addWithSource(groupsManaged, "managed");
    addWithSource(groupsViaDeptGrants, "granted");
    addWithSource(groupsViaGroupAccess, "explicit");

    const merged = Array.from(allGroupsMap.values());

    const withFlag = merged
      .map((g) => {
        const sources: Set<string> = g.__sources;
        const canManage =
          sources.has("managed") &&
          (userRole === "DEPT_ADMIN" || userRole === "SUPERVISOR");
        // Clean up internal field
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { __sources, ...rest } = g;
        return { ...rest, canManage };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ groups: withFlag });
  } catch (error: any) {
    console.error("Error fetching user groups:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch groups" },
      { status: error.message?.includes("required") ? 403 : 500 }
    );
  }
}