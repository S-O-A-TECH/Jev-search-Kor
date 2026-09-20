import { SOURCES } from '@/lib/sources';
import { SourceIcon } from './source-icon';

/** The engines as a quiet labelled row; no count, the list changes. */
export function EngineStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
      <p className="text-xs text-muted-foreground">검색 공급자</p>
      <ul aria-label="검색 공급자" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        {SOURCES.map((s) => (
          <li className="inline-flex items-center" key={s.id} title={s.label}>
            <SourceIcon className="size-4" id={s.id} on />
          </li>
        ))}
      </ul>
    </div>
  );
}
