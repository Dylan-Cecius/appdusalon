import { describe, expect, it, vi } from 'vitest';
import { createSignOutAction } from './signOutAction';

describe('explicit sign out', () => {
  it('completes only after the server operation succeeds', async () => {
    const complete = vi.fn(), failed = vi.fn();
    const action = createSignOutAction({ request: async () => ({ error: null }), complete, failed });
    await action(); expect(complete).toHaveBeenCalledTimes(1); expect(failed).not.toHaveBeenCalled();
  });
  it('does not redirect after a reported failure and permits a retry', async () => {
    const complete = vi.fn(), failed = vi.fn();
    const request = vi.fn().mockResolvedValueOnce({ error: new Error('fixture') }).mockResolvedValueOnce({ error: null });
    const action = createSignOutAction({ request, complete, failed });
    await action(); expect(complete).not.toHaveBeenCalled(); expect(failed).toHaveBeenCalledTimes(1);
    await action(); expect(complete).toHaveBeenCalledTimes(1);
  });
  it('handles a network rejection without forwarding sensitive error text', async () => {
    const complete = vi.fn(), failed = vi.fn();
    const action = createSignOutAction({ request: async () => { throw new Error('sensitive fixture'); }, complete, failed });
    await expect(action()).resolves.toBeUndefined();
    expect(complete).not.toHaveBeenCalled(); expect(failed).toHaveBeenCalledWith();
  });
  it('prevents duplicate taps from sending concurrent requests', async () => {
    let finish!: (result: { error: null }) => void;
    const request = vi.fn(() => new Promise<{ error: null }>(resolve => { finish = resolve; }));
    const complete = vi.fn(); const action = createSignOutAction({ request, complete, failed: vi.fn() });
    const pending = action(); await action(); expect(request).toHaveBeenCalledTimes(1);
    expect(complete).not.toHaveBeenCalled(); finish({ error: null }); await pending;
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
