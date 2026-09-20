import type { AskState } from '@/lib/use-ask';
import { sourceById } from '@/lib/sources';

const evidenceLabels = { sufficient: '근거 충분', partial: '근거 일부 부족', none: '답변 근거 없음', conflicting: '근거 상충', unknown: '근거 평가 미완료' };
export function Working({ state, actions }: { state: AskState; actions?: React.ReactNode }) {
  if (state.phase === 'idle' || state.phase === 'error') return null;
  const done = state.phase === 'done';
  return (
    <section className="mt-4 text-sm" aria-live="polite">
      <div className="flex justify-between gap-3">
        <p>{!state.intent ? '한국어 질문을 분석하고 있습니다…' : done ? '검색 완료' : '검색 결과를 모아 Jev가 평가하고 있습니다…'}
          {state.totalMs !== null && ` · ${(state.totalMs / 1000).toFixed(2)}초`}</p>
        {actions}
      </div>
      {state.intent && <p className="mt-2 text-muted-foreground">검색어: {state.intent.query}</p>}
      <ul className="mt-2 text-muted-foreground">
        {state.intent?.sources.map((source) => {
          const lane = state.lanes[`${source}/${source}`];
          const count = state.found[`${source}/${source}`];
          return <li key={source}>{sourceById(source).label}: {lane?.error ? '검색 실패 (다른 공급자 결과 유지)' : count === undefined ? '검색 중…' : `${count}건 검색됨`}</li>;
        })}
      </ul>
      {state.evidence && <p className="mt-2">{evidenceLabels[state.evidence.status]} · 이는 발췌문 평가이며 사실 확인의 보증은 아닙니다.</p>}
      {state.message && <p role="alert" className="mt-2 text-destructive">{state.message}</p>}
    </section>
  );
}
