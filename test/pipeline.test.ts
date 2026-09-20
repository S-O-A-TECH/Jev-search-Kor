import { afterEach, describe, expect, it, vi } from 'vitest';
import { runSearch, type PipelineDeps } from '@/lib/pipeline';
import { buildCandidates } from '@/lib/candidates';
import { validateAskRequest } from '@/lib/validate';
import { memoryCache } from '@/lib/cache';
const deps: PipelineDeps = {
  search: { tavily: { apiKey: 'test-t' }, naver: { clientId: 'test-n', clientSecret: 'test-s' } },
  judge: { providers: [{ provider: 'typesafe', apiKey: 'test-j' }] },
  now: () => new Date('2026-09-19T14:00:00Z'),
};
const calls: Array<{ url: string; body: any }> = [];
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
function mock(options: { failNaver?: boolean; empty?: boolean; badJudge?: boolean; window?: string; cancel?: AbortController } = {}) {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}'));
    calls.push({ url: String(url), body });
    if (String(url).includes('typesafe.ai')) {
      const answers: Record<string, unknown> = {};
      for (const id of Object.keys(body.questions)) {
        answers[id] = id === 'window' ? { type: 'choice', choice: options.window ?? 'any', confidence: 0.9 } :
          id === 'query' ? { type: 'choice', choice: 'c0', confidence: 0.9 } :
          id === 'evidence' ? { type: 'choice', choice: 'sufficient', confidence: 0.9 } :
          { type: 'noul', noul: 0.95 };
      }
      if (options.badJudge && body.questions.evidence) delete answers.r0;
      return json({ answers, usage: { input_tokens: 100, output_tokens: 2 } });
    }
    if (options.cancel) options.cancel.abort();
    if (String(url).includes('tavily.com')) return json({ results: options.empty ? [] : [
      { title: '코알라 먹이', url: 'https://example.org/koala', content: '코알라는 유칼립투스 잎을 먹는다.', published_date: '2026-09-19T00:00:00Z' },
      { title: '옛 관찰', url: 'https://example.org/old', content: '과거 자료', published_date: '2020-01-01' },
    ] });
    if (String(url).includes('naver.com')) return json(options.failNaver ? { error: 'secret' } : { items: options.empty ? [] : [
      { title: '<b>코알라</b> 먹이', link: 'https://example.org/koala?utm_source=naver', description: '코알라는 유칼립투스 잎을 먹는다.' },
      { title: '코알라 생활', link: 'https://example.org/unknown', description: '코알라 생태' },
    ] }, options.failNaver ? 429 : 200);
    throw new Error('허용하지 않은 외부 요청');
  }));
}
afterEach(() => { calls.length = 0; vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('한국어 병렬 검색과 Jev 일괄 평가', () => {
  it('두 검색 결과를 중복 제거한 뒤 한 번만 평가한다', async () => {
    mock();
    const out = await runSearch(deps, { request: '코알라는 무엇을 먹어?' });
    expect(out.sources).toEqual(['tavily', 'naver']);
    expect(out.items).toHaveLength(3);
    expect(out.items[0]?.engines).toEqual(['tavily', 'naver']);
    expect(out.evidence.status).toBe('sufficient');
    const judgeCalls = calls.filter(c => c.url.includes('typesafe.ai'));
    expect(judgeCalls).toHaveLength(2);
    expect(judgeCalls[1]?.body.state.results).toHaveLength(3);
    expect(calls).toHaveLength(4);
    expect(calls[0]?.url).toContain('typesafe.ai'); // No speculative Google/Search1API call.
    expect(out.tokens).toBe(204);
  });
  it('양쪽 검색을 동시에 시작한다', async () => {
    mock();
    const impl = globalThis.fetch;
    let release!: () => void;
    const waiting = new Promise<void>(resolve => { release = resolve; });
    const started: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (!String(url).includes('typesafe.ai')) {
        started.push(String(url));
        if (started.length === 2) release();
        await waiting;
      }
      return impl(url, init);
    }));
    const out = await runSearch(deps, { request: '강감찬 귀주대첩 알려줘' });
    expect(started).toHaveLength(2);
    expect(out.items.length).toBeGreaterThan(0);
  });
  it('명시적으로 선택한 공급자만 호출한다', async () => {
    mock(); const out = await runSearch(deps, { request: '코알라', sources: ['naver'] });
    expect(out.sources).toEqual(['naver']);
    expect(calls.some(c => c.url.includes('tavily.com'))).toBe(false);
  });
  it('네이버 실패 시 Tavily 결과와 실패 상태를 함께 돌려준다', async () => {
    mock({ failNaver: true }); const out = await runSearch(deps, { request: '코알라' });
    expect(out.items).toHaveLength(2);
    expect(out.errors).toEqual([{ source: 'naver', engine: 'naver', message: 'naver: HTTP_429' }]);
  });
  it('양쪽 빈 검색은 근거 없음이며 불필요한 평가를 호출하지 않는다', async () => {
    mock({ empty: true }); const out = await runSearch(deps, { request: '코알라' });
    expect(out.evidence.status).toBe('none');
    expect(calls.filter(c => c.url.includes('typesafe.ai'))).toHaveLength(1);
  });
  it('일괄 평가 형식 오류를 결과 없음이나 관련성 0으로 확정하지 않는다', async () => {
    mock({ badJudge: true }); const out = await runSearch(deps, { request: '코알라' });
    expect(out.evidence.status).toBe('unknown');
    expect(out.items.every(i => !i.ranked)).toBe(true);
    expect(out.judgmentError).toBeTruthy();
  });
  it('최신성 필터는 확인된 게시일에만 적용한다', async () => {
    mock({ window: '24h' }); const out = await runSearch(deps, { request: '오늘 코알라 소식' });
    expect(out.items.map(i => i.url)).not.toContain('https://example.org/old');
    expect(out.items.find(i => i.url.endsWith('/unknown'))?.ageHours).toBeNull();
    expect(out.lanes[0]?.stale).toBe(1);
  });
  it('취소 뒤 결과나 추가 Jev 평가를 전달하지 않는다', async () => {
    const controller = new AbortController(); mock({ cancel: controller });
    await expect(runSearch(deps, { request: '과학' }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls.filter(c => c.url.includes('typesafe.ai'))).toHaveLength(1);
  });
  it('Jev의 알 수 없는 시간 범위는 검색 전에 거절한다', async () => {
    mock({ window: 'invalid' });
    await expect(runSearch(deps, { request: '과학' })).rejects.toThrow('응답 형식 오류');
    expect(calls).toHaveLength(1);
  });
  it('캐시는 선택 사항이며 중복 검색만 줄인다', async () => {
    mock(); const cached = { ...deps, cache: memoryCache() };
    await runSearch(cached, { request: '코알라' }); await runSearch(cached, { request: '코알라' });
    expect(calls.filter(c => !c.url.includes('typesafe.ai'))).toHaveLength(2);
  });
  it.each(['강감찬', '해', '아내', '오늘날 한국사', '2020년과 2026년 비교', '한국 아닌 일본 역사 알려줘'])('한국어 원문 보존: %s', request => {
    expect(buildCandidates(request)[0]).toBe(request);
  });
  it('잘못된 공급자 지정은 묵시적 외부 검색으로 바꾸지 않는다', () => {
    expect(() => validateAskRequest({ q: '과학', s: ['google'] })).toThrow();
    expect(validateAskRequest({ q: '과학', s: ['naver', 'naver'] }).s).toEqual(['naver']);
  });
});
