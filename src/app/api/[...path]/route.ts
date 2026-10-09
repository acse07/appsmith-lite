import { NextResponse } from 'next/server';
import { dispatch, normalizeError } from '@/server/services/api';
import { checkOrigin } from '@/server/security/limits';
import { AppError } from '@/server/security/errors';
export const runtime = 'nodejs';
async function handler(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    checkOrigin(request);
    let body: unknown = undefined;
    if (!['GET', 'HEAD'].includes(request.method)) {
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader)
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 600_000) {
            await reader.cancel();
            throw new AppError(413, 'BODY_TOO_LARGE', 'Request exceeds 600 KB.');
          }
          chunks.push(value);
        }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.length;
      }
      const raw = new TextDecoder().decode(bytes);
      if (raw) body = JSON.parse(raw);
    }
    const data = await dispatch(request, (await context.params).path, body);
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const normalized = normalizeError(error);
    return NextResponse.json(
      { error: { code: normalized.code, message: normalized.message, details: {} } },
      { status: normalized.status },
    );
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as PUT, handler as DELETE };
