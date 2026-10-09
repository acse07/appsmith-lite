import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { db } from '@/server/db/client';
import { assert } from '@/server/security/errors';
import { emptyDocument } from '@/features/editor/model/editor-commands';
import { validateDocument } from '@/entities/ui-node/validate';
import {
  queryConfigSchema,
  sourceConfigSchema,
  type AppSnapshot,
  type UIDocument,
} from '@/entities/ui-node/types';
import { customerDocument } from '@/shared/lib/demo';
export const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export async function createApplication(
  workspaceId: string,
  userId: string,
  name: string,
  template = false,
) {
  const source = await db.dataSource.findFirstOrThrow({ where: { workspaceId, kind: 'mock' } });
  const queryId = randomUUID();
  return db.application.create({
    data: {
      workspaceId,
      createdById: userId,
      name,
      slug: `app-${randomUUID()}`,
      description: template
        ? 'Your customers, connected. A ready-to-use operations dashboard.'
        : 'A blank canvas for your next internal tool.',
      pages: {
        create: {
          name: template ? 'Customers' : 'Page 1',
          document: json(template ? customerDocument(queryId) : emptyDocument()),
        },
      },
      queries: {
        create: {
          id: queryId,
          name: 'getCustomers',
          sourceId: source.id,
          config: json(
            queryConfigSchema.parse({ method: 'GET', resource: 'customers', runOnLoad: true }),
          ),
        },
      },
    },
  });
}
export async function readApplication(appId: string, role: 'OWNER' | 'EDITOR' | 'VIEWER') {
  assert(role !== 'VIEWER', 403, 'FORBIDDEN', 'Viewers can open published applications only.');
  const app = await db.application.findUniqueOrThrow({
    where: { id: appId },
    include: { pages: { orderBy: { position: 'asc' } }, queries: true },
  });
  return {
    ...app,
    role,
    pages: app.pages.map((p) => ({ ...p, document: validateDocument(p.document) })),
    queries: app.queries.map((q) => ({ ...q, config: queryConfigSchema.parse(q.config) })),
  };
}
export async function savePage(
  appId: string,
  pageId: string,
  document: UIDocument,
  revision: number,
) {
  validateDocument(document);
  return db.$transaction(async (tx) => {
    const result = await tx.page.updateMany({
      where: { id: pageId, appId, revision },
      data: { document: json(document), revision: { increment: 1 } },
    });
    if (!result.count) {
      const exists = await tx.page.findFirst({ where: { id: pageId, appId } });
      assert(exists, 404, 'NOT_FOUND', 'Page not found.');
      assert(
        false,
        409,
        'REVISION_CONFLICT',
        'This page changed in another tab. Download your local draft, then reload the server version.',
      );
    }
    await tx.application.update({ where: { id: appId }, data: { updatedAt: new Date() } });
    const page = await tx.page.findUniqueOrThrow({ where: { id: pageId } });
    return { pageId, revision: page.revision, savedAt: page.updatedAt };
  });
}
export function parseSnapshot(value: unknown): AppSnapshot {
  assert(value && typeof value === 'object', 422, 'INVALID_SNAPSHOT', 'Invalid snapshot.');
  const snapshot = value as AppSnapshot;
  assert(
    snapshot.schemaVersion === 1 &&
      Array.isArray(snapshot.pages) &&
      Array.isArray(snapshot.queries) &&
      Array.isArray(snapshot.sources),
    422,
    'INVALID_SNAPSHOT',
    'Unsupported snapshot.',
  );
  return {
    ...snapshot,
    pages: snapshot.pages.map((p) => ({ ...p, document: validateDocument(p.document) })),
    queries: snapshot.queries.map((q) => ({ ...q, config: queryConfigSchema.parse(q.config) })),
    sources: snapshot.sources.map((s) => ({ ...s, config: sourceConfigSchema.parse(s.config) })),
  };
}
export async function publishApplication(appId: string) {
  return db.$transaction(async (tx) => {
    // Lock one application so concurrent publications cannot choose the same version number.
    await tx.$queryRaw`SELECT id FROM "Application" WHERE id = ${appId}::uuid FOR UPDATE`;
    const app = await tx.application.findUniqueOrThrow({
      where: { id: appId },
      include: {
        pages: { orderBy: { position: 'asc' } },
        queries: { include: { source: true } },
        versions: { orderBy: { number: 'desc' }, take: 1 },
      },
    });
    assert(app.pages.length, 422, 'NO_PAGES', 'Add a page before publishing.');
    const snapshot = parseSnapshot({
      schemaVersion: 1,
      name: app.name,
      pages: app.pages,
      queries: app.queries.map((q) => ({
        id: q.id,
        name: q.name,
        sourceId: q.sourceId,
        config: q.config,
      })),
      sources: [...new Map(app.queries.map((q) => [q.sourceId, q.source])).values()],
    });
    const version = await tx.appVersion.create({
      data: { appId, number: (app.versions[0]?.number ?? 0) + 1, snapshot: json(snapshot) },
    });
    await tx.application.update({ where: { id: appId }, data: { publishedVersionId: version.id } });
    return { id: version.id, number: version.number };
  });
}
export async function duplicateApplication(appId: string, userId: string) {
  const app = await db.application.findUniqueOrThrow({
    where: { id: appId },
    include: { pages: true, queries: true },
  });
  return db.$transaction(async (tx) => {
    const copy = await tx.application.create({
      data: {
        workspaceId: app.workspaceId,
        createdById: userId,
        name: `${app.name} (copy)`,
        description: app.description,
        color: app.color,
        slug: `app-${randomUUID()}`,
      },
    });
    const mapping = new Map(app.queries.map((q) => [q.id, randomUUID()]));
    const pageMapping = new Map(app.pages.map((p) => [p.id, randomUUID()]));
    for (const q of app.queries)
      await tx.query.create({
        data: {
          appId: copy.id,
          id: mapping.get(q.id),
          sourceId: q.sourceId,
          name: q.name,
          config: json(queryConfigSchema.parse(q.config)),
        },
      });
    for (const p of app.pages) {
      const document = structuredClone(validateDocument(p.document));
      for (const n of Object.values(document.nodes))
        for (const a of Object.values(n.events ?? {})) {
          if (a.type === 'runQuery') a.queryId = mapping.get(a.queryId) ?? a.queryId;
          if (a.type === 'navigate') a.pageId = pageMapping.get(a.pageId) ?? a.pageId;
        }
      await tx.page.create({
        data: {
          id: pageMapping.get(p.id),
          appId: copy.id,
          name: p.name,
          position: p.position,
          document: json(document),
        },
      });
    }
    return copy;
  });
}
