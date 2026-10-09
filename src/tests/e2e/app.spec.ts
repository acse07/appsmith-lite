import { test, expect, type APIRequestContext } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import type { AppData } from '@/entities/ui-node/types';
const accounts: string[] = [];
async function demo(request: APIRequestContext) {
  const response = await request.post('/api/auth/demo', { data: {} });
  expect(response.ok()).toBeTruthy();
  const { data } = (await response.json()) as { data: { workspaceId: string } };
  const me = await request.get('/api/auth/me');
  const user = (await me.json()).data as { id: string; email: string };
  accounts.push(user.id);
  return { ...data, user };
}
async function app(request: APIRequestContext, workspaceId: string) {
  const result = await request.get(`/api/workspaces/${workspaceId}/apps`);
  const apps = (await result.json()).data as { id: string; name: string }[];
  const selected = apps.find((a) => a.name === 'Customer management')!;
  const response = await request.get(`/api/apps/${selected.id}`);
  return (await response.json()).data as AppData;
}
test.afterAll(async () => {
  const prisma = new PrismaClient({
    datasourceUrl:
      process.env.DATABASE_URL ??
      'postgresql://appsmith:appsmith_local@127.0.0.1:54329/appsmith?schema=public',
  });
  try {
    const workspaces = await prisma.workspace.findMany({
      where: { ownerId: { in: accounts } },
      select: { id: true },
    });
    const ids = workspaces.map((w) => w.id);
    await prisma.application.deleteMany({ where: { workspaceId: { in: ids } } });
    await prisma.workspace.deleteMany({ where: { id: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: accounts } } });
  } finally {
    await prisma.$disconnect();
  }
});
test('create workspace and app, edit, undo, reload and preserve document', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Explore the demo workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Your ideas. Ready to build.' })).toBeVisible();
  const me = await page.request.get('/api/auth/me');
  accounts.push((await me.json()).data.id);
  await page.getByRole('button', { name: 'New workspace', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('QA workspace');
  await page.getByRole('dialog').getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.locator('.workspace-switch strong')).toHaveText('QA workspace');
  await page.getByRole('button', { name: 'Create application', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Inventory tracker');
  await page.getByRole('dialog').getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByTestId('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Heading', exact: true }).click();
  await page.locator('.inspector').getByLabel('Text', { exact: true }).fill('Our inventory');
  await expect(
    page.getByTestId('canvas').getByRole('heading', { name: 'Our inventory' }),
  ).toBeVisible();
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    page.getByTestId('canvas').getByRole('heading', { name: 'Your next great idea' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByTestId('canvas').getByRole('heading', { name: 'Our inventory' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Page actions' }).click();
  await page.getByRole('menuitem', { name: 'Add page' }).click();
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Orders');
  await page.getByRole('button', { name: 'Create page', exact: true }).click();
  await expect(page.getByLabel('Current page')).toContainText('Orders');
  await expect(page.getByText('Your canvas, your possibilities.')).toBeVisible();
});
test('preview runs actions, publish freezes draft and runtime shows data', async ({ page }) => {
  const { workspaceId } = await demo(page.request);
  const application = await app(page.request, workspaceId);
  await page.goto(`/apps/${application.id}/edit`);
  await expect(page.getByTestId('canvas').getByText('Olivia Rhye')).toBeVisible();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.palette')).toHaveCount(0);
  await expect(page.locator('.inspector')).toHaveCount(0);
  await page.getByRole('button', { name: 'Refresh customers', exact: true }).click();
  await expect(page.getByText('Olivia Rhye')).toBeVisible();
  await page.getByRole('button', { name: 'Back to editor' }).click();
  await page.getByRole('heading', { name: 'Customer overview' }).click();
  await page
    .locator('.inspector')
    .getByLabel('Text', { exact: true })
    .fill('Published customer portal');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('button', { name: 'Publish application', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your app is live.' })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.locator('.inspector').getByLabel('Text', { exact: true }).fill('Unpublished changes');
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible();
  await page.goto(`/run/${application.id}`);
  await expect(page.getByRole('heading', { name: 'Published customer portal' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Unpublished changes' })).toHaveCount(0);
  await expect(page.getByText('Olivia Rhye')).toBeVisible();
  await expect(page.locator('.editor-header')).toHaveCount(0);
});
test('drag palette components into nested containers and reorder layers', async ({ page }) => {
  const { workspaceId } = await demo(page.request);
  const result = await page.request.post(`/api/workspaces/${workspaceId}/apps`, {
    data: { name: 'Drag test' },
  });
  const appId = (await result.json()).data.id;
  await page.goto(`/apps/${appId}/edit`);
  await expect(page.getByTestId('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Container', exact: true }).click();
  const container = page.locator('.canvas-node.container.node-selected');
  await page.getByRole('button', { name: 'Heading', exact: true }).scrollIntoViewIfNeeded();
  const source = await page.getByRole('button', { name: 'Heading', exact: true }).boundingBox();
  const target = await container.boundingBox();
  expect(source && target).toBeTruthy();
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
  await page.mouse.down();
  await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, {
    steps: 20,
  });
  await page.mouse.up();
  await expect(
    page.getByTestId('canvas').getByRole('heading', { name: 'Your next great idea' }),
  ).toBeVisible();
  const loaded = (await (await page.request.get(`/api/apps/${appId}`)).json()).data as AppData;
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible();
  const updated = (await (await page.request.get(`/api/apps/${appId}`)).json()).data as AppData;
  const doc = updated.pages[0].document;
  const nested = Object.values(doc.nodes).find((n) => n.type === 'Container' && n.id !== 'root')!;
  expect(nested.children.length).toBe(1);
  expect(loaded.pages.length).toBe(1);
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.locator('.layer-select').filter({ hasText: 'Your next great idea' }).click();
  await page.getByRole('button', { name: 'Duplicate component' }).click();
  await expect(
    page.getByTestId('canvas').getByRole('heading', { name: 'Your next great idea' }),
  ).toHaveCount(2);
});
test('API rejects cross-workspace access and stale revisions; snapshots remain immutable', async ({
  playwright,
}) => {
  const first = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3000' });
  const second = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3000' });
  const a = await demo(first);
  await demo(second);
  const application = await app(first, a.workspaceId);
  const p = application.pages[0];
  expect((await second.get(`/api/apps/${application.id}`)).status()).toBe(404);
  expect(
    (
      await second.put(`/api/apps/${application.id}/pages/${p.id}`, {
        data: { document: p.document, expectedRevision: p.revision },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await second.post(
        `/api/apps/${application.id}/queries/${application.queries[0].id}/execute`,
        { data: {} },
      )
    ).status(),
  ).toBe(404);
  const write = await first.put(`/api/apps/${application.id}/pages/${p.id}`, {
    data: { document: p.document, expectedRevision: p.revision },
  });
  expect(write.ok()).toBeTruthy();
  expect((await write.json()).data.revision).toBe(p.revision + 1);
  const stale = await first.put(`/api/apps/${application.id}/pages/${p.id}`, {
    data: { document: p.document, expectedRevision: p.revision },
  });
  expect(stale.status()).toBe(409);
  expect((await stale.json()).error.code).toBe('REVISION_CONFLICT');
  const original = await first.get(
    `/api/apps/${application.id}/versions/${application.publishedVersionId}`,
  );
  const snapshot = (await original.json()).data.snapshot;
  await first.post(`/api/apps/${application.id}/publish`, { data: {} });
  const old = await first.get(
    `/api/apps/${application.id}/versions/${application.publishedVersionId}`,
  );
  expect((await old.json()).data.snapshot).toEqual(snapshot);
  const broken = structuredClone(p.document);
  broken.nodes.root.children.push('root');
  const invalid = await first.put(`/api/apps/${application.id}/pages/${p.id}`, {
    data: { document: broken, expectedRevision: p.revision + 1 },
  });
  expect(invalid.status()).toBe(422);
  await first.dispose();
  await second.dispose();
});
test('viewer can execute published queries but cannot read or mutate draft; logout revokes session', async ({
  playwright,
}) => {
  const owner = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3000' });
  const viewer = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3000' });
  const a = await demo(owner),
    b = await demo(viewer);
  const application = await app(owner, a.workspaceId);
  const q = application.queries[0];
  expect(
    (
      await owner.post(`/api/workspaces/${a.workspaceId}/members`, {
        data: { email: b.user.email, role: 'VIEWER' },
      })
    ).ok(),
  ).toBeTruthy();
  expect((await viewer.get(`/api/apps/${application.id}`)).status()).toBe(403);
  expect(
    (await viewer.patch(`/api/apps/${application.id}`, { data: { name: 'Not allowed' } })).status(),
  ).toBe(403);
  expect((await viewer.post(`/api/apps/${application.id}/publish`, { data: {} })).status()).toBe(
    403,
  );
  expect(
    (
      await viewer.post(`/api/apps/${application.id}/queries/${q.id}/execute`, { data: {} })
    ).status(),
  ).toBe(403);
  const run = await viewer.get(`/api/apps/${application.id}/runtime`);
  expect(run.ok()).toBeTruthy();
  const version = (await run.json()).data.versionId;
  const query = await viewer.post(
    `/api/apps/${application.id}/queries/${q.id}/execute?versionId=${version}`,
    { data: {} },
  );
  expect(query.ok()).toBeTruthy();
  expect((await query.json()).data[0].name).toBe('Olivia Rhye');
  await viewer.post('/api/auth/logout', { data: {} });
  expect((await viewer.get(`/api/workspaces/${a.workspaceId}`)).status()).toBe(401);
  await owner.dispose();
  await viewer.dispose();
});
test('query config cannot introduce arbitrary URLs or private headers; CSRF rejected', async ({
  request,
}) => {
  const { workspaceId } = await demo(request);
  const application = await app(request, workspaceId);
  const q = application.queries[0];
  const arbitrary = await request.patch(`/api/apps/${application.id}/queries/${q.id}`, {
    data: {
      name: q.name,
      sourceId: q.sourceId,
      config: { ...q.config, url: 'http://127.0.0.1:22' },
    },
  });
  expect(arbitrary.status()).toBe(422);
  const sources = (await (await request.get(`/api/workspaces/${workspaceId}/sources`)).json())
    .data as { id: string; kind: string }[];
  const source = sources.find((s) => s.kind === 'rest')!;
  const secret = await request.patch(`/api/apps/${application.id}/queries/${q.id}`, {
    data: {
      name: q.name,
      sourceId: source.id,
      config: { ...q.config, resource: 'users', headers: { Authorization: 'private-token' } },
    },
  });
  expect(secret.status()).toBe(422);
  const csrf = await request.post(`/api/workspaces/${workspaceId}/apps`, {
    data: { name: 'Attack' },
    headers: { Origin: 'https://untrusted.example' },
  });
  expect(csrf.status()).toBe(403);
});
test('registration, login and session protection', async ({ playwright }) => {
  const request = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3000' });
  const email = `qa-${crypto.randomUUID()}@example.com`;
  const password = 'QA-test-password-2026';
  expect(
    (await request.post('/api/auth/register', { data: { email, password, name: 'QA User' } })).ok(),
  ).toBeTruthy();
  const me = (await (await request.get('/api/auth/me')).json()).data;
  accounts.push(me.id);
  await request.post('/api/auth/logout', { data: {} });
  expect((await request.get('/api/workspaces')).status()).toBe(401);
  expect(
    (
      await request.post('/api/auth/login', { data: { email, password: 'wrong-password' } })
    ).status(),
  ).toBe(401);
  expect((await request.post('/api/auth/login', { data: { email, password } })).ok()).toBeTruthy();
  expect((await (await request.get('/api/auth/me')).json()).data.email).toBe(email);
  await request.dispose();
});
test('two editor tabs expose a revision conflict and preserve the first save', async ({
  page,
  context,
}) => {
  const { workspaceId } = await demo(page.request);
  const application = await app(page.request, workspaceId);
  await page.goto(`/apps/${application.id}/edit`);
  await expect(page.getByTestId('canvas')).toBeVisible();
  const second = await context.newPage();
  await second.goto(`/apps/${application.id}/edit`);
  await expect(second.getByTestId('canvas')).toBeVisible();
  await page.getByRole('heading', { name: 'Customer overview' }).click();
  await page.locator('.inspector').getByLabel('Text', { exact: true }).fill('First tab saved');
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible();
  await second.getByRole('heading', { name: 'Customer overview' }).click();
  await second
    .locator('.inspector')
    .getByLabel('Text', { exact: true })
    .fill('Second tab local draft');
  await expect(second.locator('.save-error-banner')).toContainText('another tab');
  const server = await app(page.request, workspaceId);
  expect(
    Object.values(server.pages[0].document.nodes).some((n) => n.props.text === 'First tab saved'),
  ).toBeTruthy();
  await second.getByRole('button', { name: 'Reload server version' }).click();
  await expect(second.getByRole('heading', { name: 'First tab saved' })).toBeVisible();
  await second.close();
});
test('query editor tests mock data and approved REST GET and POST execute on the server', async ({
  page,
}) => {
  const { workspaceId } = await demo(page.request);
  const application = await app(page.request, workspaceId);
  await page.goto(`/apps/${application.id}/edit`);
  await page.getByRole('button', { name: 'Queries 1' }).click();
  await page.getByRole('button', { name: 'Test request' }).click();
  await expect(page.locator('.query-result pre')).toContainText('Olivia Rhye');
  const sources = (await (await page.request.get(`/api/workspaces/${workspaceId}/sources`)).json())
    .data as { id: string; kind: string }[];
  const rest = sources.find((s) => s.kind === 'rest')!;
  const query = await page.request.post(`/api/apps/${application.id}/queries`, {
    data: {
      name: 'getUsers',
      sourceId: rest.id,
      config: { method: 'GET', resource: 'users', runOnLoad: false },
    },
  });
  expect(query.ok()).toBeTruthy();
  const id = (await query.json()).data.id;
  const response = await page.request.post(`/api/apps/${application.id}/queries/${id}/execute`, {
    data: {},
  });
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).data[0].id).toBe(1);
  await page.request.patch(`/api/apps/${application.id}/queries/${id}`, {
    data: {
      name: 'getUsers',
      sourceId: rest.id,
      config: {
        method: 'POST',
        resource: 'posts',
        body: { title: 'AppSmith Lite test', userId: 1 },
        runOnLoad: false,
      },
    },
  });
  const post = await page.request.post(`/api/apps/${application.id}/queries/${id}/execute`, {
    data: {},
  });
  expect(post.ok()).toBeTruthy();
  expect((await post.json()).data.title).toBe('AppSmith Lite test');
});
test('dashboard works on a phone without horizontal overflow', async ({ page }) => {
  const { workspaceId } = await demo(page.request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/workspaces/${workspaceId}`);
  await expect(page.getByRole('heading', { name: 'Your ideas. Ready to build.' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Open Customer management', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.getByLabel('Search applications').fill('Customer');
  await expect(page.getByRole('link', { name: 'Open Sales dashboard', exact: true })).toHaveCount(
    0,
  );
});
