import { currentUser } from '@/server/auth/session';
import { accessApp } from '@/server/services/workspaces';
import { redirect, notFound } from 'next/navigation';
import { RuntimePage } from '@/features/runtime/runtime-page';
import { z } from 'zod';
export default async function PublishedPage({ params }: { params: Promise<{ appId: string }> }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const { appId } = await params;
  if (!z.uuid().safeParse(appId).success) notFound();
  try {
    await accessApp(user.id, appId);
  } catch {
    notFound();
  }
  return <RuntimePage appId={appId} />;
}
