export type SourceId = 'tavily' | 'naver';
export interface Lane { service: SourceId; }
export interface Source { id: SourceId; label: string; lanes: Lane[]; defaultOn: boolean; }
export const SOURCES: readonly Source[] = [
  { id: 'tavily', label: 'Tavily', lanes: [{ service: 'tavily' }], defaultOn: true },
  { id: 'naver', label: '네이버', lanes: [{ service: 'naver' }], defaultOn: true },
];
export const SOURCE_IDS = SOURCES.map((s) => s.id);
export const DEFAULT_SOURCE_IDS = [...SOURCE_IDS];
export function isSourceId(value: string): value is SourceId { return SOURCE_IDS.includes(value as SourceId); }
export function sourceById(id: SourceId): Source {
  const source = SOURCES.find((s) => s.id === id);
  if (!source) throw new Error('지원하지 않는 검색 공급자');
  return source;
}
export type WindowId = 'any' | '24h' | '7d' | '30d';
export interface Window {
  id: WindowId; label: string; hours: number;
  timeRange?: 'day' | 'week' | 'month'; description: string;
}
export const WINDOWS: readonly Window[] = [
  { id: 'any', label: '전체 기간', hours: Infinity, description: '최신성 요구 없음. 일반 상식, 정의, 과거 역사 등.' },
  { id: '24h', label: '최근 24시간', hours: 24, timeRange: 'day', description: '오늘, 방금, 현재의 소식이나 지난 하루의 새 정보.' },
  { id: '7d', label: '최근 일주일', hours: 168, timeRange: 'week', description: '이번 주 또는 최근 일주일의 소식.' },
  { id: '30d', label: '최근 한 달', hours: 720, timeRange: 'month', description: '이번 달, 최근 한 달의 소식.' },
];
export const DEFAULT_WINDOW: WindowId = 'any';
export function isWindowId(value: string): value is WindowId { return WINDOWS.some((w) => w.id === value); }
export function windowById(id: WindowId): Window {
  const window = WINDOWS.find((w) => w.id === id);
  if (!window) throw new Error('지원하지 않는 검색 기간');
  return window;
}
