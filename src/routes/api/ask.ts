import { createFileRoute } from '@tanstack/react-router';
import { askStream, runSearch, type AskEvent } from '@/lib/pipeline';
import { validateAskRequest } from '@/lib/validate';
import { getEnv, getJudgeConfig } from '@/server/env.server';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return request.headers.get('sec-fetch-site') === 'same-origin';
  return origin === new URL(request.url).origin;
}

function clientKey(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'anonymous'
  );
}

async function boundedBody(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        throw new RangeError('REQUEST_TOO_LARGE');
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally { reader.releaseLock(); }
}

/**
 * POST /api/ask → newline-delimited JSON, one AskEvent per line, in the order
 * they happen: intent, then each source as it finishes, then done.
 */
export const Route = createFileRoute('/api/ask')({
  server: {
    handlers: {
      POST: async ({ request }) => {


        let env: ReturnType<typeof getEnv>;
        try {
          env = getEnv();
        } catch (error) {
          return json(503, { error: '검색 서버 설정을 확인해 주세요.' });
        }

        // Public exposure requires a protected gateway. Remote callers must supply a server-held token.
        const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
        const authorized = env.SEARCH_API_TOKEN && request.headers.get('authorization') === `Bearer ${env.SEARCH_API_TOKEN}`;
        if (!authorized && !(local && sameOrigin(request))) return json(403, { error: '접근 권한이 없습니다.' });
        if (Number(request.headers.get('content-length') ?? 0) > 4096) return json(413, { error: '요청이 너무 큽니다.' });

        let data: ReturnType<typeof validateAskRequest>;
        try {
          const body = await boundedBody(request);
          if (body.length > 4096) return json(413, { error: '요청이 너무 큽니다.' });
          data = validateAskRequest(JSON.parse(body));
        } catch (error) {
          return json(error instanceof RangeError ? 413 : 400, { error: '검색 요청 형식이 잘못되었거나 너무 큽니다.' });
        }

        if (env.SEARCH_RATE_LIMIT) {
          const { success } = await env.SEARCH_RATE_LIMIT.limit({ key: clientKey(request) });
          if (!success) {
            return json(429, { error: '요청이 많습니다. 잠시 후 다시 검색해 주세요.' });
          }
        }

        const deps = {
          search: {
            tavily: { apiKey: env.TAVILY_API_KEY ?? '' },
            naver: { clientId: env.NAVER_CLIENT_ID ?? '', clientSecret: env.NAVER_CLIENT_SECRET ?? '' },
          },
          judge: getJudgeConfig(env),
          cache: env.CACHE,
        };
        const stop = new AbortController();
        const signal = AbortSignal.any([request.signal, stop.signal, AbortSignal.timeout(15_000)]);
        const input = { request: data.q, window: data.w, sources: data.s };
        if (request.headers.get('accept') === 'application/json') {
          try { return json(200, await runSearch(deps, input, signal)); }
          catch { return json(502, { error: '검색에 실패했거나 제한 시간을 초과했습니다.' }); }
          finally { stop.abort(); }
        }
        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (event: AskEvent | { type: 'error'; message: string }) =>
              !stop.signal.aborted && controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
            try {
              for await (const event of askStream(deps, input, signal)) {
                send(event);
              }
            } catch (error) {
              const message = '검색에 실패했거나 제한 시간을 초과했습니다.';
              send({ type: 'error', message });
            } finally {
              if (!stop.signal.aborted) controller.close();
              stop.abort();
            }
          },
          cancel() { stop.abort(); },
        });
        return new Response(stream, {
          headers: {
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Accel-Buffering': 'no',
          },
        });
      },
    },
  },
});
