import { env as workerEnv } from 'cloudflare:workers';
import { judgeConfig } from '@/lib/judge-config';

export function getEnv() {
  // Optional bindings and secrets may be removed by self-hosters without changing application code.
  const env: typeof workerEnv & {
    CACHE?: KVNamespace;
    TAVILY_API_KEY?: string;
    NAVER_CLIENT_ID?: string;
    NAVER_CLIENT_SECRET?: string;
    SEARCH_API_TOKEN?: string;
    SEARCH_RATE_LIMIT?: RateLimit;
    AI?: Ai;
    TYPESAFE_API_KEY?: string;
    AI_GATEWAY_API_KEY?: string;
    JEV_PROVIDERS?: string;
  } = workerEnv;
  if (!env.TAVILY_API_KEY && !(env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET)) {
    throw new Error('Tavily 또는 네이버 검색 인증 정보가 필요합니다.');
  }
  // Throws when no Jev provider has credentials.
  judgeConfig(env);
  return env;
}

/** The Jev provider chain derived from the Worker environment. */
export function getJudgeConfig(env: ReturnType<typeof getEnv>) {
  return judgeConfig(env);
}
