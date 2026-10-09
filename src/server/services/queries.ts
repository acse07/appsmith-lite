import { customers } from '@/shared/lib/demo';
import {
  queryConfigSchema,
  sourceConfigSchema,
  type QueryConfig,
  type SourceData,
} from '@/entities/ui-node/types';
import { assert, AppError } from '@/server/security/errors';
export async function executeQuery(
  source: SourceData,
  config: QueryConfig,
  values: Record<string, unknown> = {},
) {
  const cfg = queryConfigSchema.parse(config);
  const provider = sourceConfigSchema.parse(source.config).provider;
  if (provider === 'customers') {
    assert(
      cfg.resource === 'customers',
      422,
      'INVALID_RESOURCE',
      'Use the customers resource for this source.',
    );
    if (cfg.method === 'POST') return { id: Date.now(), ...cfg.body, ...values };
    const search = (cfg.params.search ?? '').toLowerCase();
    return customers.filter((c) => !search || c.name.toLowerCase().includes(search));
  }
  assert(
    source.kind === 'rest' && cfg.resource !== 'customers',
    422,
    'INVALID_SOURCE',
    'Unsupported source or resource.',
  );
  // No user-controlled origin, port, protocol or redirect. Only fixed resources are allowed.
  const url = new URL(`https://jsonplaceholder.typicode.com/${cfg.resource}`);
  for (const [key, value] of Object.entries(cfg.params)) {
    assert(
      /^[A-Za-z0-9_]{1,40}$/.test(key) && value.length <= 200,
      422,
      'INVALID_PARAMS',
      'Invalid query parameter.',
    );
    url.searchParams.set(key, value);
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  for (const [key, value] of Object.entries(cfg.headers)) {
    assert(
      ['accept', 'content-type'].includes(key.toLowerCase()) &&
        value.length < 200 &&
        !/[\r\n]/.test(value),
      422,
      'INVALID_HEADER',
      'Only Accept and Content-Type headers are allowed.',
    );
    headers[key] = value;
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method: cfg.method,
      headers,
      body: cfg.method === 'POST' ? JSON.stringify({ ...cfg.body, ...values }) : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
  } catch {
    throw new AppError(502, 'UPSTREAM_ERROR', 'The source did not respond. Try again.');
  }
  assert(response.ok, 502, 'UPSTREAM_ERROR', `Source returned HTTP ${response.status}.`);
  assert(response.body, 502, 'UPSTREAM_ERROR', 'Source returned an empty response.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 1_000_000) {
      await reader.cancel();
      throw new AppError(502, 'RESPONSE_TOO_LARGE', 'Source response exceeds 1 MB.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new AppError(502, 'INVALID_RESPONSE', 'Source response is not JSON.');
  }
}
