import { currentUser } from '@/server/auth/session';
import { redirect } from 'next/navigation';
import { Dashboard } from '@/features/workspaces/dashboard';
export default async function Workspaces() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return <Dashboard user={user} />;
}
