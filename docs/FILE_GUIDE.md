# 모든 파일의 역할

GitHub 파일 목록에 보이는 짧은 문장은 **마지막 변경 커밋의 제목**이지 파일 설명 필드가 아닙니다. 아래는 이 저장소의 추적 파일 각각에 대한 설명입니다. 바이너리·자동 생성 파일에도 역할을 부여하되, 설명 때문에 내용이나 공개 이력을 불필요하게 변경하지 않습니다.

## 시작·설정·정책

| 파일 | 역할 |
|---|---|
| [README.md](../README.md) | 한국형 검색엔진의 목적, 한국어 특화, 비용 경계, 설치·API·지원 범위 안내 |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | 한국어 기준 개발·검증·문서 갱신·커밋 작성 지침 |
| [SECURITY.md](../SECURITY.md) | 비밀정보 보호와 취약점 보고 기준 |
| [LICENSE](../LICENSE) | 원본 저작권 표시를 보존한 MIT 소프트웨어 라이선스 |
| [design-context.md](../design-context.md) | 한국어 UI와 근거 부족·상충·미평가 표시의 디자인 기준 |
| [.dev.vars.example](../.dev.vars.example) | 로컬 Worker용 서버 비밀값의 빈 템플릿 및 타입 생성 입력 |
| [.env.example](../.env.example) | 환경 변수 이름 참고용 템플릿. 로컬 실행은 `.dev.vars` 사용 |
| [.gitignore](../.gitignore) | 비밀값·의존성·생성물 등의 Git 추적 제외 규칙 |
| [package.json](../package.json) | 프로젝트 정보, Node·pnpm 버전, 의존성 및 실행 명령 |
| [pnpm-lock.yaml](../pnpm-lock.yaml) | 재현 가능한 의존성 설치를 위한 잠금 파일. 설명 수정 목적으로 편집하지 않음 |
| [components.json](../components.json) | UI 컴포넌트 도구의 스타일·경로 별칭 설정 |
| [tsconfig.json](../tsconfig.json) | TypeScript 검사·모듈·경로 별칭 설정 |
| [tsr.config.json](../tsr.config.json) | 파일 기반 라우트 생성기 설정 |
| [vite.config.ts](../vite.config.ts) | React·TanStack Start·Cloudflare·스타일 빌드 플러그인 설정 |
| [vitest.config.ts](../vitest.config.ts) | 키 없이 실행하는 테스트 환경과 파일 선택 설정 |
| [wrangler.jsonc](../wrangler.jsonc) | Worker 이름·호환 날짜·모델·요청 제한·공개 URL·관측 설정 |
| [worker-configuration.d.ts](../worker-configuration.d.ts) | `pnpm cf-typegen`으로 생성하는 Worker 런타임·환경 타입. 수동 편집 대상 아님 |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | 설치·라우트/타입 생성·시험·빌드·배포 dry-run을 수행하는 CI |

## 설계·검증·출처 문서

| 파일 | 역할 |
|---|---|
| [docs/FILE_GUIDE.md](FILE_GUIDE.md) | 현재 읽는 전체 파일 역할 안내서 |
| [docs/ARCHITECTURE.md](ARCHITECTURE.md) | 모듈 책임, 호출 예산, 검색과 외부 RAG·답변 시스템의 경계 |
| [docs/VERIFICATION.md](VERIFICATION.md) | 실제 수행한 검증과 미수행 API·품질·성능 시험 구분 |
| [docs/PROVENANCE.md](PROVENANCE.md) | 원본 프로젝트·기준 커밋·파생 방식·Git 이력 복원 설명 |
| [docs/upstream-history.bundle](upstream-history.bundle) | 원본과 파생 개발 이력을 보존한 Git 바이너리 묶음. 실행 코드·검색 데이터가 아님 |

## 앱 진입점과 HTTP 경로

| 파일 | 역할 |
|---|---|
| [src/start.ts](../src/start.ts) | TanStack Start 초기화와 서버 함수 CSRF 미들웨어 설정 |
| [src/router.tsx](../src/router.tsx) | 생성된 라우트 트리로 앱 라우터 구성 |
| [src/styles.css](../src/styles.css) | 전역 스타일·색상·테마·공통 시각 규칙 |
| [src/routes/__root.tsx](../src/routes/__root.tsx) | 공통 HTML 문서, 페이지 메타데이터, 테마·PWA 기본 구성 |
| [src/routes/index.tsx](../src/routes/index.tsx) | 한국어 검색 홈과 예시 질문 진입 화면 |
| [src/routes/search.tsx](../src/routes/search.tsx) | 검색 URL 매개변수와 결과·필터·진행 UI 연결 |
| [src/routes/api/ask.ts](../src/routes/api/ask.ts) | `POST /api/ask` 인증·출처/본문 검사·제한·JSON/NDJSON 응답 |
| [src/server/env.server.ts](../src/server/env.server.ts) | 서버 전용 환경과 Jev 구성 연결. 키의 브라우저 노출 방지 경계 |

