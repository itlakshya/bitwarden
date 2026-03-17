import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { UserRole, AuditAction } from "@prisma/client";
import bcrypt from "bcrypt";
import { verifyRecaptchaToken } from "./recaptcha";
import { auditAuthEvent } from "./audit";

// Email domain validation
const ALLOWED_EMAIL_DOMAIN = "@iiclakshya.com";

function validateEmailDomain(email: string): boolean {
  return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        recaptchaToken: { label: "reCAPTCHA Token", type: "text" },
        loginSource: { label: "Login Source", type: "text" } // 'admin' | 'normal' - where user signed in
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Validate email domain
        if (!validateEmailDomain(credentials.email)) {
          throw new Error('Access restricted to @iiclakshya.com email addresses only.');
        }

        // Verify reCAPTCHA
        try {
          await verifyRecaptchaToken(credentials.recaptchaToken || '');
        } catch (error) {
          throw new Error('Security verification failed. Please try again.');
        }

        try {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              managedDepartment: true,
              departmentMemberships: {
                include: {
                  department: true,
                  groupAccess: {
                    include: {
                      group: true
                    }
                  }
                }
              }
            }
          });
          
          if (!user) {
            return null;
          }

          // Check if user is verified
          if (!user.isVerified) {
            throw new Error('Please verify your email before signing in.');
          }

          // Check if password matches
          const isMatch = await bcrypt.compare(credentials.password, user.password);
          
          if (!isMatch) {
            return null;
          }

          // Log successful login
          auditAuthEvent(
            AuditAction.LOGIN,
            user.id,
            user.email,
            user.role,
            {
              loginMethod: 'credentials',
              success: true,
            }
          );

          // loginSource: where the user signed in - admin login page vs normal signin
          const loginSource = (credentials.loginSource === 'admin' ? 'admin' : 'normal') as 'admin' | 'normal';

          // Return user data for session
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            departmentId: user.managedDepartment?.id || user.departmentMemberships[0]?.departmentId || null,
            isDepartmentAdmin: user.role === UserRole.DEPT_ADMIN,
            isSupervisor: user.role === UserRole.SUPERVISOR,
            isSuperAdmin: user.role === UserRole.SUPER_ADMIN,
            loginSource,
          };
        } catch (error: any) {
          console.error("Authentication error:", error);
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.departmentId = user.departmentId;
        token.isDepartmentAdmin = user.isDepartmentAdmin;
        token.isSupervisor = user.isSupervisor;
        token.isSuperAdmin = user.isSuperAdmin;
        token.loginSource = user.loginSource;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.departmentId = token.departmentId as string | null;
        session.user.isDepartmentAdmin = token.isDepartmentAdmin as boolean;
        session.user.isSupervisor = token.isSupervisor as boolean;
        session.user.isSuperAdmin = token.isSuperAdmin as boolean;
        session.user.loginSource = token.loginSource as 'admin' | 'normal';
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET || "your-default-secret-do-not-use-in-production",
};

// Extend next-auth types for our enhanced session
declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
    departmentId?: string | null;
    isDepartmentAdmin?: boolean;
    isSupervisor?: boolean;
    isSuperAdmin?: boolean;
    loginSource?: 'admin' | 'normal';
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      departmentId?: string | null;
      isDepartmentAdmin?: boolean;
      isSupervisor?: boolean;
      isSuperAdmin?: boolean;
      loginSource?: 'admin' | 'normal';
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    departmentId?: string | null;
    isDepartmentAdmin?: boolean;
    isSupervisor?: boolean;
    isSuperAdmin?: boolean;
    loginSource?: 'admin' | 'normal';
  }
}

// Helper functions for role-based access control
export function requireSuperAdmin(session: any) {
  if (!session?.user?.isSuperAdmin) {
    throw new Error('Super admin access required');
  }
}

export function requireDepartmentAdmin(session: any) {
  if (!session?.user?.isDepartmentAdmin && !session?.user?.isSupervisor && !session?.user?.isSuperAdmin) {
    throw new Error('Department admin access required');
  }
}

export function requireAuthenticated(session: any) {
  if (!session?.user) {
    throw new Error('Authentication required');
  }
}

export function canAccessDepartment(session: any, departmentId: string) {
  if (session?.user?.isSuperAdmin) return true;
  if (session?.user?.isDepartmentAdmin && session?.user?.departmentId === departmentId) return true;
  return false;
}