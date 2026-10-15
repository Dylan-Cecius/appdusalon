import { runExclusiveAction } from './exclusiveAction';

/** Keep failures visible and retryable; never claim logout by redirecting on error. */
export function createSignOutAction({ request, complete, failed }: {
  request: () => Promise<{ error: unknown }>;
  complete: () => void;
  failed: () => void;
}): () => Promise<void> {
  const lock = { current: false };
  return async () => {
    await runExclusiveAction(lock, async () => {
      try {
        const { error } = await request();
        if (error) { failed(); return; }
      } catch {
        failed(); return;
      }
      complete();
    });
  };
}
