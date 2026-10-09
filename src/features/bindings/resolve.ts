import { bindingSchema } from '@/entities/ui-node/types';
export interface RuntimeContext {
  app: Record<string, unknown>;
  queries: Record<string, unknown>;
  state: Record<string, unknown>;
  inputs: Record<string, unknown>;
}
const forbidden = new Set(['__proto__', 'constructor', 'prototype']);
export function resolveBinding(value: unknown, context: RuntimeContext): unknown {
  if (!value || typeof value !== 'object' || !('kind' in value) || value.kind !== 'binding')
    return value;
  const binding = bindingSchema.parse(value);
  let current: unknown = context;
  for (const key of binding.path.split('.')) {
    if (forbidden.has(key)) throw new Error('Unsafe binding path');
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, key))
      return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
