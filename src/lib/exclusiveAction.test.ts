import { describe, expect, it, vi } from 'vitest';
import { runExclusiveAction } from './exclusiveAction';

describe('exclusive appointment mutation', () => {
  it('waits for confirmation and blocks concurrent actions before a UI rerender', async () => {
    const lock = { current: false };
    let confirm!: () => void;
    const response = new Promise<void>(resolve => { confirm = resolve; });
    const close = vi.fn();
    const duplicate = vi.fn();
    const first = runExclusiveAction(lock, async () => { await response; close(); });
    expect(lock.current).toBe(true);
    expect(close).not.toHaveBeenCalled();
    expect(await runExclusiveAction(lock, duplicate)).toBe(false);
    expect(duplicate).not.toHaveBeenCalled();
    confirm();
    expect(await first).toBe(true);
    expect(close).toHaveBeenCalledOnce();
    expect(lock.current).toBe(false);
  });

  it('preserves the open form on failure and permits a later retry', async () => {
    const lock = { current: false };
    const close = vi.fn();
    const failed = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(runExclusiveAction(lock, async () => { await failed(); close(); })).rejects.toThrow('offline');
    expect(close).not.toHaveBeenCalled();
    expect(lock.current).toBe(false);
    expect(await runExclusiveAction(lock, async () => { close(); })).toBe(true);
    expect(close).toHaveBeenCalledOnce();
  });
});