## 검색·판정 로직과 클라이언트 상태

| 파일 | 역할 |
|---|---|
| [src/lib/candidates.ts](../src/lib/candidates.ts) | 한국어 원문을 보존한 검색어 후보와 최소 축약 후보 생성 |
| [src/lib/typesafe.ts](../src/lib/typesafe.ts) | Jev HTTP 계약, 제공자 호환 처리, 의도·관련성·근거의 구조화된 판정 |
| [src/lib/judge-config.ts](../src/lib/judge-config.ts) | 환경 변수에서 활성 Jev 제공자 순서·모델·인증 구성. 기본은 TypeSafe |
| [src/lib/search-providers.ts](../src/lib/search-providers.ts) | Tavily POST·기존 네이버 webkr GET, 인증·기한·안전한 URL·텍스트·게시일 정규화 |
| [src/lib/pipeline.ts](../src/lib/pipeline.ts) | 의도 판단 → 병렬 검색 → 중복 병합 → Jev 일괄 평가와 이벤트·취소·오류 관리 |
| [src/lib/sources.ts](../src/lib/sources.ts) | Tavily·네이버 공급자 목록과 한국어 검색 기간 선택지 정의 |
| [src/lib/validate.ts](../src/lib/validate.ts) | 질문 길이·자료형·공급자·기간 입력 검증 |
| [src/lib/cache.ts](../src/lib/cache.ts) | 선택적 공급자 결과 캐시·TTL과 시험용 메모리 캐시. 기본 배포에는 캐시 연결 없음 |
| [src/lib/freshness.ts](../src/lib/freshness.ts) | 게시일 검증·경과 시간·기간 판정·날짜 표시. 한국어 실행 경로는 발췌 날짜 추측을 사용하지 않음 |
| [src/lib/rank.ts](../src/lib/rank.ts) | URL 정규화, 관련성·최신성 정렬, 유사 제목 결과 묶음 |
| [src/lib/merge.ts](../src/lib/merge.ts) | 같은 URL의 결과와 공급자 출처·점수·게시일 병합 |
| [src/lib/stable-order.ts](../src/lib/stable-order.ts) | 스트리밍 중 이미 표시한 결과의 순서 변경을 줄이는 배치 계산 |
| [src/lib/use-stable-order.ts](../src/lib/use-stable-order.ts) | 안정적 결과 배치를 React 상태와 연결하는 훅 |
| [src/lib/use-ask.ts](../src/lib/use-ask.ts) | 검색 요청·NDJSON 소비·진행 상태·결과·오류·취소를 다루는 React 훅 |
| [src/lib/seo.ts](../src/lib/seo.ts) | 사이트 원점·대표 URL·공유 이미지·검색 결과 noindex 정책. 공개 전 자체 주소 설정 필요 |
| [src/lib/utils.ts](../src/lib/utils.ts) | 조건부 CSS 클래스 결합 유틸리티 |

## 화면 컴포넌트

| 파일 | 역할 |
|---|---|
| [src/components/search-box.tsx](../src/components/search-box.tsx) | 검색 질문 입력과 제출 UI |
| [src/components/filters.tsx](../src/components/filters.tsx) | 검색 공급자·기간 선택과 공급자별 결과 상태 표시 |
| [src/components/results.tsx](../src/components/results.tsx) | 링크·발췌·출처·관련성·게시일과 결과 묶음 표시 |
| [src/components/working.tsx](../src/components/working.tsx) | 진행·근거 평가·오류 상태와 관련 동작 표시 |
| [src/components/home-demos.tsx](../src/components/home-demos.tsx) | 홈의 검색 공급자 안내 행. 파일명과 달리 현재 주요 내보내기는 `EngineStrip` |
| [src/components/source-icon.tsx](../src/components/source-icon.tsx) | Tavily·네이버·GitHub 출처 아이콘과 색상 |
| [src/components/logo.tsx](../src/components/logo.tsx) | 로고 표시 컴포넌트 |
| [src/components/wordmark.tsx](../src/components/wordmark.tsx) | 프로젝트 이름의 크기별 워드마크 표시 |
| [src/components/repository-link.tsx](../src/components/repository-link.tsx) | 현재 GitHub 저장소로 이동하는 링크 |
| [src/components/theme-toggle.tsx](../src/components/theme-toggle.tsx) | 밝은/어두운 테마 전환과 초기 화면·브라우저 색상 동기화 |
| [src/components/pwa-register.tsx](../src/components/pwa-register.tsx) | 프로덕션에서 서비스 워커 등록 |
| [src/components/ui/button.tsx](../src/components/ui/button.tsx) | 공통 버튼과 스타일 변형 |
| [src/components/ui/badge.tsx](../src/components/ui/badge.tsx) | 상태·범주 표시용 공통 배지 |
| [src/components/ui/input.tsx](../src/components/ui/input.tsx) | 공통 입력 요소 |

