/** Synchronous lock: blocks a second action even before React renders disabled controls. */
export async function runExclusiveAction(
  lock: { current: boolean },
  action: () => Promise<void>,
): Promise<boolean> {
  if (lock.current) return false;
  lock.current = true;
  try {
    await action();
    return true;
  } finally {
    lock.current = false;
  }
}
