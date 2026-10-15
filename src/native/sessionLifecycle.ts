export interface NativeActivitySource {
  addListener(event: 'appStateChange', listener: (state: { isActive: boolean }) => void): Promise<{ remove(): Promise<void> }>;
  getState(): Promise<{ isActive: boolean }>;
}

/** Exactly one owner after SDK initialization; all start/stop calls are ordered. */
export function installNativeSessionLifecycle(options: {
  app: NativeActivitySource;
  auth: { initialize(): Promise<void>; startAutoRefresh(): Promise<void>; stopAutoRefresh(): Promise<void> };
  failed(): void;
}) {
  let disposed = false, ownsRefresh = false, canRefresh = false;
  let desired: boolean | undefined, applied: boolean | undefined;
  let listener: { remove(): Promise<void> } | undefined;
  let queue = Promise.resolve();
  const report = () => { if (!disposed) options.failed(); };
  const remove = (handle: { remove(): Promise<void> }) => { void handle.remove().catch(() => {}); };
  const drain = () => {
    queue = queue.then(async () => {
      while (!disposed && ownsRefresh && desired !== undefined && applied !== desired) {
        const target = desired;
        await (target ? options.auth.startAutoRefresh() : options.auth.stopAutoRefresh());
        applied = target;
      }
    }).catch(() => { applied = undefined; report(); });
    return queue;
  };
  const ready = Promise.resolve().then(async () => {
    if (disposed) return;
    try {
      const handle = await options.app.addListener('appStateChange', ({ isActive }) => {
        if (disposed) return;
        desired = isActive;
        if (canRefresh) void drain();
      });
      if (disposed) { remove(handle); return; }
      listener = handle;
      await options.auth.initialize();
      if (disposed) return;
      ownsRefresh = true;
      // Public stop removes the SDK's browser visibility listener.
      queue = queue.then(async () => { await options.auth.stopAutoRefresh(); applied = false; });
      try { await queue; }
      catch { ownsRefresh = false; queue = Promise.resolve(); report(); return; }
      if (disposed) return;
      canRefresh = true;
      if (desired === undefined) {
        const initial = await options.app.getState();
        if (disposed) return;
        if (desired === undefined) desired = initial.isActive;
      }
      await drain();
    } catch { report(); }
  });
  return {
    ready,
    settled: () => queue,
    dispose() {
      if (disposed) return queue;
      disposed = true;
      if (listener) remove(listener);
      if (ownsRefresh) queue = queue.catch(() => {}).then(() => options.auth.stopAutoRefresh()).catch(() => {});
      return queue;
    },
  };
}
