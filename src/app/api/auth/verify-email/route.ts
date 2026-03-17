import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }
    
    // Find user with this token and ensure it hasn't expired
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: {
          gt: new Date()
        }
      }
    });
    
    if (!user) {
      // If no valid token found, redirect to signin with error
      return NextResponse.redirect(new URL(`${process.env.NEXTAUTH_URL}/auth/signin?error=Verification link invalid or expired`));
    }
    
    // Update user: verify and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null
      }
    });
    
    // Redirect to signin with success message
    return NextResponse.redirect(new URL(`${process.env.NEXTAUTH_URL}/auth/signin?verified=true`));
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(new URL(`${process.env.NEXTAUTH_URL}/auth/signin?error=An error occurred during verification`));
  }
}