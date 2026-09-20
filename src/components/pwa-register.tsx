import { useEffect } from 'react';

/** Register in production only: a local worker would pin stale modules over Vite's HMR. */
export function PwaRegister() {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (!('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
  }, []);
  return null;
}
