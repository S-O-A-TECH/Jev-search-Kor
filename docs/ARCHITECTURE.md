# 구조와 통합

## 구현 경계

TypeScript / React / TanStack Start / Cloudflare Workers 기반의 독립 검색 엔진입니다. Python 스마트 스피커로 자동 배포하지 않습니다.

| 파일 | 책임 |
|---|---|
| src/lib/candidates.ts | 한국어 원문 보존과 최소 축약 후보 |
| src/lib/typesafe.ts | HTTP System One 계약, 한국어 의도·관련성·근거 판정 |
| src/lib/search-providers.ts | Tavily POST / 네이버 GET, 키·기한·정규화 |
| src/lib/pipeline.ts | 병렬 검색, 부분 실패, 출처·중복 병합, 단일 근거 배치 |
| src/lib/rank.ts | 정렬과 URL 비교. 경로 대소문자를 보존 |
| src/routes/api/ask.ts | 같은 출처/서버 인증·요청 검증·JSON/NDJSON |
| src/server/env.server.ts | 서버 환경의 인증 정보. 클라이언트 노출 금지 |

## 호출 예산

정상 한 검색은 Jev 2회(의도 1 + 합친 근거 평가 1), Tavily 1회, 네이버 1회입니다. 빈 검색은 두 번째 Jev 호출을 생략합니다. 기본 캐시는 꺼져 있습니다. 후보는 공급자당 최대 8개, 발췌는 1,200자, 제목 300자입니다. 한국어 후보에 원문을 반드시 포함합니다.

기한은 공급자 4초, Jev 각 3초, 전체 15초입니다. 네트워크 속도를 보증하는 값이 아닙니다. 느린 공급자를 기다리는 상한 때문에 가장 빠른 공급자보다 결과 확정이 늦을 수 있습니다. 실제 p50/p95와 정확도를 측정한 후 조정해야 합니다.

네이버 webkr는 기간 필터와 게시일을 보장하지 않습니다. 최신성 요청에서도 날짜 불명 결과를 그대로 표시하고 Jev가 근거 부족 여부를 평가합니다. 단순 날짜 언급을 게시일로 파싱하지 않습니다.

## RAG·DeepSeek 연결은 별도

앞단 RAG/웹 의미 분기와 이 엔진의 검색어·기간 분석은 서로 다릅니다. 준비 콘텐츠 요구는 기존 RAG로 보내고 공개 정보 질문만 이 엔진에 전달합니다. 이미 판단한 의도를 재사용하려면 앞단/검색 엔진 간 검증된 계약을 추가해야 합니다. 현재 `POST /api/ask`는 standalone 계약이므로 의도 판단을 항상 수행합니다.

향후 Python 클라이언트는 Accept: application/json과 서버 전용 Bearer 토큰을 사용하고 요청 취소·turn ID 검사를 소유해야 합니다. 반환 근거를 DeepSeek에 전달할 때 URL 출처 ID, 발췌, sufficient/partial/none/conflicting/unknown 상태와 공급자 오류를 유지해야 합니다. 충분성 판단은 발췌문 기준이며 자동 사실 검증이 아닙니다.

## 개인정보와 공급자 약관

실제 가족 원문·원음·퀴즈 정답·신원은 검색 payload가 아닙니다. 기본 앱은 검색 기록·결과를 저장하지 않으며 캐시를 켜려면 공개 질의 범위와 제공자 보관 약관을 먼저 정해야 합니다. 키나 원문을 로그에 출력하지 않습니다.
