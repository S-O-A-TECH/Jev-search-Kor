import { SourceIcon } from '@/components/source-icon';

export function RepositoryLink() {
  return (
    <a
      aria-label="GitHub에서 Jev Search Kor 소스 보기 (새 탭)"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
      href="https://github.com/S-O-A-TECH/Jev-search-Kor"
      rel="noreferrer"
      target="_blank"
      title="Jev Search Kor 소스"
    >
      <SourceIcon id="github" className="size-5" />
    </a>
  );
}
