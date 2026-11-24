/**
 * Shared fetch with timeouts and candidate API bases.
 */

export type ServerHealthState = {
  online: boolean;
  lastError: string | null;
  lastOkAt: string | null;
  coldStartHint: boolean;
};

const DEV_FALLBACKS = ['http://127.0.0.1:8000/api', 'http://localhost:8000/api'];

/** Production: same-origin `/api` (Vercel rewrite) must run before any baked `VITE_API_BASE_URL`. */
function candidateBases(): string[] {
  const out: string[] = [];
  const push = (b: string) => {
    if (b && !out.includes(b)) out.push(b);
  };

  push('/api');

  const rawBase = import.meta.env.VITE_API_BASE_URL || '';
  if (rawBase) {
    push(`${rawBase.replace(/\/$/, '')}/api`);
  }

  if (!import.meta.env.PROD) {
    for (const f of DEV_FALLBACKS) push(f);
  }
  return out;
}

export function fetchWithTimeout(url: string, init: RequestInit | undefined, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => window.clearTimeout(timer));
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
  timeoutMs = import.meta.env.PROD ? 12000 : 4000
): Promise<Response> {
  const bases = candidateBases();
  let lastError: Error = new Error(
    'Backend offline. From the backend folder run: py -3 -m uvicorn app.main:app --port 8000'
  );

  for (const base of bases) {
    try {
      const res = await fetchWithTimeout(`${base}${path}`, init, timeoutMs);
      if (res.ok) return res;
      const payload = await res.json().catch(() => ({}));
      const detail = (payload as { detail?: string }).detail;
      lastError = new Error(
        typeof detail === 'string' && detail ? detail : `Backend request failed (${res.status})`
      );
      if (res.status >= 400 && res.status < 500 && res.status !== 404) {
        throw lastError;
      }
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      const msg = err instanceof Error ? err.message : '';
      if (name === 'AbortError') {
        lastError = new Error('Backend request timed out (Render may be waking up — retry in ~30s)');
        continue;
      }
      if (err instanceof Error && !/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
        lastError = err;
        if (!/offline|timed out/i.test(msg)) throw err;
      }
    }
  }
  throw lastError;
}

export async function probeServerHealth(firstProbe = false): Promise<ServerHealthState> {
  const timeout = firstProbe ? 20000 : 10000;
  try {
    const res = await apiFetch('/health', undefined, timeout);
    const data = await res.json();
    if (data?.status === 'online') {
      return {
        online: true,
        lastError: null,
        lastOkAt: new Date().toISOString(),
        coldStartHint: false,
      };
    }
    return {
      online: false,
      lastError: 'Unexpected health payload',
      lastOkAt: null,
      coldStartHint: false,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return {
      online: false,
      lastError: msg,
      lastOkAt: null,
      coldStartHint: /timed out|Failed to fetch/i.test(msg),
    };
  }
}

export async function fetchMagneticDeclination(lat: number, lon: number): Promise<number | null> {
  try {
    const res = await apiFetch(
      `/geo/declination?latitude=${lat}&longitude=${lon}`,
      undefined,
      6000
    );
    const data = await res.json();
    return typeof data.declination_deg === 'number' ? data.declination_deg : null;
  } catch {
    return null;
  }
}