import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
test('record a short portfolio demonstration', async ({ browser }) => {
  test.skip(
    process.env.RECORD_DEMO !== '1',
    'Run with RECORD_DEMO=1 to refresh portfolio artifacts.',
  );
  await mkdir('docs/screenshots', { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    recordVideo: { dir: 'test-results/demo-recording', size: { width: 1440, height: 960 } },
  });
  const page = await context.newPage();
  const video = page.video()!;
  await page.goto('http://127.0.0.1:3000/login');
  await page.getByRole('button', { name: 'Explore the demo workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Your ideas. Ready to build.' })).toBeVisible();
  const me = (await (await page.request.get('http://127.0.0.1:3000/api/auth/me')).json()).data as {
    id: string;
  };
  await page.screenshot({ path: 'docs/screenshots/workspace.png', fullPage: true });
  await page.getByRole('link', { name: 'Open Customer management', exact: true }).click();
  await expect(page.getByTestId('canvas').getByText('Olivia Rhye')).toBeVisible();
  await page.getByRole('heading', { name: 'Customer overview' }).click();
  await page.locator('.inspector').getByLabel('Text', { exact: true }).press('End');
  await page
    .locator('.inspector')
    .getByLabel('Text', { exact: true })
    .pressSequentially(' — built by you', { delay: 110 });
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/editor.png', fullPage: true });
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await expect(page.locator('.layers-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Queries 1' }).click();
  await page.getByRole('button', { name: 'Test request' }).click();
  await expect(page.locator('.query-result pre')).toContainText('Olivia Rhye');
  await page.getByRole('button', { name: 'UI builder' }).click();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.getByPlaceholder('e.g. Alex Morgan').pressSequentially('Alex Morgan', { delay: 100 });
  await page.getByRole('button', { name: 'Refresh customers' }).click();
  await expect(page.getByText('Olivia Rhye')).toBeVisible();
  await page.getByRole('button', { name: 'Back to editor' }).click();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('button', { name: 'Publish application' }).click();
  await expect(page.getByRole('heading', { name: 'Your app is live.' })).toBeVisible();
  const link = await page
    .getByRole('link', { name: 'Open published application' })
    .getAttribute('href');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.goto(`http://127.0.0.1:3000${link}`);
  await expect(page.getByText('Olivia Rhye')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/runtime.png', fullPage: true });
  await page.getByRole('button', { name: 'Next table page' }).click();
  await expect(page.getByText('Natali Craig')).toBeVisible();
  await context.close();
  await video.saveAs('docs/demo.webm');
  const prisma = new PrismaClient({
    datasourceUrl:
      process.env.DATABASE_URL ??
      'postgresql://appsmith:appsmith_local@127.0.0.1:54329/appsmith?schema=public',
  });
  try {
    await prisma.application.deleteMany({ where: { workspace: { ownerId: me.id } } });
    await prisma.workspace.deleteMany({ where: { ownerId: me.id } });
    await prisma.user.delete({ where: { id: me.id } });
  } finally {
    await prisma.$disconnect();
  }
});
