import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth-prisma";
import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function getAuthSession() {
  return await getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getAuthSession();
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireAuth();
  if (session.user.role !== UserRole.SUPER_ADMIN) {
    throw new Error('Super admin access required');
  }
  return session;
}

export async function requireDepartmentAdmin() {
  const session = await requireAuth();
  if (session.user.role !== UserRole.DEPT_ADMIN && session.user.role !== UserRole.SUPER_ADMIN) {
    throw new Error('Department admin access required');
  }
  return session;
}

export async function requireDepartmentAccess(departmentId: string) {
  const session = await requireAuth();
  
  // Super admin has access to all departments
  if (session.user.role === UserRole.SUPER_ADMIN) {
    return session;
  }
  
  // Department admin can only access their own department
  if (session.user.role === UserRole.DEPT_ADMIN && session.user.departmentId === departmentId) {
    return session;
  }
  
  // Regular users need to be members of the department
  // This will be checked against department memberships
  
  throw new Error('Access denied to this department');
}

// API Route wrapper for authentication
export function withAuth(handler: Function, requiredRole?: UserRole) {
  return async (req: NextRequest) => {
    try {
      const session = await getAuthSession();
      
      if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      
      if (requiredRole) {
        if (requiredRole === UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUPER_ADMIN) {
          return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
        }
        
        if (requiredRole === UserRole.DEPT_ADMIN && 
            session.user.role !== UserRole.DEPT_ADMIN && 
            session.user.role !== UserRole.SUPER_ADMIN) {
          return NextResponse.json({ error: 'Department admin access required' }, { status: 403 });
        }
      }
      
      return handler(req, session);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
  };
}

// Email domain validation
export function validateEmailDomain(email: string): boolean {
  return email.toLowerCase().endsWith('@iiclakshya.com');
}

// Password validation
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}