# Jev Search Kor — 한국형 Jev 웹 검색엔진

**한국어 질문, 한국의 검색 환경, 반복 가능한 개발 테스트를 위해 다시 설계한 Jev Web Search.**

Tavily의 웹 검색과 네이버의 국내 검색 결과를 병렬로 모으고, TypeSafe Jev가 관련성과 답변 근거의 충분성을 평가합니다. 단순히 화면을 번역한 버전이 아니라, 검색 공급자·한국어 판단 기준·결과 병합·실패 처리를 한국어 서비스 개발에 맞춘 독립 파생 프로젝트입니다.

**Search1API 계정도, Google 검색 API 키도 필요하지 않습니다.** 일회성 체험 크레딧만으로 끝나는 실험 대신, 검색 API의 반복 제공 무료 한도 안에서 엔터프라이즈 도입 전에도 꾸준히 검증할 수 있는 구성을 지향합니다. 단, 검색 무료 한도와 Jev 모델 비용은 별개이며 **전체 시스템의 무제한·영구 무료를 뜻하지 않습니다.**

[시작하기](#로컬에서-시작하기) · [무료 테스트와 비용](#무료-테스트와-비용의-정확한-범위) · [모든 파일 설명](docs/FILE_GUIDE.md) · [구조](docs/ARCHITECTURE.md) · [검증 기록](docs/VERIFICATION.md)

## 왜 한국형 Jev 검색엔진인가?

한국어 AI 서비스를 만들 때는 질문의 의도를 보존하고, 국내 검색 결과를 확보하며, 같은 질문 묶음을 여러 번 검증할 수 있어야 합니다. 이 프로젝트는 그 세 가지를 중심에 둡니다.

| 설계 초점 | 현재 구현 |
|---|---|
| 한국어 질문 보존 | 원문을 검색어 후보에 포함하고 고유명사·부정·연도·비교 조건을 보존. 영어 번역을 선행하지 않음 |
| 한국 검색 환경에 맞는 수집 | Tavily와 네이버 웹문서 검색을 기본 병렬 실행. Tavily에는 한국어·한국 우선 설정을 전달 |
| 근거의 활용 가능성 판단 | Jev가 문서별 관련성과 합쳐진 근거의 충분성·상충을 같은 배치에서 평가 |
| 출처가 남는 결과 | URL 중복을 제거하면서 검색 공급자 출처를 병합하고 링크·발췌·판정 상태를 반환 |
| 반복 검증 비용 관리 | Tavily basic 사용, 자동 고급 검색·자동 재검색 없음, 실제 키 없이 실행하는 모의 시험 제공 |
| 실패를 구분하는 처리 | 정상 0건, 공급자 장애, 미설정, Jev 미평가, 시간 초과를 구분 |

‘한국 특화’는 **검색 구성과 한국어 판단 지시·UI의 설계 방향**입니다. Jev 자체를 한국어로 재학습한 모델이 아니며, 다른 검색엔진보다 정확하거나 빠르다는 비교 실험 결과를 뜻하지 않습니다. 현재 네이버 연동은 웹문서(`webkr`)만 사용하고, 뉴스·블로그·카페 전용 API는 사용하지 않습니다.

## 원본과 무엇이 다른가?

[원본 jev-search](https://github.com/superagents-lab/jev-search)는 Search1API를 통해 여러 검색엔진의 결과를 가져옵니다. 원본에서 Google 결과를 사용한다고 해서 Google API 키까지 별도로 요구하는 것은 아닙니다. 이 프로젝트는 **Search1API 의존성을 제거하고 Tavily·네이버 직접 연동으로 바꿨습니다.**

별도 대안인 Google Custom Search JSON API에도 의존하지 않습니다. 공식 안내상 신규 고객 신청은 종료됐고, 기존 고객의 전환 기한은 2027년 1월 1일입니다. [Google 공식 안내](https://developers.google.com/custom-search/v1/overview)

목표는 모든 공급자를 나열하는 범용 데모가 아니라, **한국어 서비스에서 근거를 수집하고 평가하는 데 집중한 재사용 가능한 검색 계층**입니다.

## 검색 흐름

```text
한국어 질문
  │
  ├─ Jev ①: 코드가 준비한 검색어 후보와 검색 기간 선택
  │
  ├─ Tavily basic ─────────┐
  └─ 네이버 웹문서 검색 ──┴─ 병렬 수집
                          │
                 URL·텍스트·게시일 정규화
                 중복 제거 + 검색 공급자 출처 병합
                          │
           Jev ②: 문서별 관련성 + 전체 근거 충분성·상충
                          │
                 링크·발췌·평가·오류 상태 반환
```

검색은 API가 실행하고, Jev는 구조화된 판단을 반환합니다. Jev가 검색 사이트를 직접 방문하거나 자유 문장 답변을 생성하는 구조가 아닙니다. 문서별 관련성은 `Noul`, 근거 상태는 `Choice`로 평가합니다. 같은 자료를 대상으로 하는 판단을 묶어 개별 호출을 줄입니다.

기본 정상 경로는 Tavily 1회 + 네이버 1회 + Jev 2회입니다. 검색 결과가 비면 두 번째 Jev 평가를 생략합니다. 공급자당 최대 8개, 합계 최대 16개 후보를 다룹니다. 한 검색 공급자가 실패해도 다른 공급자의 결과를 버리지 않습니다.

공급자 제한 4초, Jev 각 단계 3초, 전체 제한 15초는 **현재 코드의 시간 예산**이지 실측 응답 속도나 SLA가 아닙니다. 병렬 수집은 검색 두 건의 순차 대기를 줄이지만 네트워크·제공자 지연까지 제거하지는 않습니다.

## 무료 테스트와 비용의 정확한 범위

2026-09-20 공식 문서 확인 기준입니다. 정책 변경과 계정별 조건은 각 제공자 콘솔에서 다시 확인하세요.

| 서비스 | 공식 안내와 이 프로젝트에서의 의미 |
|---|---|
| Search1API — 사용하지 않음 | 시작용 무료 100크레딧, 이후 충전·구독 방식. 반복 검증에서 이 비용 의존성을 없애려는 것이 파생 목적 중 하나입니다. [요금 안내](https://s1.dev/pricing) |
| Google Custom Search — 사용하지 않음 | 기존 고객 기준 일 100회 무료였으나 신규 고객은 신청할 수 없습니다. 별도 Google 검색 API 키 설정이 필요 없습니다. [공식 안내](https://developers.google.com/custom-search/v1/overview) |
| Tavily — 사용 | 매월 무료 1,000크레딧. 현재 basic 검색은 호출당 1크레딧입니다. 다른 앱과 공유하지 않고 이 경로만 사용한다면 월 약 1,000건의 Tavily 검색에 해당합니다. [공식 크레딧 정책](https://docs.tavily.com/documentation/api-credits) |
| 네이버 — 사용 | 기존 개발자센터 검색 API는 기본 무료 정책과 일 25,000회 한도를 안내합니다. 신규 가입은 API Hub로 바뀌었으며 향후 유료 정책 적용이 예고돼 있습니다. [호출 한도](https://developers.naver.com/products/intro/plan/plan.md), [이관·요금 정책](https://developers.naver.com/notice/article/32530) |
| TypeSafe Jev — 사용 | 토큰 기반 유료 API입니다. 현재 Jev 1.13 안내는 입력 100만 토큰당 $0.042이며 출력은 무료입니다. 체험 크레딧을 매월 갱신되는 무료 한도로 간주하면 안 됩니다. [모델·요금](https://docs.typesafe.ai/models) |

따라서 **검색 수집을 무료 한도 안에서 월 단위로 계속 시험할 수 있도록 구성했다**는 것이 정확한 설명입니다. 엔터프라이즈 전환 전이라도 한도 초과, Jev 사용, 호스팅 및 별도 답변 LLM에는 비용이 생길 수 있습니다. Tavily의 월 한도와 네이버의 일 한도를 합산하지 마세요. 기본 경로는 둘 다 호출하므로 더 작은 잔여 예산의 영향을 받습니다.

반복 가능한 개발 방법:

1. 일상적인 코드 검증은 실제 API를 호출하지 않는 `pnpm test`로 수행합니다.
2. 실제 품질 검증은 공개 한국어 질문 묶음으로 제한하고 제공자별 사용량을 확인합니다.
3. 한도를 다 쓰면 실시간 시험을 멈추거나 명시적으로 예산을 정합니다. 자동 충전·고급 검색 전환을 기대하지 마세요.

현재 기본 캐시는 꺼져 있습니다. 요청 속도 제한은 월간 지출 상한이 아니며, **계정 전체 무료 크레딧을 추적해 자동 차단하는 기능은 구현되어 있지 않습니다.**

## 로컬에서 시작하기

이 저장소는 **TypeScript / React / TanStack Start / Cloudflare Workers** 프로젝트입니다. Jev는 서버의 HTTP System One 클라이언트로 호출합니다. Python SDK 프로젝트가 아닙니다.

Node.js 22.12 이상과 pnpm 10.8.0을 준비하세요.

```bash
git clone https://github.com/S-O-A-TECH/Jev-search-Kor.git
cd Jev-search-Kor
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
# .dev.vars에 본인 키를 등록하고 저장소에는 올리지 않습니다.
pnpm generate-routes
pnpm cf-typegen
pnpm dev
```

브라우저에서 `http://localhost:3030`을 엽니다.

| 서버 환경 변수 | 용도 |
|---|---|
| `TAVILY_API_KEY` | Tavily 검색 인증 |
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | 현재 코드가 지원하는 **기존 네이버 개발자센터 검색 API** 인증 |
| `TYPESAFE_API_KEY` | TypeSafe Jev 판단 인증 |
| `JEV_PROVIDERS=typesafe` | 기본 Jev 제공자. 다른 제공자는 기본 비활성 |
| `SEARCH_API_TOKEN` | 원격 서버 간 요청의 Bearer 토큰. 브라우저에 공개하지 않음 |

### 네이버 신규 사용자: 키 종류를 먼저 확인하세요

**현재 코드는 `openapi.naver.com/v1/search/webkr.json` 및 `X-Naver-Client-Id` / `X-Naver-Client-Secret` 방식입니다. NAVER API Hub용 키와 호환되지 않습니다.**

공식 이관 일정에 따르면 2026년 7월 31일부터 신규 신청은 API Hub에서만 가능하며, 기존 개발자센터 신청분은 2027년 6월 30일까지 유예됩니다. 신규 API Hub 키만 있다면 해당 엔드포인트·인증 어댑터를 추가해야 합니다. 키 이름만 바꿔 넣으면 되는 것으로 설명하지 않습니다. [네이버 공식 이관 공지](https://developers.naver.com/notice/article/32530)

두 공급자 설정이 기본 구성이지만 하나만 설정해도 실행 가능합니다. 미설정 공급자는 `NOT_CONFIGURED`로 표시됩니다. 신규 네이버 사용자도 Tavily만으로 개발을 시작할 수 있으나, 이를 두 공급자 검증 완료로 보아서는 안 됩니다. Jev 인증이 없으면 요청을 시작하지 않습니다.

## 검색 API 사용하기

`POST /api/ask`에 다음 JSON을 보냅니다.

```json
{"q":"초성과 받침은 어떻게 달라?","w":"any","s":["tavily","naver"]}
```

- `q`: 질문. 1~300자.
- `w`: 선택적 검색 기간. `any | 24h | 7d | 30d`.
- `s`: 선택적 공급자 목록. 기본은 Tavily·네이버 모두.
- 기본 응답은 NDJSON 이벤트 `intent → found → lane → done`, 오류는 `error`입니다.
- `Accept: application/json`이면 `items`, `lanes`, `errors`, `evidence`, `totalMs`, `tokens` 등을 담은 전체 결과를 받습니다.
- 원격 서버에서는 `Authorization: Bearer <SEARCH_API_TOKEN>`으로 인증합니다.

| 반환 근거 상태 | 의미 |
|---|---|
| `sufficient` | 제공한 발췌 기준으로 답할 근거가 충분하다고 판단 |
| `partial` | 일부 근거만 있음 |
| `none` | 답변 근거가 없음 |
| `conflicting` | 근거 간 상충이 있다고 판단 |
| `unknown` | 근거 평가를 완료하지 못함 |

`confidence`는 모델 분포의 확신도이지 사실 정확도가 아닙니다. `items[].ranked=false`는 미평가이지 무관함의 확정 판정이 아닙니다. 검색 발췌와 관련성 점수만으로 사실 확인이 끝나지는 않습니다.

네이버 웹문서 결과에는 게시일·기간 필터 보장이 없습니다. `lastBuildDate`를 문서 게시일로 쓰지 않으며, 게시일 불명 자료는 그 한계를 유지합니다. 한국어 우선 설정도 해외 원문을 차단하는 규칙은 아닙니다.

## 다른 한국어 서비스에 연결하기

반환된 링크·발췌·근거 상태를 답변 LLM에 넘겨 한국어 설명을 만들거나 검색 UI에 그대로 표시할 수 있습니다. **이 저장소 자체는 답변 생성기가 아니라 검색·근거 평가 엔진**입니다.

스마트 스피커에 연결한다면 공개 정보 질문만 보내고, 준비된 퀴즈·동화의 RAG 분기, DeepSeek 답변, STT·TTS, 호출어와 세션 관리는 바깥 시스템이 맡습니다. 가족 기억·신원·원음·비공개 퀴즈 정답을 웹 검색 payload로 보내지 않습니다. 현재 이 저장소가 그 통합과 Pi 배포까지 완료했다는 뜻은 아닙니다.

## 검증과 개발

```bash
pnpm generate-routes
pnpm cf-typegen
pnpm test
pnpm build
pnpm exec wrangler deploy --dry-run
```

게시 당시 기록은 16개 파일의 136개 단위·모의 통합 시험, 타입 검사·빌드·Worker 패키지 점검 통과입니다. **이 독립 저장소에서 실제 제공자 API 인증, 한국어 검색 품질, 지연·비용 비교는 아직 검증 기록이 없습니다.** 스마트 스피커의 별도 Python 실험 결과를 이 엔진의 결과로 혼용하지 않습니다. [검증 범위와 미수행 항목](docs/VERIFICATION.md)

## 파일과 문서 찾아보기

| 먼저 볼 곳 | 설명 |
|---|---|
| [모든 파일 안내](docs/FILE_GUIDE.md) | 소스·시험·설정·이미지·이력 파일 각각의 역할 |
| [구조와 통합](docs/ARCHITECTURE.md) | 검색 흐름, 호출 예산, 외부 시스템과의 경계 |
| [검색 실행부](src/lib/pipeline.ts) | 병렬 수집·중복 병합·일괄 평가·취소 |
| [검색 공급자](src/lib/search-providers.ts) | Tavily·기존 네이버 API 요청과 결과 정규화 |
| [Jev 판단](src/lib/typesafe.ts) | 구조화된 검색 의도·관련성·근거 판단 |
| [HTTP 진입점](src/routes/api/ask.ts) | 인증·입력 검사·JSON/NDJSON 응답 |
| [기여 지침](CONTRIBUTING.md) / [보안 안내](SECURITY.md) | 변경·검증·비밀정보 취급 기준 |

GitHub 파일 목록 옆 문장은 파일 설명이 아니라 **최근 변경 커밋의 제목**입니다. 여러 파일을 한 커밋으로 올리면 같은 문구가 보입니다. 파일별 설명은 위 안내서에서 확인하고, 이후 커밋 제목은 실제 변경 목적을 구체적으로 기록합니다. 설명을 바꾸기 위해 기존 공개 Git 이력을 덮어쓰지는 않습니다.

## 데이터 보호와 서비스 공개

키는 보호된 `.dev.vars` 또는 배포 환경 secret에만 둡니다. 키·실제 검색 기록·가족 음성·전사를 GitHub에 올리지 않습니다. 검색 질문은 검색 제공자와 Jev 제공자에 전달되고, Jev는 평가할 제목·발췌도 받습니다. 각 제공자의 보관 정책은 별도입니다.

기본 설정에는 검색 KV 캐시·원저자 도메인·분석 추적기가 없고 Worker 로그 수집도 비활성입니다. 브라우저 주소와 방문 기록에는 검색어가 남을 수 있습니다. PWA의 오프라인 페이지는 검색 결과 캐시가 아니며 검색에는 네트워크가 필요합니다.

`workers_dev=false`, `preview_urls=false`이며 GitHub 게시 자체가 검색 서비스 배포는 아닙니다. 외부 공개 전 자체 도메인·브랜드 자산·SEO 주소, 서버 인증 또는 별도 인증 게이트웨이, 사용량 제한과 개인정보 처리를 설정하세요. 저장소에는 로그인 UI나 인증 게이트웨이가 포함되어 있지 않습니다.

## 출처와 라이선스

[superagents-lab/jev-search](https://github.com/superagents-lab/jev-search)의 MIT 파생 프로젝트이며 TypeSafe·Tavily·네이버의 공식 제품이 아닙니다. 원본 기준 커밋은 `8b34965084be05bc2be8dffeb9c2d2887d7e9a54`입니다.

[MIT LICENSE](LICENSE)와 원본 Git 이력 bundle을 보존합니다. GitHub fork 네트워크가 아닌 독립 저장소로 게시했으며 [출처와 이력 복원 안내](docs/PROVENANCE.md)를 제공합니다. 기존 PNG/PWA 아이콘은 원본의 TypeSafe 웹사이트 유래 자산입니다. 소프트웨어 라이선스가 상표·브랜드 권리까지 허용하는 것은 아닙니다.

추가 계약: [Tavily 검색 API](https://docs.tavily.com/documentation/api-reference/endpoint/search), [기존 네이버 웹문서 API](https://developers.naver.com/docs/serviceapi/search/web/web.md), [TypeSafe HTTP API](https://docs.typesafe.ai/api), [Noul](https://docs.typesafe.ai/primitives/noul), [Choice](https://docs.typesafe.ai/primitives/choice).
