import type { SourceId } from './sources';

export interface SearchConfig {
  tavily: { apiKey: string };
  naver: { clientId: string; clientSecret: string };
  timeoutMs?: number;
}
export interface SearchParams {
  query: string;
  service?: SourceId;
  timeRange?: 'day' | 'week' | 'month';
  maxResults?: number;
}
export interface RawResult {
  title: string;
  link: string;
  snippet: string;
  published_date?: string;
}
export class SearchProviderError extends Error {
  constructor(readonly provider: SourceId, readonly code: string) {
    super(`${provider}: ${code}`);
    this.name = 'SearchProviderError';
  }
}

/** Plain text only: upstream HTML is never rendered as HTML. */
export function plainText(value: unknown, limit = 1200): string {
  if (typeof value !== 'string') return '';
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·' };
  return value.slice(0, 12000)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|middot);/gi, (whole, entity: string) => {
      if (!entity.startsWith('#')) return named[entity.toLowerCase()] ?? whole;
      const n = entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '';
    })
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, limit);
}
function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 4096) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function publicationDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  // ISO day precision is retained; the pipeline also validates the calendar date.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // Only timezone-bearing ISO or RFC timestamps; do not invent a local timezone.
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
      !/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{1,2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} (?:GMT|[+-]\d{4})$/.test(value)) return undefined;
  const stamp = Date.parse(value);
  return Number.isFinite(stamp) ? new Date(stamp).toISOString().replace(/\.\d{3}Z$/, 'Z') : undefined;
}

export async function search(config: SearchConfig, params: SearchParams, signal?: AbortSignal): Promise<RawResult[]> {
  const provider = params.service ?? 'tavily';
  if (provider !== 'tavily' && provider !== 'naver') throw new Error('지원하지 않는 검색 공급자');
  signal?.throwIfAborted();
  const max = Math.max(1, Math.min(8, Math.floor(params.maxResults ?? 8)));
  const timeoutMs = Math.max(100, Math.min(15000, config.timeoutMs ?? 4000));
  const deadline = AbortSignal.timeout(timeoutMs);
  const bounded = signal ? AbortSignal.any([signal, deadline]) : deadline;
  let url: string;
  let init: RequestInit;
  if (provider === 'tavily') {
    if (!config.tavily.apiKey) throw new SearchProviderError(provider, 'NOT_CONFIGURED');
    url = 'https://api.tavily.com/search';
    init = {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.tavily.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: params.query, max_results: max, topic: 'general', search_depth: 'basic',
        auto_parameters: false, include_answer: false, include_raw_content: false,
        include_images: false, include_published_date: true,
        language: 'ko', filter_by_language: false, country: 'south korea', safe_search: true,
        ...(params.timeRange ? { time_range: params.timeRange } : {}),
      }),
    };
  } else {
    if (!config.naver.clientId || !config.naver.clientSecret) throw new SearchProviderError(provider, 'NOT_CONFIGURED');
    const endpoint = new URL('https://openapi.naver.com/v1/search/webkr.json');
    endpoint.search = new URLSearchParams({ query: params.query, display: String(max), start: '1' }).toString();
    url = endpoint.href;
    init = { headers: { 'X-Naver-Client-Id': config.naver.clientId, 'X-Naver-Client-Secret': config.naver.clientSecret } };
    // webkr has no publication-date field or date-range filter. Never fabricate either.
  }
  try {
    const response = await fetch(url, { ...init, signal: bounded, redirect: 'error' });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new SearchProviderError(provider, `HTTP_${response.status}`);
    }
    const body = object(await response.json());
    const rows = body?.[provider === 'tavily' ? 'results' : 'items'];
    if (!Array.isArray(rows)) throw new SearchProviderError(provider, 'INVALID_RESPONSE');
    const results: RawResult[] = [];
    for (const raw of rows.slice(0, max)) {
      const row = object(raw);
      if (!row) continue;
      const link = safeUrl(row[provider === 'tavily' ? 'url' : 'link']);
      const title = plainText(row.title, 300);
      if (!link || !title) continue;
      const snippet = plainText(row[provider === 'tavily' ? 'content' : 'description']);
      const published = provider === 'tavily' ? publicationDate(row.published_date) : undefined;
      results.push({ title, link, snippet, ...(published ? { published_date: published } : {}) });
    }
    bounded.throwIfAborted();
    return results;
  } catch (error) {
    signal?.throwIfAborted();
    if (error instanceof SearchProviderError) throw error;
    // Never surface URL, query, credentials or provider response bodies in errors/logs.
    throw new SearchProviderError(provider, deadline.aborted ? 'TIMEOUT' : 'INVALID_RESPONSE_OR_NETWORK');
  }
}
