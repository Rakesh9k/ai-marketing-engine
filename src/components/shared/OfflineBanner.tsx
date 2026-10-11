'use client';

import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Persistent, non-blocking notice while the browser reports no connection, and a brief
 * "back online" confirmation afterwards. One banner for the whole app instead of a toast per
 * failed request. It reports status only: it never disables forms, so typed input is never
 * lost, and retries stay under the user's control.
 *
 * Accessibility: role="status" (polite live region, announced once per change), meaning is
 * carried by words and an icon rather than colour, and contrast comes from the inverse
 * surface/text pair, which holds in both themes.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const [showRestored, setShowRestored] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowRestored(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setShowRestored(true);
    const timer = setTimeout(() => setShowRestored(false), 4000);
    return () => clearTimeout(timer);
  }, [online]);

  const visible = !online || showRestored;

  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {visible && (
        <div className="bg-bg-inverse text-text-inverse fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium shadow-md">
          <span aria-hidden="true">{online ? '✓' : '⚠'}</span>
          {online ? (
            <span>Back online. You can continue.</span>
          ) : (
            <span>
              You’re offline. Actions that need the internet, like generating a campaign, won’t go
              through until you reconnect. What you’ve typed on this page is kept.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
