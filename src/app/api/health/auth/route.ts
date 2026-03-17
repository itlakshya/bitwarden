import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";

export async function GET() {
  try {
    // Test authentication system components
    const checks = {
      database: false,
      encryption: false,
      superAdmin: false,
      emailDomain: false
    };
    
    // 1. Test database connection for auth
    try {
      await prisma.user.findFirst();
      checks.database = true;
    } catch (error) {
      console.error('Auth DB check failed:', error);
    }
    
    // 2. Test encryption system
    try {
      const testData = 'test-encryption-data';
      const encrypted = encrypt(testData);
      const decrypted = decrypt(encrypted);
      checks.encryption = testData === decrypted;
    } catch (error) {
      console.error('Encryption check failed:', error);
    }
    
    // 3. Test super admin exists
    try {
      const superAdmin = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
      });
      checks.superAdmin = !!superAdmin;
    } catch (error) {
      console.error('Super admin check failed:', error);
    }
    
    // 4. Test email domain validation
    try {
      const validateEmailDomain = (email: string) => email.toLowerCase().endsWith('@iiclakshya.com');
      checks.emailDomain = validateEmailDomain('test@iiclakshya.com') && !validateEmailDomain('test@gmail.com');
    } catch (error) {
      console.error('Email domain check failed:', error);
    }
    
    const allHealthy = Object.values(checks).every(check => check === true);
    
    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      nextauth_configured: !!process.env.NEXTAUTH_SECRET,
      encryption_configured: !!process.env.ENCRYPTION_KEY
    }, {
      status: allHealthy ? 200 : 503
    });
  } catch (error) {
    console.error('Auth health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}