import { cachedSearch, type ResultCache } from './cache';
import { buildCandidates } from './candidates';
import { freshnessScore, isPublicationStale, resolvePublication, } from './freshness';
import { mergeItems } from './merge';
import { canonicalUrl, compareItems, type RankedItem } from './rank';
import { search, SearchProviderError, type SearchConfig, type SearchParams } from './search-providers';
import {
  DEFAULT_SOURCE_IDS,
  DEFAULT_WINDOW,
  windowById,
  type SourceId,
  type WindowId,
} from './sources';
import { inferIntent, rerank, type Intent, type JudgeConfig, type ProviderId, type Evidence } from './typesafe';

export interface SearchInput {
  request: string;
  /** Explicit user choice; undefined lets the judge decide. */
  window?: WindowId;
  /** Explicit user choice; undefined lets the judge decide. */
  sources?: SourceId[];
}

export interface LaneError {
  source: SourceId;
  engine: string;
  message: string;
}

export interface IntentEvent {
  type: 'intent';
  request: string;
  /** Keyword query actually sent to the engines. */
  query: string;
  /** Name-or-title query sent to catalogue engines such as IMDb. */
  entityQuery: string;
  candidates: string[];
  window: WindowId;
  sources: SourceId[];
  inferred: {
    window: Intent['window'];
    sources: Intent['sources'];
    query: Intent['query'];
    entity: Intent['entity'];
  };
  intentMs: number;
  /** Jev provider that interpreted the request. */
  judge: ProviderId;
}

/** An engine has answered; the UI shows its count while the judge scores its rows. */
export interface FoundEvent {
  type: 'found';
  source: SourceId;
  engine: string;
  items: RankedItem[];
  searchMs: number;
}

export interface LaneEvent {
  type: 'lane';
  source: SourceId;
  engine: string;
  /** Scored results from this engine; empty when it failed. */
  items: RankedItem[];
  /** Rows the engine returned but which were provably older than the window. */
  stale: number;
  /** Engine round trip. */
  searchMs: number;
  /** Judge round trip for this lane's rows. */
  scoreMs: number;
  error?: string;
}

export interface DoneEvent {
  type: 'done';
  totalMs: number;
  tokens: number;
  evidence: Evidence;
  judgmentError?: string;
}

export type AskEvent = IntentEvent | FoundEvent | LaneEvent | DoneEvent;

const RESULTS_PER_PROVIDER = 8;
export interface PipelineDeps {
  search: SearchConfig;
  judge: JudgeConfig;
  /** Opt-in only for non-sensitive public queries. No cache binding in default deployment. */
  cache?: ResultCache;
  now?: () => Date;
}

