import { afterEach, describe, expect, it, vi } from 'vitest';
import { search, plainText, type SearchConfig } from '@/lib/search-providers';
const config: SearchConfig = { tavily: { apiKey: 'test-tavily' }, naver: { clientId: 'test-id', clientSecret: 'test-secret' } };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

describe('한국어 검색 공급자 계약', () => {
  it('Tavily의 RFC 게시일을 UTC ISO로 정규화한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ results: [
      { title: '과학', url: 'https://example.org', content: '내용', published_date: 'Sat, 19 Sep 2026 09:00:00 GMT' },
    ] })));
    expect((await search(config, { query: '과학' }))[0]?.published_date).toBe('2026-09-19T09:00:00Z');
  });
  it('Tavily에 한국어 우선·basic·생성 답변 없음으로 요청한다', async () => {
    const fetcher = vi.fn(async () => json({ results: [{ title: '코알라', url: 'https://example.org/ko', content: '유칼립투스', published_date: '2026-09-19' }] }));
    vi.stubGlobal('fetch', fetcher);
    const rows = await search(config, { query: '코알라는 무엇을 먹어?', service: 'tavily', timeRange: 'week' });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.tavily.com/search');
    expect(JSON.parse(String(init.body))).toMatchObject({ query: '코알라는 무엇을 먹어?', language: 'ko', country: 'south korea', filter_by_language: false, search_depth: 'basic', auto_parameters: false, include_answer: false, include_raw_content: false, time_range: 'week', max_results: 8 });
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer test-tavily');
    expect(rows[0]).toMatchObject({ title: '코알라', published_date: '2026-09-19' });
  });
  it('네이버 GET과 두 인증 헤더를 사용하고 lastBuildDate를 게시일로 쓰지 않는다', async () => {
    const fetcher = vi.fn(async () => json({ lastBuildDate: '2026-09-19', items: [{ title: '<b>강감찬</b> &amp; 귀주대첩', link: 'https://example.org/history', description: '1019년 &lt;b&gt;승리&lt;/b&gt;' }] }));
    vi.stubGlobal('fetch', fetcher);
    const rows = await search(config, { query: '강감찬 귀주대첩', service: 'naver', timeRange: 'day' });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/v1/search/webkr.json');
    expect(parsed.searchParams.get('query')).toBe('강감찬 귀주대첩');
    expect(parsed.searchParams.has('time_range')).toBe(false);
    expect(new Headers(init.headers).get('X-Naver-Client-Secret')).toBe('test-secret');
    expect(rows).toEqual([{ title: '강감찬 & 귀주대첩', link: 'https://example.org/history', snippet: '1019년 승리' }]);
  });
  it('허위 프로토콜·잘못된 행을 제거하고 텍스트 길이를 제한한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ results: [
      null, { title: '링크', url: 'javascript:alert(1)' }, { title: '링크', url: 'https://secret@example.org' },
      { title: '정상', url: 'https://example.org', content: '가'.repeat(2000) },
    ] })));
    const rows = await search(config, { query: '과학 이야기' });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.snippet).toHaveLength(1200);
    expect(plainText('<script>비밀</script>한국 &amp; &#9999999999;')).toBe('한국 &');
  });
  it.each([401, 429, 503])('HTTP %s 오류 본문을 노출하지 않는다', async (status) => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'private-query test-secret' }, status)));
    await expect(search(config, { query: '공개 과학 질문' })).rejects.toMatchObject({ message: `tavily: HTTP_${status}` });
  });
  it('잘못된 JSON 구조와 빈 결과를 구분한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ invalid: [] })));
    await expect(search(config, { query: '과학' })).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('키가 없으면 외부 요청을 하지 않는다', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(search({ ...config, naver: { clientId: '', clientSecret: '' } }, { query: '과학', service: 'naver' })).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('기존 취소 신호는 호출 전에 전파한다', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const controller = new AbortController(); controller.abort();
    await expect(search(config, { query: '과학' }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('4초 공급자 기한과 사용자 취소를 전파한다', async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(ms => {
      const c = new AbortController(); setTimeout(() => c.abort(new DOMException('timeout', 'TimeoutError')), ms); return c.signal;
    });
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    })));
    const pending = expect(search(config, { query: '과학' })).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(4000); await pending;
    const c = new AbortController();
    const canceled = expect(search(config, { query: '과학' }, c.signal)).rejects.toMatchObject({ name: 'AbortError' });
    c.abort(); await canceled;
    vi.clearAllTimers();
  });
});