## 공개 정적 파일과 PWA

| 파일 | 역할 |
|---|---|
| [public/manifest.webmanifest](../public/manifest.webmanifest) | 설치형 웹 앱 이름·시작 주소·아이콘·화면 설정 |
| [public/sw.js](../public/sw.js) | 네트워크 장애 시 오프라인 안내 제공. 검색 API·검색 결과는 캐시하지 않음 |
| [public/offline.html](../public/offline.html) | 오프라인 상태와 네트워크 필요성을 알리는 정적 페이지 |
| [public/robots.txt](../public/robots.txt) | 검색 크롤러와 사이트맵 위치 안내. 공개 전 도메인 교체 필요 |
| [public/sitemap.xml](../public/sitemap.xml) | 홈 페이지 사이트맵. 사용자 검색어 페이지 목록이 아님 |
| [public/og-home.png](../public/og-home.png) | 홈 공유 미리보기 이미지. 원본 자산이며 별도 브랜드 검토 필요 |
| [public/favicon.png](../public/favicon.png) | 브라우저 탭 아이콘 |
| [public/apple-touch-icon.png](../public/apple-touch-icon.png) | Apple 홈 화면 아이콘 |
| [public/icon-192.png](../public/icon-192.png) | PWA 192px 아이콘 |
| [public/icon-512.png](../public/icon-512.png) | PWA 512px 아이콘 |
| [public/icon-maskable-512.png](../public/icon-maskable-512.png) | 다양한 마스크 형태를 위한 PWA 아이콘 |

아이콘은 원본에서 이어받은 자산입니다. MIT 코드 라이선스와 브랜드 사용 권리는 별개입니다. 파일 설명을 바꾸려고 PNG나 Git bundle을 다시 인코딩하지 않습니다.

## 시험 파일

아래 시험은 제공자 응답을 모의 처리합니다. 실제 한국어 모델 정확도·API 인증·응답 속도를 입증하는 자료가 아닙니다.

| 파일 | 검증 대상 |
|---|---|
| [test/api.test.ts](../test/api.test.ts) | API 접근 인증·요청/응답 계약·오류 경계 |
| [test/cache.test.ts](../test/cache.test.ts) | 캐시 적중·키 구분·실패 시 검색 지속 |
| [test/candidates.test.ts](../test/candidates.test.ts) | 검색어 후보 생성과 한국어 원문·조건 보존 |
| [test/filters.test.ts](../test/filters.test.ts) | 공급자 결과 수와 필터 상태 표시 |
| [test/freshness.test.ts](../test/freshness.test.ts) | 게시일·날짜 정밀도·기간·최신성 처리와 원본 유틸리티 회귀 |
| [test/judge-config.test.ts](../test/judge-config.test.ts) | Jev 제공자 설정과 활성 순서 |
| [test/merge.test.ts](../test/merge.test.ts) | 중복 결과 병합 시 출처·점수·날짜 유지 |
| [test/pipeline.test.ts](../test/pipeline.test.ts) | 한국어 병렬 수집·일괄 평가·부분 실패·취소 흐름 |
| [test/pwa.test.ts](../test/pwa.test.ts) | 설치 매니페스트와 서비스 워커의 캐시 경계 |
| [test/rank.test.ts](../test/rank.test.ts) | URL 비교·제목 묶음·결과 순위 |
| [test/results.test.ts](../test/results.test.ts) | 결과 게시일 표시 |
| [test/search-timeout.test.ts](../test/search-timeout.test.ts) | 검색 공급자의 요청·정규화·인증 오류·시간 제한·취소 계약 |
| [test/seo.test.ts](../test/seo.test.ts) | 홈 크롤링과 검색 결과 페이지 noindex 정책 |
| [test/stable-order.test.ts](../test/stable-order.test.ts) | 스트리밍 결과의 안정적 배치와 묶음 순서 |
| [test/theme.test.ts](../test/theme.test.ts) | 첫 화면과 사용자 조작 후 테마 색상 일치 |
| [test/typesafe.test.ts](../test/typesafe.test.ts) | TypeSafe·호환 제공자 응답과 제공자 전환 계약 |

## 갱신 방법

파일을 추가·이름 변경·삭제하거나 책임을 바꾸면 이 표도 수정합니다. 추적 목록은 `git ls-files`로 확인합니다. `node_modules`, 비밀값, 생성 라우트·빌드 산출물은 저장소 추적 파일 안내에 포함하지 않습니다. 자동 생성 타입과 잠금 파일은 역할만 설명하고 전용 생성 절차로 갱신합니다.
