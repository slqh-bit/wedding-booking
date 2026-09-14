import type { ApiError, AuthResponse } from '@hafalati/shared';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

const ACCESS_KEY = 'hafalati.access';
const REFRESH_KEY = 'hafalati.refresh';

export const tokenStore = {
  get access() {
    try {
      return localStorage.getItem(ACCESS_KEY);
    } catch {
      return null;
    }
  },
  get refresh() {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  set(access: string, refresh: string) {
    try {
      localStorage.setItem(ACCESS_KEY, access);
      localStorage.setItem(REFRESH_KEY, refresh);
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* ignore */
    }
  },
};

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  /** internal: prevents infinite refresh loops */
  _retry?: boolean;
}

async function rawRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.auth !== false && tokenStore.access) {
    headers.Authorization = `Bearer ${tokenStore.access}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = (data as ApiError).error;
    // Attempt a one-time token refresh on 401.
    if (res.status === 401 && !opts._retry && tokenStore.refresh && opts.auth !== false) {
      const refreshed = await tryRefresh();
      if (refreshed) return rawRequest<T>(path, { ...opts, _retry: true });
    }
    throw new ApiRequestError(res.status, err?.code ?? 'error', err?.message ?? 'Request failed', err?.details);
  }

  return data as T;
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokenStore.refresh }),
      });
      if (!res.ok) {
        tokenStore.clear();
        return false;
      }
      const data = (await res.json()) as AuthResponse;
      tokenStore.set(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** Fetch an authenticated binary response and trigger a browser download. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  let res = await fetch(`${BASE_URL}${path}`, {
    headers: tokenStore.access ? { Authorization: `Bearer ${tokenStore.access}` } : {},
  });
  if (res.status === 401 && (await tryRefresh())) {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: tokenStore.access ? { Authorization: `Bearer ${tokenStore.access}` } : {},
    });
  }
  if (!res.ok) throw new ApiRequestError(res.status, 'download_failed', 'Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  get: <T>(path: string, auth = false) => rawRequest<T>(path, { method: 'GET', auth }),
  post: <T>(path: string, body?: unknown, auth = false) =>
    rawRequest<T>(path, { method: 'POST', body, auth }),
  patch: <T>(path: string, body?: unknown, auth = true) =>
    rawRequest<T>(path, { method: 'PATCH', body, auth }),
  delete: <T>(path: string, auth = true) => rawRequest<T>(path, { method: 'DELETE', auth }),
};
