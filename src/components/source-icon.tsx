import { GlobeIcon, CodeIcon } from 'lucide-react';
import type { SourceId } from '@/lib/sources';
import { cn } from '@/lib/utils';

export function sourceColor(id: SourceId): string { return id === 'naver' ? '#03a94d' : 'currentColor'; }
export function SourceIcon({ id, on = true, className }: { id: SourceId | 'github'; on?: boolean; className?: string }) {
  const Icon = id === 'github' ? CodeIcon : GlobeIcon;
  return <Icon aria-hidden className={cn('shrink-0', className ?? 'size-3.5')}
    style={{ color: on && id !== 'github' ? sourceColor(id) : undefined, opacity: on ? 1 : 0.45 }} />;
}
