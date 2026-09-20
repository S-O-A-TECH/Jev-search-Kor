import { cn } from '@/lib/utils';

/** TypeSafe's official icon, also used as the site's favicon. */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      alt=""
      aria-hidden
      className={cn('shrink-0 object-contain', className)}
      height={400}
      src="/favicon.png"
      width={400}
    />
  );
}
