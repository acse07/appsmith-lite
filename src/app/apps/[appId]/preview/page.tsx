import { currentUser } from '@/server/auth/session';
import { accessApp } from '@/server/services/workspaces';
import { redirect, notFound } from 'next/navigation';
import { RuntimePage } from '@/features/runtime/runtime-page';
import { z } from 'zod';
export default async function PreviewPage({ params }: { params: Promise<{ appId: string }> }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const { appId } = await params;
  if (!z.uuid().safeParse(appId).success) notFound();
  try {
    await accessApp(user.id, appId, true);
  } catch {
    notFound();
  }
  return <RuntimePage appId={appId} preview />;
}
