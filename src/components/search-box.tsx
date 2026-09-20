import { useNavigate } from '@tanstack/react-router';
import { SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function SearchBox({
  initial = '',
  compact = false,
  autoFocus = false,
}: {
  initial?: string;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const navigate = useNavigate();

  return (
    <form
      className="vt-searchbox relative"
      onSubmit={(event) => {
        event.preventDefault();
        const q = value.trim();
        if (!q) return;
        // A new request resets explicit filters so the judge decides again.
        navigate({ to: '/search', search: { q }, viewTransition: true });
      }}
      role="search"
    >
      <SearchIcon
        aria-hidden
        className={cn(
          'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground',
          compact ? 'size-4' : 'size-5'
        )}
      />
      <Input
        aria-label="검색"
        autoComplete="off"
        autoFocus={autoFocus}
        className={cn(
          'rounded-full pl-11 pr-4 shadow-sm focus-visible:shadow-md',
          compact ? 'h-10' : 'h-12 text-base'
        )}
        maxLength={300}
        name="q"
        onChange={(event) => setValue(event.target.value)}
        placeholder="한국어로 궁금한 것을 물어보세요"
        value={value}
      />
    </form>
  );
}
