import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (config: unknown) => config }));
vi.mock('@/server/env.server', () => ({ getEnv: vi.fn(), getJudgeConfig: vi.fn(() => ({ providers: [] })) }));
vi.mock('@/lib/pipeline', () => ({
  runSearch: vi.fn(async () => ({ items: [], evidence: { status: 'none', confidence: 1 } })),
  askStream: vi.fn(async function* () { yield { type: 'done', tokens: 0, totalMs: 1, evidence: { status: 'none', confidence: 1 } }; }),
}));
import { Route } from '@/routes/api/ask';
import { getEnv } from '@/server/env.server';
import { runSearch, askStream } from '@/lib/pipeline';
const post = (Route as unknown as { server: { handlers: { POST: (ctx: { request: Request }) => Promise<Response> } } }).server.handlers.POST;
function req(body: unknown = { q: '코알라는 무엇을 먹어?' }, remote = false, headers: Record<string, string> = {}) {
  const origin = remote ? 'https://search.example.org' : 'http://localhost:3030';
  return new Request(origin + '/api/ask', { method: 'POST', headers: { origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.mocked(getEnv).mockReturnValue({ TAVILY_API_KEY: 'test', SEARCH_API_TOKEN: 'server-token' } as ReturnType<typeof getEnv>);
});
afterEach(() => { vi.clearAllMocks(); });
describe('검색 API 접근과 오류 경계', () => {
  it('로컬 동일 출처 JSON 요청을 처리한다', async () => {
    const response = await post({ request: req(undefined, false, { accept: 'application/json' }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty('evidence.status', 'none');
    expect(runSearch).toHaveBeenCalledOnce();
  });
  it('원격 요청은 같은 출처라도 토큰 없이 거절한다', async () => {
    expect((await post({ request: req(undefined, true) })).status).toBe(403);
    expect(runSearch).not.toHaveBeenCalled();
    expect(askStream).not.toHaveBeenCalled();
  });
  it('토큰을 가진 서버 요청만 원격 JSON에 접근한다', async () => {
    expect((await post({ request: req(undefined, true, { authorization: 'Bearer server-token', accept: 'application/json' }) })).status).toBe(200);
  });
  it('로컬의 교차 출처 요청을 거절한다', async () => {
    expect((await post({ request: req(undefined, false, { origin: 'https://attacker.example' }) })).status).toBe(403);
  });
  it('Content-Length 없이도 큰 본문을 제한한다', async () => {
    expect((await post({ request: req({ q: '가'.repeat(5000) }) })).status).toBe(413);
    expect(runSearch).not.toHaveBeenCalled();
  });
  it('지원하지 않는 공급자는 검색 전에 거절한다', async () => {
    expect((await post({ request: req({ q: '과학', s: ['google'] }) })).status).toBe(400);
    expect(askStream).not.toHaveBeenCalled();
  });
  it('요청 횟수 제한을 적용한다', async () => {
    vi.mocked(getEnv).mockReturnValue({ TAVILY_API_KEY: 'test', SEARCH_RATE_LIMIT: { limit: async () => ({ success: false }) } } as unknown as ReturnType<typeof getEnv>);
    expect((await post({ request: req() })).status).toBe(429);
  });
  it('환경 예외에 들어 있는 비밀 값을 반환하지 않는다', async () => {
    vi.mocked(getEnv).mockImplementationOnce(() => { throw new Error('private-query secret-value'); });
    const response = await post({ request: req() });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('secret');
  });
  it('NDJSON은 완료 이벤트와 no-store를 전달한다', async () => {
    const response = await post({ request: req() });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toContain('"type":"done"');
  });
  it('스트림 소비자 취소를 하위 호출에 전파한다', async () => {
    let aborted = false;
    vi.mocked(askStream).mockImplementationOnce(async function* (_deps, _input, signal) {
      yield { type: 'done', tokens: 0, totalMs: 0, evidence: { status: 'none', confidence: 1 } };
      await new Promise<void>(resolve => signal!.addEventListener('abort', () => { aborted = true; resolve(); }, { once: true }));
    });
    const response = await post({ request: req() });
    const reader = response.body!.getReader();
    await reader.read();
    await reader.cancel();
    expect(aborted).toBe(true);
  });
});
