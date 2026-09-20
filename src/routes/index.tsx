import { Link, createFileRoute } from '@tanstack/react-router';
import { EngineStrip } from '@/components/home-demos';
import { SearchBox } from '@/components/search-box';
import { HOME_CANONICAL } from '@/lib/seo';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ property: 'og:url', content: HOME_CANONICAL }],
    links: [{ rel: 'canonical', href: HOME_CANONICAL }],
  }),
  component: Home,
});

const EXAMPLES = [
  '코알라는 무엇을 먹어?',
  '강감찬의 귀주대첩을 알려줘',
  '최근 일주일 한국 과학 뉴스 알려줘',
  '태양과 지구 사이 거리는 얼마야?',
  '초등학생이 이해할 수 있는 광합성 설명을 찾아줘',
  '네이버 검색 API 사용 방법 알려줘',
];

/* design-structure: search-engine home · centered column, headline as the only voice, form as the CTA · footer=Ft2 */

function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 pb-12 pt-20 sm:py-20">
      <h1 className="vt-wordmark display text-center text-[clamp(2.75rem,6vw,4rem)] leading-none tracking-[-0.01em]">
        Jev <span className="text-primary">Search Kor</span>
      </h1>
      <p className="mt-4 text-center text-lg text-muted-foreground">
        Tavily·네이버 병렬 검색, Jev의 한국어 관련성·근거 평가.
      </p>
      <div className="mt-8 w-full">
        <SearchBox autoFocus />
      </div>
      <ul aria-label="한국어 검색 예시" className="mt-3 grid w-full gap-2 text-sm sm:grid-cols-2">
        {EXAMPLES.map((q) => (
          <li key={q}>
            <Link
              className="chip block h-full rounded-2xl border px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              search={{ q }}
              to="/search"
              viewTransition
            >
              {q}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-10">
        <EngineStrip />
      </div>
    </main>
  );
}
