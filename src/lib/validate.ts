import { isSourceId, isWindowId, type SourceId, type WindowId } from './sources';

export interface AskRequest {
  q: string;
  w?: WindowId;
  s?: SourceId[];
}

export function validateAskRequest(input: unknown): AskRequest {
  if (typeof input !== 'object' || input === null) {
    throw new Error('검색 요청 형식 오류');
  }
  const { q, w, s } = input as Record<string, unknown>;
  if (typeof q !== 'string' || q.trim().length === 0 || q.length > 300) {
    throw new Error('검색어는 1~300자여야 합니다.');
  }
  const out: AskRequest = { q: q.trim() };
  if (w !== undefined) {
    if (typeof w !== 'string' || !isWindowId(w)) throw new Error('지원하지 않는 검색 기간');
    out.w = w;
  }
  if (s !== undefined) {
    if (!Array.isArray(s) || !s.length || s.some((v) => typeof v !== 'string' || !isSourceId(v))) throw new Error('지원하지 않는 검색 공급자');
    out.s = [...new Set(s as SourceId[])];
  }
  return out;
}
