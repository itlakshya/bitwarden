import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-prisma';
import { redirect } from 'next/navigation';
import NewDashboardClient from './NewDashboardClient';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  // Redirect to signin if not authenticated
  if (!session?.user) {
    redirect('/auth/signin');
  }
  
  return <NewDashboardClient />;
}
