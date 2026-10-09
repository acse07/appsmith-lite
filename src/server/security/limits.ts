import { AppError } from './errors';
const buckets = new Map<string, { count: number; expires: number }>();
export function rateLimit(key: string, limit = 60, window = 60_000) {
  const now = Date.now();
  if (buckets.size > 10000) for (const [k, v] of buckets) if (v.expires < now) buckets.delete(k);
  const entry = buckets.get(key);
  if (!entry || entry.expires < now) {
    buckets.set(key, { count: 1, expires: now + window });
    return;
  }
  if (++entry.count > limit)
    throw new AppError(429, 'RATE_LIMITED', 'Too many requests. Please try again shortly.');
}
export function checkOrigin(request: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origin = request.headers.get('origin');
  const allowed = process.env.APP_ORIGIN ?? new URL(request.url).origin;
  if (
    origin &&
    origin !== allowed &&
    !(
      process.env.NODE_ENV !== 'production' &&
      new Set(['http://localhost:3000', 'http://127.0.0.1:3000']).has(origin)
    )
  )
    throw new AppError(403, 'INVALID_ORIGIN', 'Request origin is not permitted.');
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    throw new AppError(403, 'INVALID_ORIGIN', 'Cross-site request rejected.');
}
