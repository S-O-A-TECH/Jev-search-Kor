# Jev Search Kor

한국어 질문을 **Tavily + 네이버 웹문서 API**로 병렬 검색하고, 합쳐진 근거를 **TypeSafe Jev**로 평가하는 검색 엔진입니다.

[superagents-lab/jev-search](https://github.com/superagents-lab/jev-search)의 MIT 파생 프로젝트입니다. 원본 Git 이력과 LICENSE를 보존하며, TypeSafe·Tavily·네이버의 공식 제품은 아닙니다. **Search1API 계정이나 Google 검색 API는 필요하지 않습니다.**

## 동작

```text
한국어 검색 질문
  → Jev: 검색어 후보·요구 기간 판단
  → Tavily(basic, 한국어·한국 우선) ─┐
    네이버(webkr) ─────────────────┴─ 병렬
  → 안전한 URL·일반 텍스트 정규화 / 확인된 게시일 필터
  → URL 중복 제거·검색 공급자 출처 병합 (최대 16개)
  → Jev 한 번: 문서별 관련성 + 전체 근거의 충분성·상충 평가
  → 링크·발췌·관련성·근거 상태·실패 상태 반환
```

- 기본은 두 공급자 모두 검색합니다. Jev가 둘 중 하나를 임의로 제외하지 않습니다.
- 검색 전 Google 선행 호출, Search1API 호출, 자동 유료 고급 검색 전환이 없습니다.
- Tavily는 `language=ko`, `country=south korea`로 우선순위를 주되 해외 원문을 강제 차단하지 않습니다.
- 한국어 고유명사·단답·부정·연도·비교 조건을 원문 후보에 보존합니다. 영어 번역을 거치지 않습니다.
- 네이버 제목·발췌의 HTML 강조를 제거합니다. `lastBuildDate`는 문서 게시일이 아닙니다.
- 한 검색 공급자 실패는 다른 공급자 결과를 없애지 않습니다. 정상 0건·실패·Jev 평가 미완료를 구분합니다.
- 공급자 기한 기본 4초, Jev 각 단계 3초, 전체 상한 15초입니다. 이는 **성능 실측치가 아닌 설정**입니다.
- Jev가 문장을 생성하지 않습니다. 이 저장소는 **검색·평가 엔진**이며 DeepSeek 답변·RAG 라우터·STT·TTS·Pi 런타임은 포함하지 않습니다.

## 로컬 실행

Node.js 22.12 이상, pnpm 10.8.0을 사용합니다.

```bash
git clone https://github.com/S-O-A-TECH/Jev-search-Kor.git
cd Jev-search-Kor
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
# .dev.vars에 본인 키를 안전하게 등록
pnpm generate-routes
pnpm cf-typegen
pnpm dev
```

브라우저에서 `http://localhost:3030`을 엽니다. 키를 채팅, 이슈, README, 브라우저 번들에 넣지 마세요.

| 서버 환경 값 | 용도 |
|---|---|
| `TAVILY_API_KEY` | Tavily 검색 |
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | 네이버 개발자센터에서 검색 API를 허용한 앱 |
| `TYPESAFE_API_KEY` | Jev 판단 |
| `JEV_PROVIDERS=typesafe` | 기본 Jev 제공자. 다른 제공자는 기본 비활성 |
| `SEARCH_API_TOKEN` | 원격 서버 간 호출 인증. 외부 브라우저에 직접 공개 금지 |

두 검색 공급자 모두 설정하는 것이 기본 구성입니다. 하나만 설정하면 미설정 공급자는 `NOT_CONFIGURED`로 표시되고 나머지만 검색합니다. Jev 인증이 없으면 요청을 시작하지 않습니다. 테스트는 실제 키 없이 실행합니다.

## API

`POST /api/ask` 요청:

```json
{"q":"코알라는 무엇을 먹어?","w":"any","s":["tavily","naver"]}
```

`w`와 `s`는 생략 가능합니다. 기간은 `any | 24h | 7d | 30d`입니다.

- 기본 응답: NDJSON `intent → found → lane → done`. 오류는 `error`.
- `Accept: application/json`: 전체 결과 JSON. `items`, `lanes`, `errors`, `evidence`, `totalMs`, `tokens`를 포함합니다.
- `evidence.status`: `sufficient | partial | none | conflicting | unknown`. `confidence`는 분포 확신도이며 사실 정확도가 아닙니다.
- `items[].ranked=false`는 미평가이며 오답/무관함을 뜻하지 않습니다.
- `errors`는 공급자별 코드이며 검색 원문이나 외부 오류 본문을 기록하지 않습니다.
- 로컬 브라우저: 같은 출처만 허용. 원격: `Authorization: Bearer <SEARCH_API_TOKEN>` 필요.
- 토큰 없이 공용 검색 서비스를 열지 않습니다. 원격 UI는 인증된 서버 게이트웨이가 토큰을 주입해야 합니다. 이 저장소에는 로그인 UI/게이트웨이 구현이 없습니다.

## 스마트 스피커와 연결할 때

스피커의 기존 한국어 인식과 명시적 콘텐츠 라우터가 **공개 정보 질문**으로 확정한 요청만 전달합니다. 퀴즈 정답·중지·호칭·가족 기억·원음을 이 검색기로 보내면 안 됩니다.

반환된 출처와 발췌, 근거 상태를 DeepSeek에 전달해 한국어 답변을 생성하고 로컬 TTS로 읽는 것은 **다음 통합 단계**입니다. 이 검색기의 첫 Jev 단계는 검색어·기간 선택이며, 스피커 앞단의 RAG/웹 분기와 별개입니다. 중복 호출을 없애려면 앞단의 검증된 검색 의도를 넘기는 계약을 먼저 정해야 합니다. 현재 스피커 성능 향상이나 배포 완료로 표시하지 않습니다.

## 확인

```bash
pnpm generate-routes
pnpm cf-typegen
pnpm test
pnpm build
pnpm exec wrangler deploy --dry-run
```

검증 범위와 한계는 [검증 기록](docs/VERIFICATION.md), 구조는 [구조와 통합](docs/ARCHITECTURE.md)을 참고하세요. 모의 시험은 API 실측이나 한국어 검색 품질 평가를 대신하지 않습니다.

## 비용·보안·배포

Search1API 비용 의존성은 제거했지만 **Tavily·Jev 비용까지 사라지는 것은 아닙니다.** 각 제공자의 무료 한도·사용량·예산을 직접 확인하세요. 자동 재검색·결제·크레딧 증액은 하지 않습니다.

실제 키·검색 기록·원음은 저장소에 넣지 않습니다. 기본 설정에는 검색 KV 캐시, 원저자의 도메인·KV ID·AI binding·분석 추적기가 없습니다. Worker 로그 수집도 기본 비활성입니다. 브라우저 주소/방문 기록에는 검색어가 남을 수 있으며 제공자 보관 정책은 각 서비스의 정책을 따릅니다.

`workers_dev=false`, `preview_urls=false`이므로 무심코 공용 서비스를 공개하지 않습니다. GitHub 업로드는 서비스 배포가 아닙니다. 호스팅할 때 자체 도메인, 서버 간 인증 또는 별도 게이트웨이, 키 제한·요금 상한, 접근 로그 보호, 자체 SEO 주소와 브랜드 자산을 설정하세요. [보안 안내](SECURITY.md).

## 공식 참조와 출처

- [Tavily 검색 계약](https://docs.tavily.com/documentation/api-reference/endpoint/search)
- [네이버 웹문서 검색](https://developers.naver.com/docs/serviceapi/search/web/web.md)
- [TypeSafe HTTP API](https://docs.typesafe.ai/api), [Noul](https://docs.typesafe.ai/primitives/noul), [Choice](https://docs.typesafe.ai/primitives/choice)
- 원본 기준 커밋: `8b34965084be05bc2be8dffeb9c2d2887d7e9a54`.
- [출처·원본 Git 이력 복원](docs/PROVENANCE.md): 독립 저장소로 게시하며 원본 이력 bundle을 함께 보존합니다.
- MIT 저작권 표시 유지. 기존 PNG/PWA 아이콘은 원본의 TypeSafe 웹사이트 유래 자산을 유지합니다. 소프트웨어 라이선스가 브랜드 권리 허용을 의미하지 않습니다.
