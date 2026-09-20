import { HeadContent, Link, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { PwaRegister } from '@/components/pwa-register';
import { RepositoryLink } from '@/components/repository-link';
import { THEME_SURFACE, ThemeToggle, themeScript } from '@/components/theme-toggle';
import { SHARE_IMAGE } from '@/lib/seo';
import appCss from '../styles.css?url';

const TITLE = 'Jev Search Kor — 한국어 검색과 근거 평가';
const DESCRIPTION = 'Tavily·네이버를 병렬 검색하고 Jev가 관련성과 답변 근거를 평가합니다.';
const SHARE_IMAGE_ALT = 'Jev Search Kor 한국어 검색';

export const Route = createRootRoute({
  head: () => ({
    links: [
      { href: appCss, rel: 'stylesheet' },
      { href: '/favicon.png', rel: 'icon', type: 'image/png', sizes: '400x400' },
      { href: '/apple-touch-icon.png?v=typesafe', rel: 'apple-touch-icon', sizes: '400x400' },
      { href: '/manifest.webmanifest', rel: 'manifest' },
    ],
    meta: [
      { charSet: 'utf-8' },
      { content: 'width=device-width, initial-scale=1', name: 'viewport' },
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Jev Search Kor' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Jev Search Kor' },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:image', content: SHARE_IMAGE },
      { property: 'og:image:type', content: 'image/png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: SHARE_IMAGE_ALT },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: TITLE },
      { name: 'twitter:description', content: DESCRIPTION },
      { name: 'twitter:image', content: SHARE_IMAGE },
      { name: 'twitter:image:alt', content: SHARE_IMAGE_ALT },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
});

function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">페이지가 없습니다</h1>
      <p className="mt-2 text-muted-foreground">주소를 확인해 주세요.</p>
      <Link className="mt-6 inline-block text-link underline" to="/">
        검색으로 돌아가기
      </Link>
    </main>
  );
}

function RootDocument({ children }: { readonly children: ReactNode }) {
  const isHome = useRouterState({ select: (state) => state.location.pathname === '/' });

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta content={THEME_SURFACE.light} name="theme-color" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body className="min-h-dvh flex flex-col">
        {isHome && (
          <div className="absolute right-4 top-4 flex items-center gap-1 sm:right-6">
            <ThemeToggle />
            <RepositoryLink />
          </div>
        )}
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="border-t px-4 py-4 text-xs text-muted-foreground">
          <div className={isHome ? 'mx-auto max-w-5xl text-center' : 'mx-auto max-w-5xl'}>
            <nav
              aria-label="Jev 프로젝트와 커뮤니티"
              className={`mb-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm ${isHome ? 'justify-center' : ''}`}
            >
              <a
                className="inline-flex min-h-11 items-center text-foreground/80 hover:text-primary-text hover:underline"
                href="https://github.com/fatwang2/awesome-jev"
                rel="noreferrer"
                target="_blank"
              >
                Jev 프로젝트 모음
              </a>
              <a
                className="inline-flex min-h-11 items-center text-foreground/80 hover:text-primary-text hover:underline"
                href="https://www.reddit.com/r/typesafe_jev/"
                rel="noreferrer"
                target="_blank"
              >
                Jev 커뮤니티
              </a>
            </nav>
            <span>
              S-O-A-TECH · Tavily·네이버 검색 + TypeSafe Jev 평가 · 생성 답변 없음.
              검색어와 결과 발췌문은 해당 외부 API로 전달됩니다. 민감한 개인정보를 입력하지 마세요.
            </span>
          </div>
        </footer>
        <Scripts />
        <PwaRegister />

      </body>
    </html>
  );
}
