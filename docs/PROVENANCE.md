# 원본과 이력 보존

- 원본: https://github.com/superagents-lab/jev-search
- 기준 커밋: `8b34965084be05bc2be8dffeb9c2d2887d7e9a54`
- 소프트웨어: MIT, 원본 LICENSE 유지.
- 게시 대상: https://github.com/S-O-A-TECH/Jev-search-Kor
- 기존의 빈 독립 저장소에 게시하므로 GitHub의 자동 fork-network 표시는 설정하지 않습니다.
- 로컬에서는 원본 Git ancestry를 보존합니다. GitHub에는 인증된 Contents/Git Data API로 게시하며, 원본 전체 이력을 `upstream-history.bundle`로 함께 제공합니다. 공개 브랜치의 첫 커밋은 게시 초기화 커밋이므로 원본 ancestry와 같다고 표현하지 않습니다.

## 원본 이력 복원

```bash
git bundle verify docs/upstream-history.bundle
git fetch docs/upstream-history.bundle refs/remotes/upstream/main:refs/remotes/upstream/main
git log --oneline refs/remotes/upstream/main
```

bundle은 원본의 공개 Git 객체와 `refs/remotes/upstream/main`만 담습니다. 새 파생본 소스·API 키·설치 의존성·빌드·로컬 프로젝트 자료는 포함하지 않습니다. 파생본 변경은 이 저장소 소스에서 확인할 수 있습니다.
