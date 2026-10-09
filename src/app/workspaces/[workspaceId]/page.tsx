import { currentUser } from '@/server/auth/session';
import { membership } from '@/server/services/workspaces';
import { redirect, notFound } from 'next/navigation';
import { Dashboard } from '@/features/workspaces/dashboard';
import { z } from 'zod';
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const { workspaceId } = await params;
  if (!z.uuid().safeParse(workspaceId).success) notFound();
  try {
    await membership(user.id, workspaceId);
  } catch {
    notFound();
  }
  return <Dashboard user={user} workspaceId={workspaceId} />;
}
