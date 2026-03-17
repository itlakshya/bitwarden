import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-prisma';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  // Redirect to signin if not authenticated
  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Normal dashboard: show for everyone who signed in from normal login.
  // Admin roles who signed in from /auth/signin stay here; only admin login gets admin panel.
  return <>{children}</>;
}