import { db as prisma } from '../src/server/db/client';
import { hashPassword } from '../src/server/auth/session';
import { createWorkspace } from '../src/server/services/workspaces';
import { createApplication, publishApplication } from '../src/server/services/applications';
async function seed() {
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;
  if (!email || !password || password.length < 8)
    throw new Error(
      'Set SEED_EMAIL and SEED_PASSWORD (at least 8 characters). The UI demo button needs no seed.',
    );
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;
  const user = await prisma.user.create({
    data: { email, name: 'Workspace owner', passwordHash: await hashPassword(password) },
  });
  const workspace = await createWorkspace(user.id, 'My workspace');
  const app = await createApplication(workspace.id, user.id, 'Customer management', true);
  await publishApplication(app.id);
}
seed()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
