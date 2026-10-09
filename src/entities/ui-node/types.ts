import { z } from 'zod';
export const componentTypes = [
  'Container',
  'Text',
  'Heading',
  'Button',
  'Input',
  'Select',
  'Table',
  'Divider',
] as const;
export type ComponentType = (typeof componentTypes)[number];
export const bindingSchema = z
  .object({
    kind: z.literal('binding'),
    path: z.string().regex(/^(app|queries|state|inputs)(\.[A-Za-z0-9_-]+)+$/),
  })
  .strict();
export type Binding = z.infer<typeof bindingSchema>;
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('showToast'), message: z.string().max(500) }).strict(),
  z.object({ type: z.literal('runQuery'), queryId: z.string() }).strict(),
  z.object({ type: z.literal('navigate'), pageId: z.string() }).strict(),
  z
    .object({
      type: z.literal('setValue'),
      key: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,60}$/),
      value: z.union([z.string(), z.number(), z.boolean(), bindingSchema]),
    })
    .strict(),
  z.object({ type: z.literal('resetForm') }).strict(),
]);
export type ActionConfig = z.infer<typeof actionSchema>;
export interface UINode {
  id: string;
  type: ComponentType;
  props: Record<string, unknown>;
  children: string[];
  events?: Record<string, ActionConfig>;
}
export interface UIDocument {
  schemaVersion: 1;
  rootId: string;
  nodes: Record<string, UINode>;
}
export interface PageData {
  id: string;
  name: string;
  position: number;
  document: UIDocument;
  revision: number;
}
export const sourceConfigSchema = z
  .object({ provider: z.enum(['customers', 'jsonplaceholder']) })
  .strict();
export const queryConfigSchema = z
  .object({
    method: z.enum(['GET', 'POST']),
    resource: z.enum(['customers', 'users', 'posts', 'todos']),
    headers: z
      .record(
        z
          .string()
          .refine(
            (key) => ['accept', 'content-type'].includes(key.toLowerCase()),
            'Only Accept and Content-Type headers are allowed',
          ),
        z
          .string()
          .max(200)
          .refine((value) => !/[\r\n]/.test(value), 'Header must not contain line breaks'),
      )
      .default({}),
    params: z.record(z.string().regex(/^[A-Za-z0-9_]{1,40}$/), z.string().max(200)).default({}),
    body: z.record(z.string(), z.unknown()).default({}),
    runOnLoad: z.boolean().default(true),
  })
  .strict();
export type QueryConfig = z.infer<typeof queryConfigSchema>;
export interface SourceData {
  id: string;
  name: string;
  kind: string;
  config: z.infer<typeof sourceConfigSchema>;
}
export interface QueryData {
  id: string;
  name: string;
  sourceId: string;
  config: QueryConfig;
}
export interface AppData {
  id: string;
  name: string;
  workspaceId: string;
  description: string;
  color: string;
  publishedVersionId: string | null;
  pages: PageData[];
  queries: QueryData[];
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
}
export interface AppSnapshot {
  schemaVersion: 1;
  name: string;
  pages: PageData[];
  queries: QueryData[];
  sources: SourceData[];
}