export async function* askStream(deps: PipelineDeps, input: SearchInput, signal?: AbortSignal): AsyncGenerator<AskEvent> {
  const stop = new AbortController();
  const lifetime = AbortSignal.any([stop.signal, AbortSignal.timeout(15000), ...(signal ? [signal] : [])]);
  const started = performance.now();
  const now = deps.now?.() ?? new Date();
  const request = input.request.trim();
  if (!request || request.length > 300) throw new Error('검색어는 1~300자여야 합니다.');
  const candidates = buildCandidates(request);
  try {
    lifetime.throwIfAborted();
    const intent = await inferIntent(deps.judge, { request, candidates, now },
      AbortSignal.any([lifetime, AbortSignal.timeout(3000)]));
    lifetime.throwIfAborted();
    const window = input.window ?? intent.window.choice ?? DEFAULT_WINDOW;
    const sources = [...new Set(input.sources?.length ? input.sources : DEFAULT_SOURCE_IDS)];
    const query = candidates[intent.query.index] ?? candidates[0]!;
    const win = windowById(window);
    let tokens = intent.usage.input_tokens + intent.usage.output_tokens;
    yield {
      type: 'intent', request, query, entityQuery: query, candidates, window, sources,
      inferred: { window: intent.window, sources: intent.sources, query: intent.query, entity: intent.entity },
      intentMs: Math.round(performance.now() - started), judge: intent.provider,
    };

    const runLane = async (source: SourceId): Promise<LaneEvent> => {
      const t0 = performance.now();
      try {
        lifetime.throwIfAborted();
        const params: SearchParams = { query, service: source, maxResults: RESULTS_PER_PROVIDER, timeRange: win.timeRange };
        const { results } = await cachedSearch(deps.cache, params, () => search(deps.search, params, lifetime));
        lifetime.throwIfAborted();
        const items: RankedItem[] = [];
        let stale = 0;
        results.forEach((row, i) => {
          // Snippet date mentions are not reliable publication dates, especially in Korean history queries.
          const publication = resolvePublication(row.published_date, '', now.getTime());
          if (isPublicationStale(publication, win.hours)) { stale++; return; }
          items.push({
            id: `${source}:${i + 1}`, source, title: row.title, url: row.link, snippet: row.snippet,
            ...publication, relevance: 0, ranked: false, freshness: freshnessScore(publication.ageHours, win.hours),
            position: i + 1, engines: [source],
          });
        });
        return { type: 'lane', source, engine: source, items, stale, searchMs: Math.round(performance.now() - t0), scoreMs: 0 };
      } catch (error) {
        // Sanitize every path, including cache/fetch implementation failures.
        const message = error instanceof SearchProviderError ? error.message : '검색이 취소되었거나 실패했습니다.';
        return { type: 'lane', source, engine: source, items: [], stale: 0, searchMs: Math.round(performance.now() - t0), scoreMs: 0, error: message };
      }
    };
    // Both requests start here; no speculative call before the route/intent decision.
    const pending = new Map(sources.map((source) => [source, runLane(source)]));
    const lanes = new Map<SourceId, LaneEvent>();
    while (pending.size) {
      const lane = await Promise.race(pending.values());
      pending.delete(lane.source);
      lifetime.throwIfAborted();
      lanes.set(lane.source, lane);
      yield { type: 'found', source: lane.source, engine: lane.engine, items: lane.items, searchMs: lane.searchMs };
    }
    // Stable source order makes IDs/provenance independent of network completion order.
    let items: RankedItem[] = [];
    for (const source of sources) items = mergeItems(items, lanes.get(source)!.items);
    let evidence: Evidence = { status: 'none', confidence: 1 };
    let judgmentError: string | undefined;
    const scoreStart = performance.now();
    if (items.length) {
      try {
        const scored = await rerank(deps.judge, request, items.map((i) => ({
          id: i.id, source: i.engines.join(','), title: i.title, snippet: i.snippet,
          url: i.url, publishedDate: i.publishedDate,
        })), AbortSignal.any([lifetime, AbortSignal.timeout(3000)]), { window, now: now.toISOString() });
        lifetime.throwIfAborted();
        tokens += scored.usage.input_tokens + scored.usage.output_tokens;
        evidence = scored.evidence;
        items = items.map((item) => ({ ...item, ranked: true, relevance: scored.relevance[item.id]! }));
      } catch {
        lifetime.throwIfAborted();
        evidence = { status: 'unknown', confidence: 0 };
        judgmentError = 'Jev 평가 실패: 검색 결과는 미검증 상태입니다.';
      }
    } else if ([...lanes.values()].some((lane) => lane.error)) {
      evidence = { status: 'unknown', confidence: 0 };
    }
    const byUrl = new Map(items.map((item) => [canonicalUrl(item.url), item]));
    for (const source of sources) {
      const lane = lanes.get(source)!;
      yield { ...lane, items: lane.items.map((item) => byUrl.get(canonicalUrl(item.url))!), scoreMs: Math.round(performance.now() - scoreStart) };
    }
    lifetime.throwIfAborted();
    yield { type: 'done', totalMs: Math.round(performance.now() - started), tokens, evidence, ...(judgmentError ? { judgmentError } : {}) };
  } finally {
    stop.abort(); // Closing the iterator cancels any unfinished provider requests.
  }
}

export interface SearchOutput extends Omit<IntentEvent, 'type'> {
  items: RankedItem[]; lanes: LaneEvent[]; errors: LaneError[];
  totalMs: number; tokens: number; evidence: Evidence; judgmentError?: string;
}
export async function runSearch(deps: PipelineDeps, input: SearchInput, signal?: AbortSignal): Promise<SearchOutput> {
  let intent: IntentEvent | undefined;
  let done: DoneEvent | undefined;
  let items: RankedItem[] = [];
  const lanes: LaneEvent[] = [];
  const errors: LaneError[] = [];
  for await (const event of askStream(deps, input, signal)) {
    if (event.type === 'intent') intent = event;
    else if (event.type === 'lane') {
      lanes.push(event); items = mergeItems(items, event.items);
      if (event.error) errors.push({ source: event.source, engine: event.engine, message: event.error });
    } else if (event.type === 'done') done = event;
  }
  if (!intent || !done) throw new Error('검색이 완료되지 않았습니다.');
  const { type: _intent, ...rest } = intent;
  const { type: _done, ...summary } = done;
  items.sort((a, b) => compareItems(a, b, 'best'));
  return { ...rest, ...summary, items, lanes, errors };
}
