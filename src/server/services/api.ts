import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/server/db/client';
import {
  createSession,
  currentUser,
  destroySession,
  hashPassword,
  requireUser,
  verifyPassword,
} from '@/server/auth/session';
import { assert, AppError } from '@/server/security/errors';
import { rateLimit } from '@/server/security/limits';
import { accessApp, createWorkspace, membership } from './workspaces';
import {
  createApplication,
  duplicateApplication,
  json,
  parseSnapshot,
  publishApplication,
  readApplication,
  savePage,
} from './applications';
import { executeQuery } from './queries';
import { queryConfigSchema, sourceConfigSchema } from '@/entities/ui-node/types';
import { validateDocument, DocumentError } from '@/entities/ui-node/validate';
import { emptyDocument } from '@/features/editor/model/editor-commands';
const uuid = z.uuid();
const name = z.string().trim().min(1).max(80);
export const credentialsSchema = z.object({
  email: z
    .email()
    .max(200)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(128),
  name: name.optional(),
});
export async function dispatch(request: Request, path: string[], body: unknown) {
  const method = request.method;
  const [area, id, section, subId, operation] = path;
  if (area === 'auth') {
    if (id === 'me' && method === 'GET') return currentUser();
    if (id === 'logout' && method === 'POST') {
      await destroySession();
      return { ok: true };
    }
    assert(method === 'POST', 405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
    rateLimit(`auth:${request.headers.get('x-forwarded-for') ?? 'local'}`, 30, 60000);
    if (id === 'demo') {
      const user = await db.user.create({
        data: {
          name: 'Alex Morgan',
          email: `demo-${crypto.randomUUID()}@appsmith.local`,
          passwordHash: await hashPassword(crypto.randomUUID()),
        },
      });
      const workspace = await createWorkspace(user.id, 'Design workspace');
      const app = await createApplication(workspace.id, user.id, 'Customer management', true);
      await publishApplication(app.id);
      const second = await createApplication(workspace.id, user.id, 'Sales dashboard');
      await db.application.update({
        where: { id: second.id },
        data: {
          color: 'purple',
          description: 'A clear view of pipeline performance and team goals.',
        },
      });
      await createSession(user.id);
      return { workspaceId: workspace.id };
    }
    const input = credentialsSchema.parse(body);
    if (id === 'register') {
      assert(input.name, 422, 'NAME_REQUIRED', 'Please enter your name.');
      const user = await db.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash: await hashPassword(input.password),
        },
      });
      const workspace = await createWorkspace(user.id, `${input.name.split(' ')[0]}'s workspace`);
      await createApplication(workspace.id, user.id, 'Customer management', true);
      await createSession(user.id);
      return { workspaceId: workspace.id };
    }
    if (id === 'login') {
      const user = await db.user.findUnique({ where: { email: input.email } });
      // Do comparable password work for unknown emails.
      const valid = user
        ? await verifyPassword(input.password, user.passwordHash)
        : (await hashPassword(input.password), false);
      assert(user && valid, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
      await createSession(user.id);
      return { ok: true };
    }
    throw new AppError(404, 'NOT_FOUND', 'Endpoint not found.');
  }
  const user = await requireUser();
  rateLimit(`api:${user.id}`, 300);
  if (area === 'workspaces') {
    if (!id) {
      if (method === 'GET')
        return db.workspace.findMany({
          where: { members: { some: { userId: user.id } } },
          include: {
            members: { where: { userId: user.id }, select: { role: true } },
            _count: { select: { applications: true } },
          },
          orderBy: { updatedAt: 'desc' },
        });
      if (method === 'POST') return createWorkspace(user.id, z.object({ name }).parse(body).name);
    }
    uuid.parse(id);
    const member = await membership(
      user.id,
      id,
      method !== 'GET',
      method !== 'GET' && section !== 'apps',
    );
    if (section === 'apps') {
      if (method === 'GET')
        return db.application.findMany({
          where: {
            workspaceId: id,
            ...(member.role === 'VIEWER' ? { publishedVersionId: { not: null } } : {}),
          },
          include: { _count: { select: { pages: true, queries: true } } },
          orderBy: { updatedAt: 'desc' },
        });
      if (method === 'POST') {
        const input = z.object({ name, template: z.boolean().optional() }).parse(body);
        return createApplication(id, user.id, input.name, input.template);
      }
    }
    if (section === 'sources' && method === 'GET')
      return (await db.dataSource.findMany({ where: { workspaceId: id } })).map((s) => ({
        ...s,
        config: sourceConfigSchema.parse(s.config),
      }));
    if (section === 'members') {
      if (method === 'GET')
        return db.workspaceMember.findMany({
          where: { workspaceId: id },
          include: { user: { select: { name: true, email: true } } },
        });
      if (method === 'POST') {
        const input = z
          .object({ email: z.email(), role: z.enum(['EDITOR', 'VIEWER']) })
          .parse(body);
        const invited = await db.user.findUnique({ where: { email: input.email.toLowerCase() } });
        assert(
          invited,
          404,
          'USER_NOT_FOUND',
          'This email must register before joining a workspace.',
        );
        assert(invited.id !== user.id, 422, 'OWNER_ROLE', 'The owner role cannot be changed.');
        return db.workspaceMember.upsert({
          where: { workspaceId_userId: { workspaceId: id, userId: invited.id } },
          create: { workspaceId: id, userId: invited.id, role: input.role },
          update: { role: input.role },
        });
      }
      if (method === 'DELETE') {
        uuid.parse(subId);
        const target = await db.workspaceMember.findFirst({
          where: { id: subId, workspaceId: id },
        });
        assert(
          target && target.role !== 'OWNER',
          422,
          'OWNER_ROLE',
          'The owner cannot be removed.',
        );
        await db.workspaceMember.delete({ where: { id: subId } });
        return { ok: true };
      }
    }
    if (!section) {
      if (method === 'GET')
        return { ...(await db.workspace.findUniqueOrThrow({ where: { id } })), role: member.role };
      if (method === 'PATCH')
        return db.workspace.update({
          where: { id },
          data: { name: z.object({ name }).parse(body).name },
        });
      if (method === 'DELETE') {
        await db.$transaction(async (tx) => {
          await tx.application.deleteMany({ where: { workspaceId: id } });
          await tx.dataSource.deleteMany({ where: { workspaceId: id } });
          await tx.workspace.delete({ where: { id } });
        });
        return { ok: true };
      }
    }
  }
  if (area === 'apps') {
    uuid.parse(id);
    const { app, member } = await accessApp(
      user.id,
      id,
      method !== 'GET' && !(section === 'queries' && operation === 'execute'),
    );
    if (!section) {
      if (method === 'GET') return readApplication(id, member.role);
      if (method === 'PATCH')
        return db.application.update({
          where: { id },
          data: z
            .object({
              name: name.optional(),
              description: z.string().max(300).optional(),
              color: z.enum(['orange', 'purple', 'blue', 'green']).optional(),
            })
            .strict()
            .parse(body),
        });
      if (method === 'DELETE') {
        await db.application.delete({ where: { id } });
        return { ok: true };
      }
    }
    if (section === 'duplicate' && method === 'POST') return duplicateApplication(id, user.id);
    if (section === 'publish' && method === 'POST') {
      assert(member.role === 'OWNER', 403, 'FORBIDDEN', 'Only workspace owners can publish.');
      return publishApplication(id);
    }
    if (section === 'runtime' && method === 'GET') {
      assert(
        app.publishedVersionId,
        404,
        'NOT_PUBLISHED',
        'This application has not been published yet.',
      );
      const version = await db.appVersion.findFirstOrThrow({
        where: { id: app.publishedVersionId, appId: id },
      });
      return {
        appId: id,
        versionId: version.id,
        number: version.number,
        snapshot: parseSnapshot(version.snapshot),
        workspaceId: app.workspaceId,
      };
    }
    if (section === 'versions' && method === 'GET') {
      assert(member.role !== 'VIEWER', 403, 'FORBIDDEN', 'Editor role required.');
      if (subId) {
        uuid.parse(subId);
        const version = await db.appVersion.findFirst({ where: { id: subId, appId: id } });
        assert(version, 404, 'NOT_FOUND', 'Version not found.');
        return { ...version, snapshot: parseSnapshot(version.snapshot) };
      }
      return db.appVersion.findMany({
        where: { appId: id },
        select: { id: true, number: true, createdAt: true },
        orderBy: { number: 'desc' },
      });
    }
    if (section === 'pages') {
      assert(member.role !== 'VIEWER', 403, 'FORBIDDEN', 'Editor role required.');
      if (!subId) {
        if (method === 'GET')
          return (
            await db.page.findMany({ where: { appId: id }, orderBy: { position: 'asc' } })
          ).map((p) => ({ ...p, document: validateDocument(p.document) }));
        if (method === 'POST') {
          const input = z.object({ name }).parse(body);
          const count = await db.page.count({ where: { appId: id } });
          assert(count < 20, 422, 'PAGE_LIMIT', 'Maximum 20 pages.');
          return db.page.create({
            data: { appId: id, name: input.name, position: count, document: json(emptyDocument()) },
          });
        }
      }
      uuid.parse(subId);
      const page = await db.page.findFirst({ where: { id: subId, appId: id } });
      assert(page, 404, 'NOT_FOUND', 'Page not found.');
      if (method === 'GET') return { ...page, document: validateDocument(page.document) };
      if (method === 'PUT') {
        const input = z
          .object({ document: z.unknown(), expectedRevision: z.number().int().min(0) })
          .strict()
          .parse(body);
        return savePage(id, subId, validateDocument(input.document), input.expectedRevision);
      }
      if (method === 'PATCH')
        return db.page.update({
          where: { id: subId },
          data: { name: z.object({ name }).parse(body).name },
        });
      if (method === 'DELETE') {
        assert(
          (await db.page.count({ where: { appId: id } })) > 1,
          422,
          'LAST_PAGE',
          'Keep at least one page.',
        );
        await db.page.delete({ where: { id: subId } });
        return { ok: true };
      }
    }
    if (section === 'queries') {
      const publishedVersionId = new URL(request.url).searchParams.get('versionId');
      if (operation === 'execute' && method === 'POST') {
        rateLimit(`query:${user.id}`, 30);
        uuid.parse(subId);
        const values = z
          .object({ values: z.record(z.string(), z.unknown()).default({}) })
          .parse(body ?? {}).values;
        if (publishedVersionId) {
          uuid.parse(publishedVersionId);
          const version = await db.appVersion.findFirst({
            where: { id: publishedVersionId, appId: id },
          });
          assert(version, 404, 'NOT_FOUND', 'Version not found.');
          assert(
            member.role !== 'VIEWER' || app.publishedVersionId === version.id,
            403,
            'FORBIDDEN',
            'This version is not active.',
          );
          const snapshot = parseSnapshot(version.snapshot);
          const query = snapshot.queries.find((q) => q.id === subId);
          assert(query, 404, 'NOT_FOUND', 'Query not found.');
          const source = snapshot.sources.find((s) => s.id === query.sourceId);
          assert(source, 422, 'INVALID_SOURCE', 'Source not found.');
          return executeQuery(source, query.config, values);
        }
        assert(member.role !== 'VIEWER', 403, 'FORBIDDEN', 'Editor role required.');
        const query = await db.query.findFirst({
          where: { id: subId, appId: id },
          include: { source: true },
        });
        assert(query, 404, 'NOT_FOUND', 'Query not found.');
        return executeQuery(
          { ...query.source, config: sourceConfigSchema.parse(query.source.config) },
          queryConfigSchema.parse(query.config),
          values,
        );
      }
      assert(member.role !== 'VIEWER', 403, 'FORBIDDEN', 'Editor role required.');
      if (method === 'GET' && !subId)
        return (await db.query.findMany({ where: { appId: id } })).map((q) => ({
          ...q,
          config: queryConfigSchema.parse(q.config),
        }));
      if (method === 'POST' || method === 'PATCH') {
        const input = z
          .object({
            name: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,60}$/),
            sourceId: uuid,
            config: queryConfigSchema,
          })
          .strict()
          .parse(body);
        const source = await db.dataSource.findFirst({
          where: { id: input.sourceId, workspaceId: app.workspaceId },
        });
        assert(source, 422, 'INVALID_SOURCE', 'Source is not in this workspace.');
        if (method === 'POST')
          return db.query.create({ data: { appId: id, ...input, config: json(input.config) } });
        uuid.parse(subId);
        const query = await db.query.findFirst({ where: { id: subId, appId: id } });
        assert(query, 404, 'NOT_FOUND', 'Query not found.');
        return db.query.update({
          where: { id: subId },
          data: { ...input, config: json(input.config) },
        });
      }
      if (method === 'DELETE') {
        uuid.parse(subId);
        await db.query.deleteMany({ where: { id: subId, appId: id } });
        return { ok: true };
      }
    }
  }
  throw new AppError(404, 'NOT_FOUND', 'Endpoint not found.');
}
export function normalizeError(error: unknown) {
  if (error instanceof AppError) return error;
  if (error instanceof DocumentError) return new AppError(422, 'INVALID_DOCUMENT', error.message);
  if (error instanceof z.ZodError)
    return new AppError(
      422,
      'VALIDATION_ERROR',
      error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    );
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    return new AppError(409, 'ALREADY_EXISTS', 'This email or name is already in use.');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
    return new AppError(404, 'NOT_FOUND', 'Record not found.');
  if (error instanceof SyntaxError) return new AppError(400, 'INVALID_JSON', 'Invalid JSON.');
  return new AppError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
}
