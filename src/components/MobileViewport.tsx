import { useEffect, type PropsWithChildren } from 'react';
import { installViewportMetrics } from '@/lib/viewportMetrics';

export function MobileViewport({ children }: PropsWithChildren) {
  useEffect(() => installViewportMetrics(window, document.documentElement.style), []);
  return <>{children}</>;
}
