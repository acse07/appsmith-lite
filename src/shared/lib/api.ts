export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(
      response.status,
      result.error?.code ?? 'UNKNOWN',
      result.error?.message ?? 'Request failed.',
    );
  return result.data as T;
}
