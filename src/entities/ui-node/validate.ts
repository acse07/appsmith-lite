import { z } from 'zod';
import { registry } from '@/features/component-registry/registry';
import { actionSchema, componentTypes, type UIDocument } from './types';
const nodeSchema = z
  .object({
    id: z.string().min(1).max(100),
    type: z.enum(componentTypes),
    props: z.record(z.string(), z.unknown()),
    children: z.array(z.string()).max(500),
    events: z.record(z.string(), actionSchema).optional(),
  })
  .strict();
const schema = z
  .object({
    schemaVersion: z.literal(1),
    rootId: z.string(),
    nodes: z.record(z.string(), nodeSchema),
  })
  .strict();
export class DocumentError extends Error {}
export function validateDocument(value: unknown): UIDocument {
  const doc = schema.parse(value);
  if (JSON.stringify(doc).length > 500_000) throw new DocumentError('Document exceeds 500 KB');
  const ids = Object.keys(doc.nodes);
  if (ids.length > 500 || !doc.nodes[doc.rootId] || doc.nodes[doc.rootId].type !== 'Container')
    throw new DocumentError('Invalid document root or node count');
  const visited = new Set<string>();
  function visit(id: string, depth: number) {
    if (depth > 20) throw new DocumentError('Maximum nesting depth exceeded');
    if (visited.has(id)) throw new DocumentError('Cycle or multiple parents detected');
    const node = doc.nodes[id];
    if (!node || node.id !== id || ['__proto__', 'constructor', 'prototype'].includes(id))
      throw new DocumentError('Invalid node ID');
    visited.add(id);
    registry[node.type].propsSchema.parse(node.props);
    for (const event of Object.keys(node.events ?? {}))
      if (!registry[node.type].events.includes(event)) throw new DocumentError('Unsupported event');
    for (const child of node.children) {
      if (!doc.nodes[child] || !registry[node.type].allowedChildren.includes(doc.nodes[child].type))
        throw new DocumentError('Invalid child');
      visit(child, depth + 1);
    }
  }
  visit(doc.rootId, 0);
  if (visited.size !== ids.length) throw new DocumentError('Orphan nodes detected');
  return doc;
}
