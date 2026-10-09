import { redirect } from 'next/navigation';
import { currentUser } from '@/server/auth/session';
import { db } from '@/server/db/client';
export default async function Home() {
  const user = await currentUser();
  if (!user) redirect('/login');
  const member = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  });
  redirect(member ? `/workspaces/${member.workspaceId}` : '/workspaces');
}
