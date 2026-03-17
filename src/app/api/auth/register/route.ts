import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Public registration is disabled
  // Users can only be created by super administrators
  return NextResponse.json(
    { 
      error: 'Public registration is disabled. Please contact your administrator for account creation.',
      code: 'REGISTRATION_DISABLED'
    },
    { status: 403 }
  );
} 