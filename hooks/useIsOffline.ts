// hooks/useIsOffline.ts
//
// navigator.onLine as React state, for screens that switch to their device copy
// (lib/offlineReads.ts) or show "needs internet" while there's no connection.
import { useEffect, useState } from 'react';
import { isOffline } from '@/lib/offlineSnapshot';

export function useIsOffline(): boolean {
  const [offline, setOffline] = useState(() => isOffline());
  useEffect(() => {
    const update = () => setOffline(isOffline());
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return offline;
}
