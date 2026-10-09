import { randomUUID } from 'node:crypto';
import { db } from '@/server/db/client';
import { assert } from '@/server/security/errors';
import { sourceConfigSchema } from '@/entities/ui-node/types';
export async function membership(
  userId: string,
  workspaceId: string,
  write = false,
  owner = false,
) {
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  assert(member, 404, 'NOT_FOUND', 'Workspace not found.');
  assert(!write || member.role !== 'VIEWER', 403, 'FORBIDDEN', 'An editor role is required.');
  assert(!owner || member.role === 'OWNER', 403, 'FORBIDDEN', 'Only workspace owners can do this.');
  return member;
}
export async function createWorkspace(userId: string, name: string) {
  return db.workspace.create({
    data: {
      name,
      slug: `workspace-${randomUUID()}`,
      ownerId: userId,
      members: { create: { userId, role: 'OWNER' } },
      sources: {
        create: [
          {
            name: 'Sample customers',
            kind: 'mock',
            config: sourceConfigSchema.parse({ provider: 'customers' }),
          },
          {
            name: 'JSONPlaceholder',
            kind: 'rest',
            config: sourceConfigSchema.parse({ provider: 'jsonplaceholder' }),
          },
        ],
      },
    },
  });
}
export async function accessApp(userId: string, appId: string, write = false) {
  const app = await db.application.findUnique({ where: { id: appId } });
  assert(app, 404, 'NOT_FOUND', 'Application not found.');
  const member = await membership(userId, app.workspaceId, write);
  return { app, member };
}
