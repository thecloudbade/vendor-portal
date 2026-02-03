import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center justify-center gap-2 bg-amber-500/95 text-amber-950 py-2.5 text-sm font-medium'
      )}
    >
      <WifiOff className="h-4 w-4" />
      You're offline. Some features may be unavailable.
    </div>
  );
}
