import { prisma } from './prisma';

/**
 * Returns true if groupDepartmentId is the same as or a descendant of adminManagedDepartmentId.
 * Used so a department admin (branch admin) has access to groups in their department and all sub-departments.
 */
export async function isDepartmentUnderAdmin(
  groupDepartmentId: string,
  adminManagedDepartmentId: string
): Promise<boolean> {
  if (groupDepartmentId === adminManagedDepartmentId) return true;
  let current = await prisma.department.findUnique({
    where: { id: groupDepartmentId },
    select: { parentId: true },
  });
  while (current?.parentId) {
    if (current.parentId === adminManagedDepartmentId) return true;
    current = await prisma.department.findUnique({
      where: { id: current.parentId },
      select: { parentId: true },
    });
  }
  return false;
}

/**
 * Returns true if the user has been granted access to this department
 * (direct grant or grant on any ancestor). Used for branch + sub-branch rules:
 * - Branch grant => access to branch and all sub-branches
 * - Sub-branch grant => access only to that sub-branch
 */
export async function hasDepartmentAccess(userId: string, departmentId: string): Promise<boolean> {
  const departmentIdsWithAccess: string[] = [departmentId];
  let current = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { parentId: true },
  });
  while (current?.parentId) {
    departmentIdsWithAccess.push(current.parentId);
    current = await prisma.department.findUnique({
      where: { id: current.parentId },
      select: { parentId: true },
    });
  }

  const grant = await prisma.departmentAccessGrant.findFirst({
    where: {
      userId,
      departmentId: { in: departmentIdsWithAccess },
    },
  });
  return !!grant;
}
