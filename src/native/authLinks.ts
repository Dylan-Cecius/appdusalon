import { createNativeAuthCallbackHandler, parseNativeAuthCallback } from './authCallback';

export interface NativeLinkSource {
  addListener(event: 'appUrlOpen', listener: (event: { url: string }) => void): Promise<{ remove(): Promise<void> }>;
  getLaunchUrl(): Promise<{ url: string } | undefined>;
}

export function installNativeAuthLinks(options: Parameters<typeof createNativeAuthCallbackHandler>[0] & {
  app: NativeLinkSource;
}) {
  let disposed = false;
  let receivedLiveLink = false;
  let listener: { remove(): Promise<void> } | undefined;
  const handler = createNativeAuthCallbackHandler(options);
  const remove = (handle: { remove(): Promise<void> }) => { void handle.remove().catch(() => {}); };
  const ready = Promise.resolve().then(async () => {
    if (disposed) return;
    try {
      const handle = await options.app.addListener('appUrlOpen', ({ url }) => {
        if (disposed || !parseNativeAuthCallback(url, options.redirect)) return;
        receivedLiveLink = true;
        void handler.handle(url);
      });
      if (disposed) { remove(handle); return; }
      listener = handle;
      if (receivedLiveLink) return;
      const launch = await options.app.getLaunchUrl();
      // A recently delivered callback must win over an older cold-start URL.
      if (!disposed && !receivedLiveLink && launch) await handler.handle(launch.url);
    } catch { if (!disposed) options.failed(); }
  });
  return {
    ready,
    dispose() {
      if (disposed) return;
      disposed = true;
      handler.dispose();
      if (listener) remove(listener);
    },
  };
}
