import type { RawResult, SearchParams } from './search-providers';

/** The subset of Cloudflare KV we use; anything with get/put works (tests pass a Map). */
export interface ResultCache {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/** How long a lane's rows stay fresh, by how recent the user wants them. */
const TTL_SECONDS: Record<string, number> = {
  day: 10 * 60,
  week: 60 * 60,
  month: 2 * 60 * 60,
  any: 6 * 60 * 60,
};

export function cacheKey(params: SearchParams): string {
  return [
    'kor-v1-ko-basic', // Provider, language and depth isolate the cached representation.
    params.service ?? 'tavily',
    params.query.trim().toLowerCase(),
    params.timeRange ?? 'any',
    params.maxResults ?? 8,
  ].join('|');
}

export function cacheTtl(params: SearchParams): number {
  return TTL_SECONDS[params.timeRange ?? 'any'] ?? TTL_SECONDS.any!;
}

export async function cachedSearch(
  cache: ResultCache | undefined,
  params: SearchParams,
  run: () => Promise<RawResult[]>
): Promise<{ results: RawResult[]; cached: boolean }> {
  if (!cache) return { results: await run(), cached: false };
  const key = cacheKey(params);
  try {
    const hit = await cache.get(key);
    if (hit) return { results: JSON.parse(hit) as RawResult[], cached: true };
  } catch {
    // A broken cache must never break a search.
  }
  const results = await run();
  if (results.length > 0) {
    await cache.put(key, JSON.stringify(results), { expirationTtl: cacheTtl(params) }).catch(() => undefined);
  }
  return { results, cached: false };
}

/** In-memory cache for tests and scripts. */
export function memoryCache(): ResultCache & { size: number } {
  const map = new Map<string, string>();
  return {
    get: async (k) => map.get(k) ?? null,
    put: async (k, v) => {
      map.set(k, v);
    },
    get size() {
      return map.size;
    },
  };
}
