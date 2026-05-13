const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    message: string,
    public readonly error?: string,
    public readonly issues?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  toString() {
    return `ApiError[${this.status} ${this.path}]: ${this.message}`;
  }
}

export class NetworkError extends Error {
  constructor(
    public readonly path: string,
    cause: unknown,
  ) {
    super(`Network error fetching ${path}`);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<T> {
  if (!BASE_URL) throw new Error('NEXT_PUBLIC_API_URL is not set');
  const url = new URL(BASE_URL + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      credentials: 'include',
      headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (cause) {
    throw new NetworkError(path, cause);
  }
  if (!res.ok) {
    let body: { message?: string; error?: string; issues?: unknown } = {};
    try {
      body = (await res.json()) as typeof body;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, path, body.message ?? res.statusText, body.error, body.issues);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
